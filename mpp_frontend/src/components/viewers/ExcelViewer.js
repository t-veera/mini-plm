import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import typography from '../../styles/typography';

function ExcelViewer({ fileUrl, authenticatedFetch }) {
  const [html, setHtml] = useState('');
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [workbookRef, setWorkbookRef] = useState(null);
  const [error, setError] = useState(null);

  function renderSheet(wb, index) {
    const sheetName = wb.SheetNames[index];
    const worksheet = wb.Sheets[sheetName];
    const htmlStr = XLSX.utils.sheet_to_html(worksheet, { editable: false });
    setHtml(htmlStr);
    setActiveSheet(index);
  }

  useEffect(() => {
    async function fetchExcel() {
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
            <button key={i} onClick={() => renderSheet(workbookRef, i)} style={{
              ...styles.tab,
              background: activeSheet === i ? '#4a9eff' : '#2a2a3e',
              color: activeSheet === i ? '#fff' : '#aaa',
            }}>{name}</button>
          ))}
        </div>
      )}
      <div className="excel-wrap" style={styles.tableWrap} dangerouslySetInnerHTML={{ __html: html }} />
      <style>{`
        .excel-wrap table { border-collapse: collapse; font-size: 13px; font-family: ${typography.primary}; color: #e0e0e0; width: 100%; }
        .excel-wrap td, .excel-wrap th { border: 1px solid #444; padding: 5px 10px; white-space: nowrap; }
        .excel-wrap tr:nth-child(even) td { background: #13151c; }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    borderRadius: '8px',
    border: '1px solid #333',
    overflow: 'hidden',
    backgroundColor: '#0f1117',
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    padding: '6px 8px',
    background: '#1a1d21',
    borderBottom: '1px solid #444',
    flexShrink: 0,
  },
  tab: {
    padding: '3px 12px',
    fontSize: '12px',
    border: '1px solid #444',
    borderRadius: '3px',
    cursor: 'pointer',
    fontFamily: typography.primary,
  },
  tableWrap: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
};

export default ExcelViewer;
