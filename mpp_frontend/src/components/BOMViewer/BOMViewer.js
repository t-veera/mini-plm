import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Table } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import styles from '../../constants/styles';
import authenticatedFetch from '../../utils/authenticatedFetch';
import DashboardShell from '../DashboardShell/DashboardShell';

// Files that carry their own qty/price (one BOM line each). Mirrors the list in
// FileList.js, which decides where the qty/price context-menu options are offered.
const showQtyPriceExtensions = ['dxf', 'step', 'stp', 'stl', 'kicad_sch', 'gbr', 'gerber', 'kicad_pcb'];

// Spreadsheets contribute one BOM line per parsed row.
const spreadsheetExtensions = ['xls', 'xlsx', 'csv'];

// Category is owned by the backend (File.category). The frontend only reads it -
// never re-derives it from the extension, so the two can't drift apart.
const CATEGORIES = [
  { key: 'electronics', label: 'Electronics' },
  { key: 'mechanical', label: 'Mechanical' },
  { key: 'misc', label: 'Misc' },
];

/** Accent colour follows the selected container: iteration green (the "disc" icon) or
 *  stage yellow (the torii-gate icon), so the dashboard always matches the rail icon. */
function accentFor(containerType) {
  return containerType === 'stage' ? styles.colors.stage : styles.colors.iteration;
}

const capitalizeFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

function fileExtension(file) {
  const fromField = file.file_extension;
  if (fromField) return String(fromField).toLowerCase().replace(/^\./, '');
  const name = file.name || '';
  return name.includes('.') ? name.split('.').pop().toLowerCase() : '';
}

/** Numeric price, or null when no price has been set (blank is not zero). */
function toPrice(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

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
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
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

function containerLabelOf(container) {
  if (!container) return '';
  return container.stage_id || container.iteration_id || container.name || '';
}

/** "I2 Prototype two" - id, a space, then the name (if it adds anything), capitalised. */
function containerDisplayName(container) {
  if (!container) return '';
  const label = containerLabelOf(container);
  const name = (container.name || '').trim();
  if (!name || name === label) return label;
  return `${label} ${capitalizeFirst(name)}`;
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

    if (spreadsheetExtensions.includes(ext) && Array.isArray(file.contents)) {
      file.contents.forEach((row, idx) => {
        const qty = toQuantity(row.quantity);
        const unitPrice = toPrice(row.price);
        lines.push({
          key: `f-${file.id}-r-${row.id != null ? row.id : idx}`,
          fileId: file.id,
          component: row.name || '(unnamed)',
          ref: row.label || '',
          source: file.name,
          qty,
          unitPrice,
          lineTotal: unitPrice === null ? 0 : qty * unitPrice,
          // v1: the whole sheet shares the file's bin. Row-level split comes later.
          category,
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

  // Every stage/iteration, so the BOM can be pointed at one without leaving the view.
  const allContainers = useMemo(() => [
    ...(prod.stages || []).map(s => ({ ...s, containerType: 'stage' })),
    ...(prod.iterations || []).map(i => ({ ...i, containerType: 'iteration' })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [prod.stages, prod.iterations]);

  const spreadsheetFiles = useMemo(
    () => containerFiles.filter(f => spreadsheetExtensions.includes(fileExtension(f))),
    [containerFiles]
  );

  // Parse spreadsheets into `contents` once each. Files uploaded this session carry a
  // dataUrl (no network needed); files loaded from the backend are fetched instead -
  // without this the BOM would silently show no spreadsheet rows after a reload.
  const parseAttempted = useRef(new Set());
  useEffect(() => {
    let cancelled = false;

    spreadsheetFiles.forEach(async (file) => {
      if (file.contents || parseAttempted.current.has(file.id)) return;
      parseAttempted.current.add(file.id);

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
          if (!url) return;
          const response = await authenticatedFetch(url);
          if (!response.ok) return;
          bytes = new Uint8Array(await response.arrayBuffer());
        }

        // XLSX.read sniffs the format, so xls/xlsx/csv all go through one path.
        const workbook = XLSX.read(bytes, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) return;

        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        if (!jsonData || jsonData.length === 0) return;

        const contents = jsonData.map((row, idx) => ({
          id: idx,
          name: row.Component || row.Name || row.Item || Object.values(row)[0] || '',
          label: row.Label || row.Ref || row.Reference || row.Description || '',
          quantity: row.Quantity || row.Qty || row.Amount || 1,
          price: row.Price || row.Cost || row.Value || '',
        }));

        if (!cancelled) updateFile(file.id, { contents });
      } catch (error) {
        console.error('Error parsing spreadsheet file', file.name, error);
      }
    });

    return () => { cancelled = true; };
  }, [spreadsheetFiles, updateFile]);

  const allLines = useMemo(() => buildLineItems(containerFiles), [containerFiles]);

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

  /** Reassign a file's bin. Optimistic locally, reverted if the PATCH fails. */
  const handleCategoryChange = useCallback(async (fileId, nextCategory) => {
    const current = containerFiles.find(f => f.id === fileId);
    const previous = current ? (current.category || 'misc') : 'misc';
    if (previous === nextCategory) return;

    updateFile(fileId, { category: nextCategory });
    try {
      const response = await authenticatedFetch(`/api/files/${fileId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ category: nextCategory }),
      });
      if (!response.ok) throw new Error(response.statusText);
    } catch (error) {
      console.error('Failed to update file category', error);
      updateFile(fileId, { category: previous });
    }
  }, [containerFiles, updateFile]);

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

  function handleContainerSelect(e) {
    const value = e.target.value;
    const target = allContainers.find(c => `${c.containerType}_${c.id}` === value);
    if (target && onSelectContainer) onSelectContainer(target, target.containerType);
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

      <div style={{
        color: styles.colors.text.muted, fontSize: styles.fonts.size.xs,
        textTransform: 'uppercase', letterSpacing: '0.6px', margin: '10px 0 6px 2px',
      }}>
        Iteration / Stage
      </div>
      <select
        className="form-select form-select-sm"
        value={containerKey || ''}
        onChange={handleContainerSelect}
        style={{
          width: '100%', fontSize: styles.fonts.size.sm,
          color: styles.colors.text.light, border: cellBorder,
          borderRadius: styles.borderRadius.md, cursor: 'pointer',
        }}
      >
        {!prod.selectedContainer && <option value="">Select a stage or iteration...</option>}
        {allContainers.map(c => (
          <option key={`${c.containerType}_${c.id}`} value={`${c.containerType}_${c.id}`}
            style={{ backgroundColor: styles.colors.dark, color: styles.colors.text.light }}>
            {containerDisplayName(c)}
          </option>
        ))}
      </select>

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
            <p style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.sm }}>
              No priceable files in this container. Upload hardware files (
              {showQtyPriceExtensions.join(', ')}) or a spreadsheet to build a BOM.
            </p>
          ) : tables.length === 0 ? (
            <p style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.sm }}>
              Select a category on the left, or switch on "Show all (combined)".
            </p>
          ) : tables.map(renderTable)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', flexShrink: 0 }}>
          {totalCard}
        </div>
      </div>
    </DashboardShell>
  );
}

export default BOMViewer;
