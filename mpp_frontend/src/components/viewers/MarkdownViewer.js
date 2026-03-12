import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import typography from '../../styles/typography';

function MarkdownViewer({ fileUrl, authenticatedFetch }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMarkdown() {
      try {
        const res = await authenticatedFetch(fileUrl);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        const buffer = await res.arrayBuffer();
        const text = new TextDecoder('utf-8').decode(buffer);
        setContent(text);
      } catch (err) {
        setError(err.message || 'Error loading markdown');
      }
    }
    if (fileUrl) fetchMarkdown();
  }, [fileUrl]);

  if (error) return (
    <div style={styles.container}>
      <p style={{ color: '#ff6b6b' }}>Error loading file: {error}</p>
    </div>
  );

  return (
    <div style={styles.container}>
      {content ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({node, ...props}) => <h1 style={styles.h1} {...props} />,
            h2: ({node, ...props}) => <h2 style={styles.h2} {...props} />,
            h3: ({node, ...props}) => <h3 style={styles.h3} {...props} />,
            h4: ({node, ...props}) => <h4 style={styles.h4} {...props} />,
            p:  ({node, ...props}) => <p  style={styles.p}  {...props} />,
            li: ({node, ...props}) => <li style={styles.li} {...props} />,
            a:  ({node, ...props}) => <a  style={styles.a}  {...props} />,
            hr: ({node, ...props}) => <hr style={styles.hr} {...props} />,
            blockquote: ({node, ...props}) => <blockquote style={styles.blockquote} {...props} />,
            table: ({node, ...props}) => (
              <div style={{ overflowX: 'auto', marginBottom: '1.2rem' }}>
                <table style={styles.table} {...props} />
              </div>
            ),
            th: ({node, ...props}) => <th style={styles.th} {...props} />,
            td: ({node, ...props}) => <td style={styles.td} {...props} />,
            code: ({node, inline, ...props}) => inline
              ? <code style={styles.inlineCode} {...props} />
              : <pre style={styles.pre}><code style={styles.codeBlock} {...props} /></pre>,
          }}
        >{content}</ReactMarkdown>
      ) : (
        <p style={{ color: '#888' }}>Loading...</p>
      )}
    </div>
  );
}

const base = {
  fontFamily: typography.primary,
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#d4d4d4',
};

const styles = {
  container: {
    ...base,
    minHeight: '600px',
    borderRadius: '8px',
    border: '1px solid #333',
    overflow: 'auto',
    padding: '1.5rem 2rem',
    backgroundColor: '#0f1117',
  },
  h1: { fontSize: '1.6rem', fontWeight: 600, color: '#ffffff', margin: '1.5rem 0 0.5rem', lineHeight: 1.3, borderBottom: '1px solid #333', paddingBottom: '0.4rem' },
  h2: { fontSize: '1.25rem', fontWeight: 600, color: '#e8e8e8', margin: '1.4rem 0 0.4rem', lineHeight: 1.3, borderBottom: '1px solid #2a2a3e', paddingBottom: '0.3rem' },
  h3: { fontSize: '1.05rem', fontWeight: 600, color: '#d0d0d0', margin: '1.2rem 0 0.3rem', lineHeight: 1.4 },
  h4: { fontSize: '0.95rem', fontWeight: 600, color: '#c0c0c0', margin: '1rem 0 0.3rem' },
  p:  { ...base, margin: '0 0 0.8rem' },
  li: { ...base, margin: '0.2rem 0' },
  a:  { color: '#4a9eff', textDecoration: 'none' },
  hr: { border: 'none', borderTop: '1px solid #333', margin: '1.5rem 0' },
  blockquote: { borderLeft: '3px solid #4a9eff', margin: '1rem 0', padding: '0.5rem 1rem', background: '#1a1a2e', borderRadius: '0 4px 4px 0', color: '#aaa' },
  table: { borderCollapse: 'collapse', width: '100%', fontSize: '13px', fontFamily: typography.primary },
  th: { border: '1px solid #444', padding: '7px 12px', background: '#1e2030', textAlign: 'left', fontWeight: 600, color: '#e0e0e0' },
  td: { border: '1px solid #333', padding: '6px 12px', color: '#d4d4d4' },
  pre: { background: '#1a1a2e', padding: '1rem', borderRadius: '6px', overflow: 'auto', margin: '0.8rem 0' },
  codeBlock: { fontFamily: typography.mono, fontSize: '12px', lineHeight: '1.5', color: '#e0e0e0' },
  inlineCode: { fontFamily: typography.mono, fontSize: '12px', background: '#1e2030', padding: '1px 5px', borderRadius: '3px', color: '#e0e0e0' },
};

export default MarkdownViewer;
