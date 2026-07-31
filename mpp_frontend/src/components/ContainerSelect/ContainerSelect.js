import React, { useMemo } from 'react';
import styles from '../../constants/styles';

/** Accent follows the selected container: iteration green (the "disc" icon) or stage
 *  yellow (the torii-gate icon), so a dashboard always matches the rail icon. */
export function accentFor(containerType) {
  return containerType === 'stage' ? styles.colors.stage : styles.colors.iteration;
}

export function containerLabelOf(container) {
  if (!container) return '';
  return container.stage_id || container.iteration_id || container.name || '';
}

/** "I2 Prototype two" - id, a space, then the name (if it adds anything), capitalised. */
export function containerDisplayName(container) {
  if (!container) return '';
  const label = containerLabelOf(container);
  const name = (container.name || '').trim();
  if (!name || name === label) return label;
  return `${label} ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

/**
 * Every stage and iteration of a product in continuous IIL order.
 *
 * Ordered by `created_at` — the same key the container rail in App.js uses, and the
 * same order the traceability backend inherits along. Anything else here would make a
 * dashboard disagree with the rail sitting next to it.
 */
export function useOrderedContainers(prod) {
  return useMemo(() => [
    ...(prod.stages || []).map(s => ({ ...s, containerType: 'stage' })),
    ...(prod.iterations || []).map(i => ({ ...i, containerType: 'iteration' })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [prod.stages, prod.iterations]);
}

/**
 * The shared iteration/stage scope selector for the left panel of a dashboard.
 *
 * Extracted from BOMViewer so BOM and the traceability matrix point at a container the
 * same way; both hand selection back to App's handleContainerClick, which is what keeps
 * the rail, the file list and the dashboards on one selection.
 */
function ContainerSelect({ prod, onSelectContainer, label = 'Iteration / Stage' }) {
  const containers = useOrderedContainers(prod);
  const containerKey = prod.selectedContainer
    ? `${prod.containerType}_${prod.selectedContainer.id}`
    : '';

  function handleChange(e) {
    const target = containers.find(c => `${c.containerType}_${c.id}` === e.target.value);
    if (target && onSelectContainer) onSelectContainer(target, target.containerType);
  }

  return (
    <>
      <div style={{
        color: styles.colors.text.muted, fontSize: styles.fonts.size.xs,
        textTransform: 'uppercase', letterSpacing: '0.6px', margin: '10px 0 6px 2px',
      }}>
        {label}
      </div>
      <select
        className="form-select form-select-sm"
        value={containerKey}
        onChange={handleChange}
        style={{
          width: '100%', fontSize: styles.fonts.size.sm,
          color: styles.colors.text.light, border: `1px solid ${styles.colors.border}`,
          borderRadius: styles.borderRadius.md, cursor: 'pointer',
        }}
      >
        {!prod.selectedContainer && <option value="">Select a stage or iteration...</option>}
        {containers.map(c => (
          <option key={`${c.containerType}_${c.id}`} value={`${c.containerType}_${c.id}`}
            style={{ backgroundColor: styles.colors.dark, color: styles.colors.text.light }}>
            {containerDisplayName(c)}
          </option>
        ))}
      </select>
    </>
  );
}

export default ContainerSelect;
