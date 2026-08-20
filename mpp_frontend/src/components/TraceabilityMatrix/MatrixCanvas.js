import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import styles from '../../constants/styles';
import { STATUS_COLORS, STATUS_TITLES, edgeId } from './traceGraph';

const COLUMN_WIDTH = 248;

/**
 * The N-column matrix: one column per selected doc type, scrolling horizontally.
 *
 * Connectors are drawn only for the hovered card's direct parents and children. Doing
 * it on demand keeps this to a couple of measured rectangles instead of a persistent
 * layout graph, which is why no graph library is needed. Each line takes the colour of
 * its downstream end, so a red node paints every link feeding into it and a broken
 * chain reads red the whole way across.
 *
 * Solid line = the document says so. Dashed = someone drew it by hand. That is a line
 * STYLE difference on purpose: colour already means status, and reusing it here would
 * need a new legend entry and would fight the dark theme.
 */
function MatrixCanvas({ columns, adjacency, hoveredKey, onHover, selectedKey, onSelect }) {
  const contentRef = useRef(null);
  const cardRefs = useRef(new Map());
  const [lines, setLines] = useState([]);

  const registerCard = useCallback((key, element) => {
    if (element) cardRefs.current.set(key, element);
    else cardRefs.current.delete(key);
  }, []);

  useLayoutEffect(() => {
    if (!hoveredKey || !contentRef.current) { setLines([]); return; }

    const origin = contentRef.current.getBoundingClientRect();
    const rectOf = (key) => {
      const element = cardRefs.current.get(key);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      // Relative to the scrolling content, so the lines stay put while scrolling.
      return {
        left: rect.left - origin.left, right: rect.right - origin.left,
        middle: rect.top - origin.top + rect.height / 2,
      };
    };

    const pairs = [
      ...(adjacency.parents.get(hoveredKey) || []).map(parent => [parent, hoveredKey]),
      ...(adjacency.children.get(hoveredKey) || []).map(child => [hoveredKey, child]),
    ];

    // Two documents that each name the other produce A->B and B->A, which are two
    // separate edges but one relationship. Nothing here draws arrowheads, so both would
    // land as identical curves between the same two cards. Collapse them and let a
    // document-derived direction decide the style, so a hand-drawn reciprocal of a real
    // link does not make the pair look hand-drawn.
    const byPair = new Map();
    pairs.forEach(([parentKey, childKey]) => {
      const undirected = parentKey < childKey ? `${parentKey}\u0000${childKey}` : `${childKey}\u0000${parentKey}`;
      const manual = adjacency.manual.has(edgeId(parentKey, childKey));
      const existing = byPair.get(undirected);
      if (!existing) byPair.set(undirected, { parentKey, childKey, manual });
      else if (existing.manual && !manual) byPair.set(undirected, { parentKey, childKey, manual });
    });

    const next = [];
    byPair.forEach(({ parentKey, childKey, manual }, undirected) => {
      const from = rectOf(parentKey);
      const to = rectOf(childKey);
      if (!from || !to) return;

      // Leave each card on the side that faces the other one. Always exiting right and
      // entering left assumes the parent sits in an earlier column; when it does not,
      // that curve doubles back across the canvas as a loop that reads as noise.
      let d;
      if (to.left >= from.right) {
        const x1 = from.right;
        const x2 = to.left;
        const bend = Math.max(24, (x2 - x1) / 2);
        d = `M ${x1} ${from.middle} C ${x1 + bend} ${from.middle}, ${x2 - bend} ${to.middle}, ${x2} ${to.middle}`;
      } else if (to.right <= from.left) {
        const x1 = from.left;
        const x2 = to.right;
        const bend = Math.max(24, (x1 - x2) / 2);
        d = `M ${x1} ${from.middle} C ${x1 - bend} ${from.middle}, ${x2 + bend} ${to.middle}, ${x2} ${to.middle}`;
      } else {
        // Same column: bulge out to the right rather than cutting through the cards
        // stacked between the two ends.
        const x = Math.max(from.right, to.right);
        const bulge = 30;
        d = `M ${x} ${from.middle} C ${x + bulge} ${from.middle}, ${x + bulge} ${to.middle}, ${x} ${to.middle}`;
      }

      next.push({ id: undirected, d, childKey, manual });
    });
    setLines(next);
  }, [hoveredKey, adjacency, columns]);

  const related = new Set();
  if (hoveredKey) {
    related.add(hoveredKey);
    (adjacency.parents.get(hoveredKey) || []).forEach(k => related.add(k));
    (adjacency.children.get(hoveredKey) || []).forEach(k => related.add(k));
  }

  const statusByKey = new Map();
  columns.forEach(column => column.nodes.forEach(node => statusByKey.set(node.key, node.status)));

  return (
    <div style={{ height: '100%', overflowX: 'auto', overflowY: 'auto' }}>
      <div ref={contentRef} style={{ position: 'relative', display: 'flex', gap: '16px', minWidth: 'min-content', paddingBottom: '8px' }}>
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 2 }}
        >
          {lines.map(line => (
            <path
              key={line.id}
              d={line.d}
              fill="none"
              stroke={STATUS_COLORS[statusByKey.get(line.childKey)] || styles.colors.primary}
              strokeWidth={2}
              strokeDasharray={line.manual ? '6 4' : undefined}
              opacity={0.9}
            >
              <title>{line.manual ? 'Manual link' : 'Link written in the document'}</title>
            </path>
          ))}
        </svg>

        {columns.map(column => (
          <MatrixColumn
            key={column.key}
            column={column}
            hoveredKey={hoveredKey}
            related={related}
            selectedKey={selectedKey}
            onHover={onHover}
            onSelect={onSelect}
            registerCard={registerCard}
          />
        ))}
      </div>
    </div>
  );
}

function MatrixColumn({ column, hoveredKey, related, selectedKey, onHover, onSelect, registerCard }) {
  return (
    <div style={{ width: `${COLUMN_WIDTH}px`, flexShrink: 0 }}>
      <div style={{
        backgroundColor: styles.colors.darkAlt,
        border: `1px solid ${styles.colors.border}`,
        borderRadius: styles.borderRadius.md,
        padding: '8px 12px', marginBottom: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
      }}>
        <span style={{ color: styles.colors.text.light, fontSize: styles.fonts.size.sm, fontWeight: styles.fonts.weight.bold, letterSpacing: '0.3px' }}>
          {column.label}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: styles.fonts.size.xs }}>
          <span style={{ color: styles.colors.text.muted }}>{column.nodes.length}</span>
          {column.errorCount > 0 && (
            <span style={{
              color: styles.colors.stage, border: `1px solid ${styles.colors.stage}`,
              borderRadius: '8px', padding: '0 6px',
            }}>
              {column.errorCount}
            </span>
          )}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {column.nodes.length === 0
          ? <div style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.xs, padding: '6px 4px' }}>Nothing here.</div>
          : column.nodes.map(node => (
            <NodeCard
              key={node.key}
              node={node}
              dimmed={!!hoveredKey && !related.has(node.key)}
              selected={selectedKey === node.key}
              onHover={onHover}
              onSelect={onSelect}
              registerCard={registerCard}
            />
          ))}
      </div>
    </div>
  );
}

function NodeCard({ node, dimmed, selected, onHover, onSelect, registerCard }) {
  const color = STATUS_COLORS[node.status] || styles.colors.primary;
  const frame = selected ? color : styles.colors.border;
  return (
    <div
      ref={element => registerCard(node.key, element)}
      onMouseEnter={() => onHover(node.key)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(node)}
      title={STATUS_TITLES[node.status] || ''}
      style={{
        position: 'relative', zIndex: 3,
        backgroundColor: styles.colors.darkAlt,
        // Four-value longhand rather than `border` + `borderLeft`: React warns when a
        // shorthand and a longhand for the same property both change on a rerender, and
        // this card rerenders whenever the graph reloads.
        borderStyle: 'solid',
        borderWidth: '1px 1px 1px 4px',
        borderColor: `${frame} ${frame} ${frame} ${color}`,
        borderRadius: styles.borderRadius.md,
        padding: '8px 10px',
        cursor: 'pointer',
        opacity: dimmed ? 0.35 : 1,
        transition: 'opacity 0.12s ease, border-color 0.12s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <span style={{ color: styles.colors.text.light, fontSize: styles.fonts.size.sm, fontWeight: styles.fonts.weight.bold }}>
          {node.tag_id}
        </span>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      </div>
      <div style={{
        color: styles.colors.text.muted, fontSize: styles.fonts.size.xs, marginTop: '3px',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {node.title || '(no title)'}
      </div>
      {(node.inherited || node.test_status || node.subsystem) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
          {node.test_status && <Tag text={node.test_status} color={node.test_status === 'PASS' ? styles.colors.iteration : styles.colors.danger} />}
          {node.subsystem && <Tag text={node.subsystem} color={styles.colors.text.muted} />}
          {node.inherited && <Tag text={`from ${node.container_label}`} color={styles.colors.text.muted} />}
        </div>
      )}
    </div>
  );
}

function Tag({ text, color }) {
  return (
    <span style={{
      fontSize: '0.65rem', color, border: `1px solid ${color}`,
      borderRadius: '8px', padding: '0 6px', whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  );
}

export default MatrixCanvas;
