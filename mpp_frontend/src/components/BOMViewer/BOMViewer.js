import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Table } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import styles from '../../constants/styles';
import authenticatedFetch from '../../utils/authenticatedFetch';
import DashboardShell from '../DashboardShell/DashboardShell';
import ContainerSelect, { accentFor, containerDisplayName, containerLabelOf }
  from '../ContainerSelect/ContainerSelect';

// Files that carry their own qty/price (one BOM line each). Mirrors the list in
// FileList.js, which decides where the qty/price context-menu options are offered.
const showQtyPriceExtensions = ['dxf', 'step', 'stp', 'stl', 'kicad_sch', 'gbr', 'gerber', 'kicad_pcb'];

// Spreadsheets contribute one BOM line per parsed row - but only if the sheet is
// actually a bill of materials. A test protocol or a spec sheet is also an .xls, and
// without this check every one of its rows would show up as a "component".
const spreadsheetExtensions = ['xls', 'xlsx', 'csv'];

/**
 * Parsed sheets, keyed by file id + revision, held at module scope on purpose.
 *
 * Parse results deliberately do NOT live in App's product state: that state is replaced
 * wholesale whenever the container's file list is refetched from the API (which knows
 * nothing about these client-side fields), which silently threw away every parse. A
 * module-level cache also survives StrictMode's mount/unmount/remount in development.
 *
 * Entry shape: { rows, bomSheet, note }.
 */
const sheetCache = new Map();

/** Cache key - includes the revision so a new upload re-parses. */
const cacheKey = (file) => `${file.id}:${file.current_revision || 1}`;

// How far down a sheet to look for the header row. Real BOM exports put a title block,
// document number, project metadata and blank rows above the actual table.
const MAX_HEADER_SCAN_ROWS = 40;

/** Collapse a header cell to a comparable form: "Unit\n(INR)" -> "unit". */
function normalizeHeader(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\s+/g, ' ')
    .replace(/\([^)]*\)/g, ' ')     // drop units/currency in brackets
    .replace(/[^a-z0-9 /]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Which BOM column, if any, a header cell represents.
 *
 *  Order matters: qty and total are checked before price so "Total" never binds as a
 *  unit price, and ref before component so "Part Number / Model" is a reference rather
 *  than the component name.
 */
function headerRole(raw) {
  const h = normalizeHeader(raw);
  if (!h) return null;
  if (/\bcategory\b|\bgroup\b|\bsection\b/.test(h)) return 'category';
  if (/\bqty\b|\bquantity\b|\bqnty\b|\bpcs\b/.test(h)) return 'qty';
  if (/\btotal\b|\bextended\b|\bamount\b/.test(h)) return 'total';
  if (/\bunit\b|\bprice\b|\bcost\b|\brate\b|\bmrp\b/.test(h)) return 'price';
  if (/part number|part no|\bmpn\b|designator|\brefdes\b|\bref\b|\breference\b|\bmodel\b|\bsku\b/.test(h)) return 'ref';
  if (/description|component|\bitem\b|\bpart\b|\bname\b|material/.test(h)) return 'component';
  return null;
}

/**
 * Map a BOM sheet's own Category value onto our three bins.
 *
 * Real BOMs categorise by function (MCU, Display, Power, Wiring, Mechanical,
 * Consumables...), which is finer-grained than electronics/mechanical/misc. Reading it
 * per row is what puts screws and sheet metal under Mechanical while the boards and
 * display stay under Electronics - binning the whole sheet as one category cannot.
 *
 * Returns null when the value is unrecognised, so the caller can fall back to the
 * file-level category.
 */
function mapSheetCategory(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  // Mechanical first: "Mechanical" covers fasteners/adhesives/structural parts, and
  // those words shouldn't be out-voted by an electronics term elsewhere in the cell.
  if (/mechanic|enclosure|fasten|hardware|structur|chassis|case|housing|adhesive|screw|bracket|standoff|gasket|sheet|filament|print/.test(t)) return 'mechanical';
  if (/consumable|\bmisc|packaging|document|label|tool/.test(t)) return 'misc';
  if (/mcu|microcontroller|display|power|storage|input|wiring|wire|cable|connector|electronic|pcb|semiconduct|passive|resistor|capacitor|sensor|battery|charg|module/.test(t)) return 'electronics';
  return null;
}

/** Number from a spreadsheet cell, tolerating currency symbols and thousands commas. */
function cellNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw).replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

const cellText = (raw) => (raw === null || raw === undefined ? '' : String(raw).trim());

/** Find the BOM table in a workbook and pull its line rows out.
 *
 *  Scans every sheet for a header row that names both a component-ish column and a qty
 *  or price column, then reads the rows beneath it. This is what makes a real export
 *  work: `sheet_to_json` alone assumes row 1 is the header, so a sheet with a title
 *  block above the table yields rows keyed off the title and no usable values.
 *
 *  Returns { rows, sheetName, headerRow } or null when no BOM table is present - which
 *  is also how a test protocol or spec sheet gets rejected.
 */
function extractBomRows(workbook) {
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    // Array-of-arrays keeps raw positions, so a header anywhere in the sheet works.
    const grid = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: null });
    if (!grid || grid.length === 0) continue;

    const limit = Math.min(grid.length, MAX_HEADER_SCAN_ROWS);
    for (let r = 0; r < limit; r++) {
      const roles = (grid[r] || []).map(headerRole);
      const columnFor = (role) => roles.indexOf(role);
      const hasComponent = columnFor('component') !== -1;
      const hasValue = columnFor('qty') !== -1 || columnFor('price') !== -1;
      if (!hasComponent || !hasValue) continue;

      const nameCol = columnFor('component');
      const refCol = columnFor('ref');
      const qtyCol = columnFor('qty');
      const priceCol = columnFor('price');
      const categoryCol = columnFor('category');

      const rows = [];
      for (let i = r + 1; i < grid.length; i++) {
        const row = grid[i] || [];
        const name = cellText(row[nameCol]);
        const quantity = qtyCol === -1 ? null : cellNumber(row[qtyCol]);
        const price = priceCol === -1 ? null : cellNumber(row[priceCol]);

        // A real line needs a name and at least one number. This drops section
        // separators, blank spacers and the trailing grand-total row.
        if (!name || (quantity === null && price === null)) continue;

        rows.push({
          id: rows.length,
          name,
          label: refCol === -1 ? '' : cellText(row[refCol]),
          quantity,
          price,
          // The sheet's own category text, mapped to a bin at line-build time.
          categoryText: categoryCol === -1 ? '' : cellText(row[categoryCol]),
        });
      }

      if (rows.length > 0) return { rows, sheetName, headerRow: r + 1 };
    }
  }

  return null;
}

// Category is owned by the backend (File.category). The frontend only reads it -
// never re-derives it from the extension, so the two can't drift apart.
const CATEGORIES = [
  { key: 'electronics', label: 'Electronics' },
  { key: 'mechanical', label: 'Mechanical' },
  { key: 'misc', label: 'Misc' },
];

function fileExtension(file) {
  const fromField = file.file_extension;
  if (fromField) return String(fromField).toLowerCase().replace(/^\./, '');
  const name = file.name || '';
  return name.includes('.') ? name.split('.').pop().toLowerCase() : '';
}

/** Numeric price, or null when no price has been set (blank is not zero). */
const toPrice = cellNumber;

/** Price for the revision currently in view, falling back to the file's own price.
 *  A revision only carries `price` (never quantity/category), so the file stays the
 *  source of truth for everything else - and keeps its own id for PATCHes. */
function resolvePrice(file) {
  const revision = file.selected_revision_obj || file.latest_revision;
  const revisionPrice = revision ? revision.price : undefined;
  const raw = (revisionPrice === null || revisionPrice === undefined || revisionPrice === '')
    ? file.price
    : revisionPrice;
  return toPrice(raw);
}

function toQuantity(raw) {
  const n = cellNumber(raw);
  return n !== null && n > 0 ? n : 1;
}

function formatMoney(n) {
  return (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeUrl(url) {
  return url ? url.replace(/^https?:\/\/[^/]+/, window.location.origin) : null;
}

/** Server URL for a file's current revision - same resolution order as the preview pane. */
function serverUrlFor(file) {
  const revision = file.selected_revision_obj || file.latest_revision;
  return normalizeUrl(revision && revision.uploaded_file)
    || normalizeUrl(file.uploaded_file)
    || (file.file_path ? `/media/${file.file_path}` : null);
}

/** Turn the container's files into flat BOM line items.
 *
 *  Only files that can carry cost become lines: hardware files (one line each) and
 *  spreadsheets (one line per parsed row). Firmware, docs and images are skipped.
 *
 *  Seam for later: line objects are built here and consumed generically by the table
 *  renderer, so adding/reordering/hiding columns is a change to the column set and this
 *  shape, not to the rendering path.
 */
function buildLineItems(files) {
  const lines = [];

  files.forEach(file => {
    const ext = fileExtension(file);
    const category = file.category || 'misc';

    if (showQtyPriceExtensions.includes(ext)) {
      const qty = toQuantity(file.quantity);
      const unitPrice = resolvePrice(file);
      lines.push({
        key: `f-${file.id}`,
        fileId: file.id,
        component: file.name,
        ref: file.label || '',
        source: file.name,
        qty,
        unitPrice,
        lineTotal: unitPrice === null ? 0 : qty * unitPrice,
        category,
      });
      return;
    }

    if (spreadsheetExtensions.includes(ext)) {
      // Rows come from the parse cache, never from App state - see sheetCache above.
      const parsed = sheetCache.get(cacheKey(file));
      if (!parsed || !parsed.bomSheet) return;

      parsed.rows.forEach((row, idx) => {
        const qty = toQuantity(row.quantity);
        const unitPrice = toPrice(row.price);
        // The sheet's own Category column bins each row, so fasteners and sheet metal
        // land under Mechanical even though the rest of the sheet is Electronics. Only
        // rows with no (or an unrecognised) category fall back to the file's bin.
        const rowCategory = mapSheetCategory(row.categoryText);
        lines.push({
          key: `f-${file.id}-r-${row.id != null ? row.id : idx}`,
          fileId: file.id,
          component: row.name || '(unnamed)',
          ref: row.label || '',
          source: file.name,
          qty,
          unitPrice,
          lineTotal: unitPrice === null ? 0 : qty * unitPrice,
          category: rowCategory || category,
          // Where the bin came from - the Source cell shows a fixed label for a
          // sheet-driven category and the editable dropdown otherwise.
          categoryFromSheet: rowCategory !== null,
          categoryText: row.categoryText || '',
        });
      });
    }
  });

  return lines;
}

function toCsvValue(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function BOMViewer({ prod, updateFile, toolbar, onSelectContainer }) {
  const [showAll, setShowAll] = useState(true);
  const [checkedCategories, setCheckedCategories] = useState({
    electronics: false,
    mechanical: false,
    misc: false,
  });

  const accent = accentFor(prod.containerType);

  const containerKey = prod.selectedContainer
    ? `${prod.containerType}_${prod.selectedContainer.id}`
    : null;

  const containerFiles = useMemo(
    () => (containerKey ? (prod.filesByContainer[containerKey] || []) : []),
    [containerKey, prod.filesByContainer]
  );

  const spreadsheetFiles = useMemo(
    () => containerFiles.filter(f => spreadsheetExtensions.includes(fileExtension(f))),
    [containerFiles]
  );

  // Parse spreadsheets into `contents` once each. Files uploaded this session carry a
  // dataUrl (no network needed); files loaded from the backend are fetched instead -
  // without this the BOM would silently show no spreadsheet rows after a reload.
  // Cache writes happen outside React, so this counter is what tells the view to
  // recompute once a sheet finishes parsing.
  const [parseTick, setParseTick] = useState(0);

  /** Write a file's category through to the backend, reverting locally if it fails.
   *  Defined above the parse effect because that effect uses it to bin BOM sheets. */
  const applyCategory = useCallback(async (fileId, nextCategory, previousCategory = 'misc') => {
    updateFile(fileId, { category: nextCategory });
    try {
      const response = await authenticatedFetch(`/api/files/${fileId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ category: nextCategory }),
      });
      if (!response.ok) throw new Error(response.statusText);
    } catch (error) {
      console.error('Failed to update file category', error);
      updateFile(fileId, { category: previousCategory });
    }
  }, [updateFile]);

  const parseInFlight = useRef(new Set());
  useEffect(() => {
    // No `cancelled` flag: StrictMode mounts, unmounts and remounts in development, so
    // cancelling on cleanup would discard the first run's result while the in-flight
    // guard makes the second run skip - and the sheet would never parse at all.
    spreadsheetFiles.forEach(async (file) => {
      const key = cacheKey(file);
      if (sheetCache.has(key) || parseInFlight.current.has(key)) return;
      parseInFlight.current.add(key);

      try {
        let bytes = null;

        if (typeof file.dataUrl === 'string' && file.dataUrl.startsWith('data:')) {
          const base64 = file.dataUrl.split(',')[1];
          if (base64) {
            const binary = atob(base64);
            bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          }
        }

        if (!bytes) {
          const url = serverUrlFor(file);
          if (!url) throw new Error('no downloadable URL for this file');
          const response = await authenticatedFetch(url);
          if (!response.ok) throw new Error(`download failed (${response.status})`);
          bytes = new Uint8Array(await response.arrayBuffer());
        }

        // XLSX.read sniffs the format, so xls/xlsx/csv all go through one path.
        const workbook = XLSX.read(bytes, { type: 'array' });
        const found = extractBomRows(workbook);

        sheetCache.set(key, {
          rows: found ? found.rows : [],
          bomSheet: found !== null,
          note: found
            ? null
            : 'no BOM table found (needs a header row with a component column and a Qty or price column)',
        });

        // A BOM is an electronics bill of materials here, so its rows belong in that
        // bin. Only fill in the default ('misc' from the extension guess) - never
        // override a category the user set deliberately. Written back to the backend so
        // it persists and stays the single source of truth.
        if (found && (file.category || 'misc') === 'misc') {
          applyCategory(file.id, 'electronics');
        }
      } catch (error) {
        console.error('Error parsing spreadsheet file', file.name, error);
        sheetCache.set(key, { rows: [], bomSheet: false, note: `could not be read - ${error.message}` });
      } finally {
        parseInFlight.current.delete(key);
        // Cache writes are invisible to React - nudge a re-render so the new rows show.
        setParseTick(t => t + 1);
      }
    });
  }, [spreadsheetFiles, updateFile, applyCategory]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- parseTick is the cache's change signal
  const allLines = useMemo(() => buildLineItems(containerFiles), [containerFiles, parseTick]);

  const linesByCategory = useMemo(() => {
    const grouped = { electronics: [], mechanical: [], misc: [] };
    allLines.forEach(line => {
      (grouped[line.category] || grouped.misc).push(line);
    });
    return grouped;
  }, [allLines]);

  const categoryTotals = useMemo(() => {
    const totals = { electronics: 0, mechanical: 0, misc: 0 };
    Object.keys(totals).forEach(key => {
      totals[key] = linesByCategory[key].reduce((sum, l) => sum + l.lineTotal, 0);
    });
    return totals;
  }, [linesByCategory]);

  // The iteration costs what it costs - always every category, regardless of filters.
  const iterationTotal = useMemo(
    () => allLines.reduce((sum, l) => sum + l.lineTotal, 0),
    [allLines]
  );

  const missingPriceCount = useMemo(
    () => allLines.filter(l => l.unitPrice === null).length,
    [allLines]
  );

  const containerLabel = containerLabelOf(prod.selectedContainer);

  /* eslint-disable react-hooks/exhaustive-deps -- parseTick is the cache's change signal */
  const parsedSheetCount = useMemo(
    () => spreadsheetFiles.filter(f => sheetCache.has(cacheKey(f))).length,
    [spreadsheetFiles, parseTick]
  );

  // Spreadsheets in this container that produced no lines, with the reason.
  const skippedSheets = useMemo(
    () => spreadsheetFiles
      .map(file => ({ file, note: (sheetCache.get(cacheKey(file)) || {}).note }))
      .filter(entry => entry.note),
    [spreadsheetFiles, parseTick]
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  /** Reassign a file's bin from the Source-cell dropdown. */
  const handleCategoryChange = useCallback((fileId, nextCategory) => {
    const current = containerFiles.find(f => f.id === fileId);
    const previous = current ? (current.category || 'misc') : 'misc';
    if (previous === nextCategory) return;
    applyCategory(fileId, nextCategory, previous);
  }, [containerFiles, applyCategory]);

  /** Export every computed line (all categories - the visual filter is ignored). */
  function handleExportCsv() {
    const header = ['Category', 'Component', 'Ref/Label', 'Source', 'Qty', 'Price', 'Total'];
    const rows = allLines.map(l => [
      l.category,
      l.component,
      l.ref,
      l.source,
      l.qty,
      l.unitPrice === null ? '' : l.unitPrice.toFixed(2),
      l.lineTotal.toFixed(2),
    ]);

    const csv = [header, ...rows].map(r => r.map(toCsvValue).join(',')).join('\r\n');
    const sanitize = (s) => (s || '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
    const filename = `${sanitize(prod.name) || 'PRODUCT'}_${sanitize(containerLabel) || 'CONTAINER'}_BOM.csv`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // "Show all" and the per-category checkboxes are two modes of the same control:
  // turning one on turns the other off, so the two can never disagree.
  function handleToggleShowAll() {
    const next = !showAll;
    setShowAll(next);
    if (next) setCheckedCategories({ electronics: false, mechanical: false, misc: false });
  }

  function handleToggleCategory(key) {
    const next = { ...checkedCategories, [key]: !checkedCategories[key] };
    setCheckedCategories(next);
    setShowAll(!CATEGORIES.some(c => next[c.key]));
  }

  // Which tables to render: one merged table, or one per checked category.
  const visibleCategories = CATEGORIES.filter(c => checkedCategories[c.key]).map(c => c.key);
  const tables = showAll
    ? [{ id: 'all', title: 'All categories', lines: allLines }]
    : visibleCategories.map(key => ({
        id: key,
        title: CATEGORIES.find(c => c.key === key).label,
        lines: linesByCategory[key],
      }));

  const cellBorder = `1px solid ${styles.colors.border}`;
  const numericCell = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const tableHeaderBarStyle = {
    backgroundColor: styles.colors.darkAlt,
    padding: '10px 14px',
    borderRadius: `${styles.borderRadius.md} ${styles.borderRadius.md} 0 0`,
    border: cellBorder,
    borderBottom: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  };

  function renderTable(table) {
    const subtotal = table.lines.reduce((sum, l) => sum + l.lineTotal, 0);

    return (
      <div key={table.id} className="mb-4">
        <div style={tableHeaderBarStyle}>
          <span style={{ color: styles.colors.text.light, fontSize: styles.fonts.size.sm, fontWeight: styles.fonts.weight.bold, letterSpacing: '0.3px' }}>
            {table.title}
            <span style={{ color: styles.colors.text.muted, fontWeight: styles.fonts.weight.normal, marginLeft: '8px' }}>
              {table.lines.length} {table.lines.length === 1 ? 'item' : 'items'}
            </span>
          </span>
          <span style={{ color: styles.colors.text.light, fontSize: styles.fonts.size.sm, fontWeight: styles.fonts.weight.bold, ...numericCell }}>
            Subtotal &#8377;{formatMoney(subtotal)}
          </span>
        </div>

        <Table hover variant="dark" className="mb-0" style={{ borderCollapse: 'collapse', border: cellBorder, fontSize: styles.fonts.size.sm }}>
          <thead>
            <tr style={{ backgroundColor: styles.colors.darkAlt }}>
              <th style={{ width: '26%' }}>Component</th>
              <th style={{ width: '16%' }}>Ref / Label</th>
              <th style={{ width: '30%' }}>Source</th>
              <th style={{ width: '8%', ...numericCell }}>Qty</th>
              <th style={{ width: '10%', ...numericCell }}>Price</th>
              <th style={{ width: '10%', ...numericCell }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {table.lines.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: styles.colors.text.muted }}>No line items in this category.</td>
              </tr>
            ) : table.lines.map(line => (
              <tr key={line.key}>
                <td style={{ fontWeight: styles.fonts.weight.medium }}>{line.component}</td>
                <td style={{ color: line.ref ? styles.colors.text.light : styles.colors.text.muted }}>
                  {line.ref || '-'}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: styles.colors.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={line.source}>
                      {line.source}
                    </span>
                    {line.categoryFromSheet ? (
                      // The sheet decided this row's bin - showing an editable file-level
                      // dropdown here would claim an override that doesn't exist.
                      <span
                        title={`Category "${line.categoryText}" from the sheet`}
                        style={{
                          flexShrink: 0,
                          padding: '1px 8px',
                          fontSize: styles.fonts.size.xs,
                          color: styles.colors.text.muted,
                          border: cellBorder,
                          borderRadius: styles.borderRadius.sm,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {line.categoryText || CATEGORIES.find(c => c.key === line.category).label}
                      </span>
                    ) : (
                      <select
                        className="form-select form-select-sm"
                        title="Change this file's BOM category"
                        value={line.category}
                        onChange={e => handleCategoryChange(line.fileId, e.target.value)}
                        style={{
                          width: 'auto',
                          flexShrink: 0,
                          padding: '1px 18px 1px 6px',
                          fontSize: styles.fonts.size.xs,
                          color: styles.colors.text.muted,
                          border: cellBorder,
                          borderRadius: styles.borderRadius.sm,
                          cursor: 'pointer',
                        }}
                      >
                        {CATEGORIES.map(c => (
                          <option key={c.key} value={c.key} style={{ backgroundColor: styles.colors.dark, color: styles.colors.text.light }}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </td>
                <td style={numericCell}>{line.qty}</td>
                <td style={numericCell}>
                  {line.unitPrice === null
                    ? <span style={{ color: styles.colors.warning }}>not set</span>
                    : formatMoney(line.unitPrice)}
                </td>
                <td style={numericCell}>{formatMoney(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  }

  const railCheckboxRow = (category) => {
    const count = linesByCategory[category.key].length;
    const isChecked = checkedCategories[category.key];
    return (
      <label
        key={category.key}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
          padding: '6px 8px', borderRadius: styles.borderRadius.sm,
          color: isChecked ? styles.colors.text.light : styles.colors.text.muted,
          fontSize: styles.fonts.size.sm,
        }}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => handleToggleCategory(category.key)}
          style={{ cursor: 'pointer', accentColor: accent }}
        />
        <span style={{ flex: 1 }}>{category.label}</span>
        <span style={{ ...numericCell, color: styles.colors.text.muted, fontSize: styles.fonts.size.xs }}>{count}</span>
      </label>
    );
  };

  const leftPanel = (
    <>
      {toolbar}

      <ContainerSelect prod={prod} onSelectContainer={onSelectContainer} />

      <div style={{ height: '1px', background: styles.colors.border, margin: '14px 2px' }} />

      <div style={{
        color: styles.colors.text.muted, fontSize: styles.fonts.size.xs,
        textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px', paddingLeft: '8px',
      }}>
        Categories
      </div>

      <label style={{
        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
        padding: '6px 8px', borderRadius: styles.borderRadius.sm,
        color: showAll ? styles.colors.text.light : styles.colors.text.muted,
        fontSize: styles.fonts.size.sm,
      }}>
        <input
          type="checkbox"
          checked={showAll}
          onChange={handleToggleShowAll}
          style={{ cursor: 'pointer', accentColor: accent }}
        />
        <span style={{ flex: 1 }}>Show all (combined)</span>
        <span style={{ ...numericCell, color: styles.colors.text.muted, fontSize: styles.fonts.size.xs }}>{allLines.length}</span>
      </label>

      <div style={{ height: '1px', background: styles.colors.border, margin: '10px 4px' }} />

      {CATEGORIES.map(railCheckboxRow)}
    </>
  );

  const totalCard = (
    <div style={{
      backgroundColor: styles.colors.darkAlt,
      border: cellBorder,
      borderLeft: `4px solid ${accent}`,
      borderRadius: styles.borderRadius.md,
      padding: '14px 18px',
      minWidth: '290px',
    }}>
      {CATEGORIES.map(category => {
        const isVisible = showAll || checkedCategories[category.key];
        return (
          <div key={category.key} style={{
            display: 'flex', justifyContent: 'space-between', gap: '24px',
            fontSize: styles.fonts.size.sm, marginBottom: '6px',
            color: isVisible ? styles.colors.text.light : styles.colors.text.muted,
            opacity: isVisible ? 1 : 0.55,
          }}>
            <span>{category.label}</span>
            <span style={numericCell}>&#8377;{formatMoney(categoryTotals[category.key])}</span>
          </div>
        );
      })}

      <div style={{ height: '1px', background: styles.colors.border, margin: '12px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '24px' }}>
        <span style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.xs, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {containerLabel.toUpperCase() || 'ITERATION'} total
        </span>
        <span style={{ ...numericCell, color: accent, fontSize: '1.5rem', fontWeight: styles.fonts.weight.bold }}>
          &#8377;{formatMoney(iterationTotal)}
        </span>
      </div>

      <button
        type="button"
        onClick={handleExportCsv}
        disabled={allLines.length === 0}
        style={{
          marginTop: '14px', width: '100%',
          background: 'transparent',
          color: allLines.length === 0 ? styles.colors.text.muted : styles.colors.text.light,
          border: cellBorder,
          borderRadius: styles.borderRadius.md,
          padding: '6px 10px',
          fontSize: styles.fonts.size.sm,
          cursor: allLines.length === 0 ? 'not-allowed' : 'pointer',
        }}
        onMouseOver={e => { if (allLines.length) e.currentTarget.style.backgroundColor = styles.colors.dark; }}
        onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        Export BOM as CSV
      </button>
    </div>
  );

  return (
    <DashboardShell left={leftPanel}>
      {/* Column layout: header and total card stay put, only the tables scroll - so the
          total sits at the bottom-right of the screen even with a couple of rows. */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, padding: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <h4 style={{ margin: 0, fontSize: styles.fonts.size.md, color: styles.colors.text.light, whiteSpace: 'nowrap' }}>
              Dynamic Iterative BOM
            </h4>
            {prod.selectedContainer && (
              <span style={{
                fontSize: styles.fonts.size.xs,
                color: accent,
                border: `1px solid ${accent}`,
                borderRadius: '10px',
                padding: '2px 10px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {containerDisplayName(prod.selectedContainer)}
              </span>
            )}
          </div>
          {missingPriceCount > 0 && (
            <span style={{
              fontSize: styles.fonts.size.xs,
              color: styles.colors.warning,
              border: `1px solid ${styles.colors.warning}`,
              borderRadius: '10px',
              padding: '2px 10px',
              whiteSpace: 'nowrap',
            }}>
              {missingPriceCount} {missingPriceCount === 1 ? 'item' : 'items'} missing price
            </span>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto' }}>
          {!prod.selectedContainer ? (
            <p style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.sm }}>
              Select a Stage or Iteration to view the BOM.
            </p>
          ) : allLines.length === 0 ? (
            <div style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.sm }}>
              <p style={{ marginBottom: '6px' }}>
                No BOM lines for this container yet. Upload hardware files (
                {showQtyPriceExtensions.join(', ')}) or a BOM spreadsheet.
              </p>
              {/* Says which step came up empty, so an empty BOM is never a mystery. */}
              <p style={{ fontSize: styles.fonts.size.xs, opacity: 0.8, marginBottom: 0 }}>
                {containerFiles.length} file{containerFiles.length === 1 ? '' : 's'} loaded
                {' · '}{spreadsheetFiles.length} spreadsheet{spreadsheetFiles.length === 1 ? '' : 's'}
                {' · '}{parsedSheetCount} parsed
              </p>
            </div>
          ) : tables.length === 0 ? (
            <p style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.sm }}>
              Select a category on the left, or switch on "Show all (combined)".
            </p>
          ) : tables.map(renderTable)}

          {skippedSheets.length > 0 && (
            <div style={{ marginTop: '10px', fontSize: styles.fonts.size.xs, color: styles.colors.text.muted }}>
              {skippedSheets.map(({ file, note }) => (
                <div key={file.id}>Skipped <strong>{file.name}</strong>: {note}</div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', flexShrink: 0 }}>
          {totalCard}
        </div>
      </div>
    </DashboardShell>
  );
}

export default BOMViewer;
