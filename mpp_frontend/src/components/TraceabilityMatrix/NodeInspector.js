import React, { useEffect, useState } from 'react';
import styles from '../../constants/styles';
import authenticatedFetch from '../../utils/authenticatedFetch';
import { MarkdownPreview } from '../viewers/FilePreviewers';
import { STATUS_COLORS, STATUS_TITLES, labelForType } from './traceGraph';

function normalizeUrl(url) {
  return url ? url.replace(/^https?:\/\/[^/]+/, window.location.origin) : null;
}

/** Same resolution order the file preview pane uses: current revision, then the file's
 *  own upload, then the stored path. */
function serverUrlFor(file) {
  if (!file) return null;
  const revision = file.selected_revision_obj || file.latest_revision;
  return normalizeUrl(revision && revision.uploaded_file)
    || normalizeUrl(file.uploaded_file)
    || (file.file_path ? `/media/${file.file_path}` : null);
}

/** Fetch the File row behind a node so the excerpt can be previewed. The graph carries
 *  the id and name only — the URL lives on the file record. */
function useSourceFile(fileId) {
  const [file, setFile] = useState(null);
  useEffect(() => {
    if (!fileId) { setFile(null); return undefined; }
    let cancelled = false;
    authenticatedFetch(`/api/files/${fileId}/`)
      .then(response => (response.ok ? response.json() : null))
      .then(data => { if (!cancelled) setFile(data); })
      .catch(() => { if (!cancelled) setFile(null); });
    return () => { cancelled = true; };
  }, [fileId]);
  return file;
}

const sectionLabel = {
  color: styles.colors.text.muted, fontSize: styles.fonts.size.xs,
  textTransform: 'uppercase', letterSpacing: '0.6px', margin: '14px 0 6px 0',
};

/**
 * Side drawer for one node: what it is, how it is wired, and the document it came from.
 *
 * The excerpt is rendered with MarkdownPreview — the very component the file preview
 * pane uses for .md — so a doc looks the same here as it does in the Files view.
 */
function NodeInspector({ node, nodesByKey, adjacency, onClose }) {
  const sourceFile = useSourceFile(node ? node.source_file_id : null);
  if (!node) return null;

  const color = STATUS_COLORS[node.status] || styles.colors.primary;
  const parents = (adjacency.parents.get(node.key) || []).map(k => nodesByKey.get(k)).filter(Boolean);
  const children = (adjacency.children.get(node.key) || []).map(k => nodesByKey.get(k)).filter(Boolean);
  const fileUrl = serverUrlFor(sourceFile);

  return (
    <div style={{
      width: '400px', flexShrink: 0, height: '100%',
      borderLeft: `1px solid ${styles.colors.border}`,
      backgroundColor: styles.colors.dark,
      display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '10px', padding: '12px 14px', borderBottom: `1px solid ${styles.colors.border}`,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: styles.colors.text.light, fontSize: styles.fonts.size.md, fontWeight: styles.fonts.weight.bold }}>
              {node.tag_id}
            </span>
            <span title={STATUS_TITLES[node.status]} style={{
              fontSize: styles.fonts.size.xs, color, border: `1px solid ${color}`,
              borderRadius: '10px', padding: '1px 9px',
            }}>
              {node.status}
            </span>
          </div>
          <div style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.sm, marginTop: '4px' }}>
            {node.title || '(no title)'}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          style={{
            background: 'transparent', border: `1px solid ${styles.colors.border}`,
            color: styles.colors.text.muted, borderRadius: styles.borderRadius.md,
            padding: '2px 9px', cursor: 'pointer', fontSize: styles.fonts.size.sm, flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 14px 14px' }}>
        <div style={sectionLabel}>Details</div>
        <Detail name="Type" value={`${labelForType(node.node_type)} (${node.node_type})`} />
        <Detail name="Container" value={node.container_label + (node.inherited ? ' — inherited' : '')} />
        {node.subsystem && <Detail name="Subsystem" value={node.subsystem} />}
        {node.test_status && <Detail name="Test result" value={node.test_status} />}
        <Detail name="Source" value={`${node.source_file_name}:${node.source_line}`} />

        <div style={sectionLabel}>Upstream ({parents.length})</div>
        <Lineage nodes={parents} empty="Nothing upstream." />

        <div style={sectionLabel}>Downstream ({children.length})</div>
        <Lineage nodes={children} empty="Nothing downstream." />

        <div style={sectionLabel}>Excerpt</div>
        <div style={{
          border: `1px solid ${styles.colors.border}`, borderRadius: styles.borderRadius.md,
          padding: '8px 10px', marginBottom: '10px',
          color: styles.colors.text.light, fontSize: styles.fonts.size.xs,
          fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {node.snippet || '(no excerpt)'}
        </div>

        <div style={sectionLabel}>{node.source_file_name}</div>
        {fileUrl
          ? <MarkdownPreview fileUrl={fileUrl} />
          : <div style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.xs }}>Loading document…</div>}
      </div>
    </div>
  );
}

function Detail({ name, value }) {
  return (
    <div style={{ display: 'flex', gap: '10px', fontSize: styles.fonts.size.sm, marginBottom: '4px' }}>
      <span style={{ color: styles.colors.text.muted, minWidth: '92px' }}>{name}</span>
      <span style={{ color: styles.colors.text.light, wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function Lineage({ nodes, empty }) {
  if (nodes.length === 0) {
    return <div style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.xs }}>{empty}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {nodes.map(node => {
        const color = STATUS_COLORS[node.status] || styles.colors.primary;
        return (
          <div key={node.key} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            borderLeft: `3px solid ${color}`, paddingLeft: '8px',
            fontSize: styles.fonts.size.sm, color: styles.colors.text.light,
          }}>
            <span style={{ fontWeight: styles.fonts.weight.bold }}>{node.tag_id}</span>
            <span style={{ color: styles.colors.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default NodeInspector;
