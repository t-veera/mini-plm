import React, { useState, useEffect } from 'react';
import { Table } from 'react-bootstrap';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import MarkdownViewer from './MarkdownViewer';
import ExcelViewer from './ExcelViewer';
import authenticatedFetch from '../../utils/authenticatedFetch';

export function CodePreview({ fileUrl, extension }) {
  const [codeContent, setCodeContent] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fileUrl) return;
    authenticatedFetch(fileUrl)
      .then(res => { if (!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.text(); })
      .then(setCodeContent)
      .catch(err => setError(err.message));
  }, [fileUrl]);

  let language = 'javascript';
  if (extension === '.py') language = 'python';
  else if (extension === '.cpp' || extension === '.ino') language = 'cpp';
  else if (extension === '.java') language = 'java';
  else if (extension === '.ts') language = 'typescript';

  if (error) return (
    <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', padding: '1rem' }}>
      <p className="text-danger">Error loading code: {error}</p>
    </div>
  );

  return (
    <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'auto' }}>
      {codeContent
        ? <SyntaxHighlighter language={language} style={materialDark} showLineNumbers>{codeContent}</SyntaxHighlighter>
        : <p className="text-muted">Loading code...</p>}
    </div>
  );
}

export function MarkdownPreview({ fileUrl }) {
  return <MarkdownViewer fileUrl={fileUrl} authenticatedFetch={authenticatedFetch} />;
}

export function CsvPreview({ fileUrl }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fileUrl) return;
    authenticatedFetch(fileUrl)
      .then(res => { if (!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.text(); })
      .then(text => setRows(text.split('\n').map(line => line.split(','))))
      .catch(err => setError(err.message));
  }, [fileUrl]);

  if (error) return (
    <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', padding: '1rem' }}>
      <p className="text-danger">Error loading CSV: {error}</p>
    </div>
  );

  return (
    <div style={{ maxHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'auto' }} className="excel-scroll-container">
      {rows.length === 0
        ? <p className="text-muted p-2">Loading CSV data...</p>
        : (
          <Table hover borderless className="table-dark table-sm" style={{ tableLayout: 'auto', minWidth: 'max-content' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#1a1d21' }}>
              <tr>{rows[0].map((cell, j) => <th key={j} style={{ whiteSpace: 'nowrap', padding: '8px 12px', borderBottom: '2px solid #555', fontSize: '0.85rem' }}>{cell}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, i) => (
                <tr key={i}>{rows[0].map((_, j) => <td key={j} style={{ padding: '6px 12px', whiteSpace: 'pre-wrap', maxWidth: '250px' }}>{row[j] ?? ''}</td>)}</tr>
              ))}
            </tbody>
          </Table>
        )}
    </div>
  );
}

export function ExcelPreview({ fileUrl }) {
  return <ExcelViewer fileUrl={fileUrl} authenticatedFetch={authenticatedFetch} />;
}
