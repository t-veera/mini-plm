import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import typography from '../../styles/typography';
import tokens from '../../constants/styles';

// Preview caps: a sheet with more than this many rows/cols is truncated before
// rendering. sheet_to_html emits an unvirtualized table with white-space:nowrap,
// so a very large (or formatting-inflated) sheet would otherwise freeze the tab.
const MAX_ROWS = 1000;
const MAX_COLS = 50;

function ExcelViewer({ fileUrl, authenticatedFetch }) {
  const [html, setHtml] = useState('');
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [workbookRef, setWorkbookRef] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState(null);

  function renderSheet(wb, index) {
    try {
      if (!wb || !wb.SheetNames?.length) return;
      const sheetName = wb.SheetNames[index];
      const worksheet = wb.Sheets[sheetName];
      if (!worksheet) {
        setHtml('<div style="padding:1rem;color:#888">This sheet is empty.</div>');
        setTruncated(false);
        setActiveSheet(index);
        return;
      }

      // Clamp the render range for large sheets (clone so the workbook is untouched).
      let ws = worksheet;
      let isTruncated = false;
      const ref = worksheet['!ref'];
      if (ref) {
        const range = XLSX.utils.decode_range(ref);
        const rows = range.e.r - range.s.r + 1;
        const cols = range.e.c - range.s.c + 1;
        if (rows > MAX_ROWS || cols > MAX_COLS) {
          isTruncated = true;
          const clamped = {
            s: { r: range.s.r, c: range.s.c },
            e: { r: Math.min(range.e.r, range.s.r + MAX_ROWS - 1), c: Math.min(range.e.c, range.s.c + MAX_COLS - 1) },
          };
          // Drop merges so a merge spanning past the clamped range can't trip up the export.
          ws = { ...worksheet, '!ref': XLSX.utils.encode_range(clamped), '!merges': [] };
        }
      }

      const htmlStr = XLSX.utils.sheet_to_html(ws, { editable: false });
      setHtml(htmlStr);
      setTruncated(isTruncated);
      setActiveSheet(index);
    } catch (err) {
      console.error('Failed to render sheet:', err);
      setError(err.message || 'Failed to render this sheet');
    }
  }

  useEffect(() => {
    async function fetchExcel() {
      setError(null);
      setTruncated(false);
      try {
        const res = await authenticatedFetch(fileUrl);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        setWorkbookRef(wb);
        setSheetNames(wb.SheetNames);
        renderSheet(wb, 0);
      } catch (err) {
        console.error('Error fetching Excel file:', err);
        setError(err.message || 'Error loading Excel');
      }
    }
    if (fileUrl) fetchExcel();
  }, [fileUrl]);

  if (error) return (
    <div style={styles.container}>
      <p style={{ color: '#ff6b6b' }}>Error loading file: {error}</p>
    </div>
  );

  if (!html) return (
    <div style={styles.container}>
      <p style={{ color: '#888' }}>Loading...</p>
    </div>
  );

  return (
    <div style={styles.container}>
      {sheetNames.length > 1 && (
        <div style={styles.tabBar}>
          {sheetNames.map((name, i) => (
            <button key={i} type="button" onClick={() => renderSheet(workbookRef, i)} style={{
              ...styles.tab,
              background: activeSheet === i ? tokens.colors.primaryActive : 'transparent',
              color: activeSheet === i ? tokens.colors.text.light : tokens.colors.text.muted,
            }}>{name}</button>
          ))}
        </div>
      )}
      {truncated && (
        <div style={styles.truncatedNote}>
          Large sheet — showing the first {MAX_ROWS} rows × {MAX_COLS} columns. Download the file to see everything.
        </div>
      )}
      <div className="excel-wrap" style={styles.tableWrap} dangerouslySetInnerHTML={{ __html: html }} />
      <style>{`
        .excel-wrap table { border-collapse: collapse; font-size: 13px; font-family: ${typography.primary}; color: var(--mp-text); width: 100%; }
        .excel-wrap td, .excel-wrap th { border: 1px solid var(--mp-border); padding: 5px 10px; white-space: nowrap; }
        .excel-wrap tr:nth-child(even) td { background: var(--mp-hover); }
      `}</style>
    </div>
  );
}

// Themed via the shared tokens so the sheet preview follows Light/Dark.
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    borderRadius: '8px',
    border: `1px solid ${tokens.colors.border}`,
    overflow: 'hidden',
    backgroundColor: tokens.colors.dark,
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    padding: '6px 8px',
    background: tokens.colors.darkAlt,
    borderBottom: `1px solid ${tokens.colors.border}`,
    flexShrink: 0,
  },
  tab: {
    padding: '3px 12px',
    fontSize: '12px',
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '3px',
    cursor: 'pointer',
    fontFamily: typography.primary,
  },
  tableWrap: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  truncatedNote: {
    flexShrink: 0,
    padding: '5px 10px',
    fontSize: '11px',
    color: tokens.colors.warning,
    background: tokens.colors.darkAlt,
    borderBottom: `1px solid ${tokens.colors.border}`,
  },
};

export default ExcelViewer;
