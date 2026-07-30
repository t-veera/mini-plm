import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import authenticatedFetch from '../../utils/authenticatedFetch';

// Preview for Word documents. .docx (and .docm) are converted to HTML in the browser
// via mammoth. The legacy binary .doc format isn't supported by mammoth, so we show a
// clear message with a download instead of rendering garbage.
export default function DocViewer({ fileUrl, name }) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const isLegacyDoc = (name || fileUrl || '').toLowerCase().endsWith('.doc');

  useEffect(() => {
    let cancelled = false;
    if (!fileUrl) return undefined;
    if (isLegacyDoc) { setLoading(false); return undefined; }
    setLoading(true); setError(null); setHtml('');
    authenticatedFetch(fileUrl)
      .then(res => { if (!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.arrayBuffer(); })
      .then(arrayBuffer => mammoth.convertToHtml({ arrayBuffer }))
      .then(result => { if (!cancelled) { setHtml(result.value || '<p><em>(empty document)</em></p>'); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [fileUrl, isLegacyDoc]);

  const shell = (children) => (
    <div style={{ height: '100%', borderRadius: '8px', border: '1px solid #888', overflow: 'auto', background: '#ffffff' }}>
      {children}
    </div>
  );

  if (isLegacyDoc) return shell(
    <div style={{ padding: '2rem', color: '#333' }}>
      <p style={{ fontWeight: 600 }}>Preview not available for legacy .doc files</p>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>The old binary Word format can't be rendered in-browser. Save the file as .docx to preview it, or download it to open in Word.</p>
    </div>
  );
  if (loading) return shell(<p style={{ padding: '1rem', color: '#666' }}>Loading document…</p>);
  if (error) return shell(<p style={{ padding: '1rem', color: '#c00' }}>Error loading document: {error}</p>);

  return shell(
    <>
      <style>{DOCX_CSS}</style>
      <div
        className="docx-preview"
        style={{ padding: '2rem 2.5rem', color: '#1a1a1a', fontFamily: 'Calibri, Segoe UI, Arial, sans-serif', lineHeight: 1.5, maxWidth: '850px', margin: '0 auto' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}

// mammoth emits clean semantic HTML with no styling, so tables render borderless
// (invisible) and headings/lists lose their look. This restores a readable document feel.
const DOCX_CSS = `
.docx-preview table { border-collapse: collapse; width: auto; margin: 1rem 0; }
.docx-preview table, .docx-preview th, .docx-preview td { border: 1px solid #bbb; }
.docx-preview th, .docx-preview td { padding: 6px 10px; vertical-align: top; text-align: left; }
.docx-preview th { background: #f1f3f5; font-weight: 600; }
.docx-preview h1 { font-size: 1.8rem; margin: 1.2rem 0 0.6rem; }
.docx-preview h2 { font-size: 1.45rem; margin: 1.1rem 0 0.5rem; }
.docx-preview h3 { font-size: 1.2rem; margin: 1rem 0 0.4rem; }
.docx-preview h4, .docx-preview h5, .docx-preview h6 { font-size: 1.05rem; margin: 0.9rem 0 0.3rem; }
.docx-preview p { margin: 0.5rem 0; }
.docx-preview ul, .docx-preview ol { margin: 0.5rem 0 0.5rem 1.5rem; padding-left: 1rem; }
.docx-preview li { margin: 0.2rem 0; }
.docx-preview img { max-width: 100%; height: auto; }
.docx-preview a { color: #2563eb; }
.docx-preview strong { font-weight: 700; }
.docx-preview em { font-style: italic; }
`;
