import React, { useState, useEffect } from 'react';
import styles from '../../constants/styles';
import useLeftPaneWidth, { CONTAINER_RAIL_WIDTH } from '../../hooks/useLeftPaneWidth';
import FullscreenToggle from '../FullscreenToggle/FullscreenToggle';

/**
 * Shared dashboard layout: a resizable left panel (toolbar + that dashboard's controls)
 * beside a main area. Used by every dashboard so the toolbar and left panel sit in the
 * same place and resize the same way across views.
 *
 * The width comes from useLeftPaneWidth, which every pane shares - resize it here and
 * the Files view matches. Unlike ResizableColumn the main area takes all remaining
 * width, because dashboards need it for wide tables.
 */
function DashboardShell({ left, children }) {
  const [width, setWidth] = useLeftPaneWidth();
  const [isResizing, setIsResizing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isResizing) return undefined;
    function handleMouseMove(e) {
      setWidth(e.clientX - CONTAINER_RAIL_WIDTH);
    }
    function handleMouseUp() { setIsResizing(false); }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setWidth]);

  return (
    <div className="d-flex" style={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
      {!expanded && (
        <>
          <div style={{ width: `${width}px`, flexShrink: 0, height: '100%', borderRight: `1px solid ${styles.colors.border}` }}>
            <div style={{ height: '100%', overflowY: 'auto', padding: '0.75rem' }}>{left}</div>
          </div>

          <div
            onMouseDown={e => { setIsResizing(true); e.preventDefault(); }}
            style={{ width: '10px', flexShrink: 0, cursor: 'col-resize', position: 'relative', zIndex: 10 }}
          >
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px',
              background: isResizing ? styles.colors.primary : 'transparent',
              transition: isResizing ? 'none' : 'background 0.2s',
            }} />
          </div>
        </>
      )}

      <div style={{ flexGrow: 1, minWidth: 0, height: '100%' }}>{children}</div>
      <FullscreenToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
    </div>
  );
}

export default DashboardShell;
