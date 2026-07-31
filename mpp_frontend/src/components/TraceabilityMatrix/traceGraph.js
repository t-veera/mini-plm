import styles from '../../constants/styles';

/** The six document types, in upstream -> downstream order. Mirrors DOC_ORDER on the
 *  backend; the persisted preset is a subset of these, in the user's chosen order. */
export const NODE_TYPES = [
  { key: 'PRD', label: 'Requirements' },
  { key: 'ARCH', label: 'Architecture' },
  { key: 'RISK', label: 'Risks' },
  { key: 'SRS', label: 'Specs' },
  { key: 'VERIF', label: 'Verification' },
  { key: 'VAL', label: 'Validation' },
];

export const TEST_TYPES = ['VERIF', 'VAL'];

export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 6;

export const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'errors', label: 'Errors only' },
  { key: 'unmitigated', label: 'Unmitigated risks' },
];

/** Status colours are the app's established palette: iteration green for complete,
 *  stage yellow for in-progress, danger red for broken. The API owns the status - this
 *  map only decides how to paint it. */
export const STATUS_COLORS = {
  GREEN: styles.colors.iteration,
  YELLOW: styles.colors.stage,
  RED: styles.colors.danger,
};

export const STATUS_TITLES = {
  GREEN: 'Complete — traced through to a passing test',
  YELLOW: 'Not there yet — no test coverage yet, or covered only by an older container',
  RED: 'Broken — orphaned, or upstream of a failing test',
};

export function labelForType(nodeType) {
  const found = NODE_TYPES.find(t => t.key === nodeType);
  return found ? found.label : nodeType;
}

/** parents/children lookup keyed by node key. Built once per graph payload. */
export function buildAdjacency(edges) {
  const parents = new Map();
  const children = new Map();
  edges.forEach(({ parent, child }) => {
    if (!children.has(parent)) children.set(parent, []);
    if (!parents.has(child)) parents.set(child, []);
    children.get(parent).push(child);
    parents.get(child).push(parent);
  });
  return { parents, children };
}

/** True when any downstream path from `key` reaches a VERIF/VAL node.
 *  Used only to answer "is this risk covered by a test at all" for the filter — the
 *  colour itself always comes from the API. */
function reachesTest(key, nodesByKey, children) {
  const seen = new Set([key]);
  const queue = [key];
  while (queue.length) {
    const current = queue.shift();
    const next = children.get(current) || [];
    for (const childKey of next) {
      if (seen.has(childKey)) continue;
      const node = nodesByKey.get(childKey);
      if (node && TEST_TYPES.includes(node.node_type)) return true;
      seen.add(childKey);
      queue.push(childKey);
    }
  }
  return false;
}

/**
 * Apply the left-panel filters. Returns the surviving nodes.
 *
 * - "Errors only" hides GREEN.
 * - "Unmitigated risks" keeps only RISK nodes that are yellow/red *and* have no test
 *   anywhere downstream — i.e. a risk nobody has written a test for yet.
 * - Subsystem and search narrow whatever the status filter left.
 */
export function filterNodes(nodes, edges, { statusFilter, subsystems, search }) {
  const nodesByKey = new Map(nodes.map(n => [n.key, n]));
  const { children } = buildAdjacency(edges);
  const needle = (search || '').trim().toLowerCase();
  const subsystemSet = new Set(subsystems || []);

  return nodes.filter(node => {
    if (statusFilter === 'errors' && node.status === 'GREEN') return false;
    if (statusFilter === 'unmitigated') {
      if (node.node_type !== 'RISK' || node.status === 'GREEN') return false;
      if (reachesTest(node.key, nodesByKey, children)) return false;
    }
    if (subsystemSet.size && !subsystemSet.has(node.subsystem)) return false;
    if (needle) {
      const haystack = `${node.tag_id} ${node.title} ${node.subsystem || ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/** Group the visible nodes into the preset's columns, preserving the preset's order. */
export function buildColumns(columnKeys, visibleNodes) {
  return columnKeys.map(key => {
    const nodes = visibleNodes.filter(n => n.node_type === key);
    return {
      key,
      label: labelForType(key),
      nodes,
      errorCount: nodes.filter(n => n.status !== 'GREEN').length,
    };
  });
}
