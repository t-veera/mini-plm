import React, { useMemo, useState } from 'react';
import styles from '../../constants/styles';
import DashboardShell from '../DashboardShell/DashboardShell';
import { accentFor, containerDisplayName } from '../ContainerSelect/ContainerSelect';
import MatrixCanvas from './MatrixCanvas';
import MatrixControls from './MatrixControls';
import NodeInspector from './NodeInspector';
import useTraceMatrix from './useTraceMatrix';
import { NODE_TYPES, STATUS_COLORS, buildAdjacency, buildColumns, filterNodes } from './traceGraph';

const DEFAULT_COLUMNS = NODE_TYPES.map(t => t.key);
// Module-level so the "no filter" case is referentially stable — a fresh [] each render
// would invalidate the memoised filtering on every paint.
const NO_SUBSYSTEMS = [];

/**
 * The traceability matrix dashboard.
 *
 * Layout mirrors BOMViewer: the shared toolbar and this dashboard's controls sit in
 * DashboardShell's left panel, the canvas takes the rest. Status colours come from the
 * API — this component only decides what to show and how to arrange it, never what
 * colour a node should be.
 */
function TraceabilityMatrix({ prod, toolbar, onSelectContainer }) {
  const [search, setSearch] = useState('');
  const [hoveredKey, setHoveredKey] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const accent = accentFor(prod.containerType);
  const containerKey = prod.selectedContainer
    ? `${prod.containerType}:${prod.selectedContainer.id}`
    : null;

  const { graph, loading, error, preference, updatePreference } =
    useTraceMatrix(prod.id, containerKey);

  const columns = (preference && preference.columns) || DEFAULT_COLUMNS;
  const statusFilter = (preference && preference.status_filter) || 'all';
  const subsystemFilter = (preference && preference.subsystem_filter) || NO_SUBSYSTEMS;

  const nodes = useMemo(() => (graph ? graph.nodes : []), [graph]);
  const edges = useMemo(() => (graph ? graph.edges : []), [graph]);
  const subsystems = useMemo(() => (graph ? graph.subsystems || [] : []), [graph]);

  const adjacency = useMemo(() => buildAdjacency(edges), [edges]);
  const nodesByKey = useMemo(() => new Map(nodes.map(n => [n.key, n])), [nodes]);

  const visibleNodes = useMemo(
    () => filterNodes(nodes, edges, { statusFilter, subsystems: subsystemFilter, search }),
    [nodes, edges, statusFilter, subsystemFilter, search]
  );

  const matrixColumns = useMemo(
    () => buildColumns(columns, visibleNodes),
    [columns, visibleNodes]
  );

  const counts = graph ? graph.counts : { GREEN: 0, YELLOW: 0, RED: 0, total: 0 };

  const leftPanel = (
    <MatrixControls
      prod={prod}
      toolbar={toolbar}
      onSelectContainer={onSelectContainer}
      accent={accent}
      columns={columns}
      statusFilter={statusFilter}
      subsystemFilter={subsystemFilter}
      subsystems={subsystems}
      onColumnsChange={next => updatePreference({ columns: next })}
      onStatusFilterChange={next => updatePreference({ status_filter: next })}
      onSubsystemFilterChange={next => updatePreference({ subsystem_filter: next })}
      search={search}
      onSearchChange={setSearch}
    />
  );

  return (
    <DashboardShell left={leftPanel}>
      <div style={{ height: '100%', display: 'flex', minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <h4 style={{ margin: 0, fontSize: styles.fonts.size.md, color: styles.colors.text.light, whiteSpace: 'nowrap' }}>
                Traceability Matrix
              </h4>
              {prod.selectedContainer && (
                <span style={{
                  fontSize: styles.fonts.size.xs, color: accent,
                  border: `1px solid ${accent}`, borderRadius: '10px', padding: '2px 10px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {containerDisplayName(prod.selectedContainer)}
                </span>
              )}
            </div>
            {graph && counts.total > 0 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <CountPill status="GREEN" value={counts.GREEN} />
                <CountPill status="YELLOW" value={counts.YELLOW} />
                <CountPill status="RED" value={counts.RED} />
              </div>
            )}
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <CanvasBody
              prod={prod}
              loading={loading}
              error={error}
              graph={graph}
              matrixColumns={matrixColumns}
              adjacency={adjacency}
              hoveredKey={hoveredKey}
              onHover={setHoveredKey}
              selectedNode={selectedNode}
              onSelect={setSelectedNode}
            />
          </div>
        </div>

        {selectedNode && (
          <NodeInspector
            node={nodesByKey.get(selectedNode.key) || selectedNode}
            nodesByKey={nodesByKey}
            adjacency={adjacency}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </DashboardShell>
  );
}

function CanvasBody({ prod, loading, error, graph, matrixColumns, adjacency, hoveredKey, onHover, selectedNode, onSelect }) {
  const message = (text) => (
    <p style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.sm }}>{text}</p>
  );

  if (!prod.selectedContainer) return message('Select a Stage or Iteration to view the traceability matrix.');
  if (loading && !graph) return message('Loading traceability graph…');
  if (error) return message(`Could not load the traceability graph: ${error}`);
  if (!graph) return null;
  if (graph.counts.total === 0) {
    return message('No traceability documents indexed yet. Upload markdown named for a doc type (PRD, sys_arch, fmea, srs, verification, validation) into a stage or iteration.');
  }
  if (matrixColumns.every(column => column.nodes.length === 0)) {
    return message('No nodes match the current filters.');
  }

  return (
    <MatrixCanvas
      columns={matrixColumns}
      adjacency={adjacency}
      hoveredKey={hoveredKey}
      onHover={onHover}
      selectedKey={selectedNode ? selectedNode.key : null}
      onSelect={onSelect}
    />
  );
}

function CountPill({ status, value }) {
  const color = STATUS_COLORS[status];
  return (
    <span style={{
      fontSize: styles.fonts.size.xs, color,
      border: `1px solid ${color}`, borderRadius: '10px', padding: '2px 10px',
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  );
}

export default TraceabilityMatrix;
