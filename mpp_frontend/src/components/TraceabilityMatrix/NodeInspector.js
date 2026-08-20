import React, { useEffect, useMemo, useState } from 'react';
import styles from '../../constants/styles';
import authenticatedFetch from '../../utils/authenticatedFetch';
import { MarkdownPreview } from '../viewers/FilePreviewers';
import { STATUS_COLORS, STATUS_TITLES, edgeId, labelForType } from './traceGraph';

const MAX_SUGGESTIONS = 8;

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
function NodeInspector({ node, nodesByKey, adjacency, onSetLink, onClose }) {
  const sourceFile = useSourceFile(node ? node.source_file_id : null);
  const [linkError, setLinkError] = useState(null);
  const nodeKey = node ? node.key : null;

  // Clear a stale refusal message when the drawer moves to another node.
  useEffect(() => { setLinkError(null); }, [nodeKey]);

  if (!node) return null;

  const color = STATUS_COLORS[node.status] || styles.colors.primary;
  const parents = (adjacency.parents.get(node.key) || []).map(k => nodesByKey.get(k)).filter(Boolean);
  const children = (adjacency.children.get(node.key) || []).map(k => nodesByKey.get(k)).filter(Boolean);
  const fileUrl = serverUrlFor(sourceFile);

  const apply = (parentKey, childKey, linked) => {
    setLinkError(null);
    Promise.resolve(onSetLink(parentKey, childKey, linked))
      .then(message => setLinkError(message || null));
  };

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
        <Lineage
          nodes={parents}
          empty="Nothing upstream."
          manual={adjacency.manual}
          edgeFor={other => [other.key, node.key]}
          onUnlink={apply}
        />

        <div style={sectionLabel}>Downstream ({children.length})</div>
        <Lineage
          nodes={children}
          empty="Nothing downstream."
          manual={adjacency.manual}
          edgeFor={other => [node.key, other.key]}
          onUnlink={apply}
        />

        <LinkPicker node={node} nodesByKey={nodesByKey} adjacency={adjacency} onLink={apply} />

        {linkError && (
          <div style={{
            marginTop: '10px', padding: '8px 10px',
            border: `1px solid ${styles.colors.stage}`, borderRadius: styles.borderRadius.md,
            color: styles.colors.text.light, fontSize: styles.fonts.size.xs,
          }}>
            {linkError}
          </div>
        )}

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

/**
 * One side of a node's lineage, each row with an unlink control.
 *
 * The control is offered on every link, parsed or manual, because a user who wants a
 * link gone looks for it in the same place either way. Only a manual one is actually
 * removed; asking to remove a parsed one comes back with the reason it cannot be.
 */
function Lineage({ nodes, empty, manual, edgeFor, onUnlink }) {
  if (nodes.length === 0) {
    return <div style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.xs }}>{empty}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {nodes.map(node => {
        const color = STATUS_COLORS[node.status] || styles.colors.primary;
        const [parentKey, childKey] = edgeFor(node);
        const isManual = manual.has(edgeId(parentKey, childKey));
        return (
          <div key={node.key} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            borderLeft: `3px solid ${color}`, paddingLeft: '8px',
            fontSize: styles.fonts.size.sm, color: styles.colors.text.light,
          }}>
            <span style={{ fontWeight: styles.fonts.weight.bold }}>{node.tag_id}</span>
            <span style={{ flex: 1, minWidth: 0, color: styles.colors.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.title}
            </span>
            {isManual && (
              <span
                title="Linked by hand"
                style={{
                  fontSize: '0.65rem', color: styles.colors.text.muted,
                  border: `1px dashed ${styles.colors.border}`, borderRadius: '8px',
                  padding: '0 6px', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                manual
              </span>
            )}
            <button
              type="button"
              onClick={() => onUnlink(parentKey, childKey, false)}
              title={isManual ? 'Remove this link' : 'This link comes from the document'}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0,
                color: styles.colors.text.muted, fontSize: styles.fonts.size.sm,
                lineHeight: 1, padding: '0 2px',
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Search any other node and link it to this one.
 *
 * A match is taken however the hand is already moving: click it, or drive the list from
 * the search box with Up/Down and Enter without leaving the keyboard. Hover and the
 * keyboard cursor are the same highlight, so the two never disagree about what Enter
 * would take.
 *
 * The link is made in one direction — the picked node becomes downstream of this one,
 * which is what "link to" reads as from the node you already have open. An earlier
 * version asked upstream-or-downstream through a pair of small arrow buttons, on the
 * grounds that a guessed direction could silently reverse an edge. That cost more than
 * it bought: the buttons read as list reordering rather than as the way to choose
 * anything, and the canvas draws every edge as a plain undirected line (MatrixCanvas
 * paths carry no markerEnd), so the distinction they were protecting is never visible
 * there. Reversing one is still one click, in the Upstream/Downstream lists above.
 */
function LinkPicker({ node, nodesByKey, adjacency, onLink }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const linked = useMemo(() => new Set([
    ...(adjacency.parents.get(node.key) || []),
    ...(adjacency.children.get(node.key) || []),
    node.key,
  ]), [adjacency, node.key]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const found = [];
    for (const candidate of nodesByKey.values()) {
      if (linked.has(candidate.key)) continue;
      const haystack = `${candidate.tag_id} ${candidate.title || ''}`.toLowerCase();
      if (haystack.includes(needle)) found.push(candidate);
      if (found.length >= MAX_SUGGESTIONS) break;
    }
    return found;
  }, [query, nodesByKey, linked]);

  // A stale index would point Enter at a row that is no longer under the cursor.
  useEffect(() => { setActive(0); }, [query]);

  const link = other => {
    setQuery('');
    setActive(0);
    onLink(node.key, other.key, true);
  };

  const onKeyDown = event => {
    if (!matches.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(i => Math.min(i + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (matches[active]) link(matches[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setQuery('');
    }
  };

  return (
    <>
      <div style={sectionLabel}>Link to…</div>
      <input
        type="text"
        value={query}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search by ID or title"
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'transparent', color: styles.colors.text.light,
          border: `1px solid ${styles.colors.border}`, borderRadius: styles.borderRadius.md,
          padding: '5px 8px', fontSize: styles.fonts.size.sm,
        }}
      />
      {query.trim() && matches.length === 0 && (
        <div style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.xs, marginTop: '6px' }}>
          Nothing else matches — already-linked nodes are not listed.
        </div>
      )}
      {matches.length > 0 && (
        <div style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.xs, marginTop: '6px' }}>
          Click a result, or use ↑ ↓ and Enter. It becomes downstream of {node.tag_id}.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
        {matches.map((other, index) => {
          const color = STATUS_COLORS[other.status] || styles.colors.primary;
          const isActive = index === active;
          return (
            <div
              key={other.key}
              role="button"
              tabIndex={-1}
              title={`Link ${other.tag_id} downstream of ${node.tag_id}`}
              onClick={() => link(other)}
              onMouseEnter={() => setActive(index)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                borderLeft: `3px solid ${color}`, paddingLeft: '8px',
                paddingTop: '3px', paddingBottom: '3px',
                fontSize: styles.fonts.size.sm, color: styles.colors.text.light,
                cursor: 'pointer', userSelect: 'none',
                background: isActive ? styles.colors.hover : 'transparent',
                borderRadius: styles.borderRadius.md,
              }}
            >
              <span style={{ fontWeight: styles.fonts.weight.bold }}>{other.tag_id}</span>
              <span style={{ flex: 1, minWidth: 0, color: styles.colors.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {other.title}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default NodeInspector;
