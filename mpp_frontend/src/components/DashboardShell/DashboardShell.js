import React, { useState, useEffect } from 'react';
import styles from '../../constants/styles';

const MIN_WIDTH = 230;
const CONTAINER_RAIL_WIDTH = 52; // the fixed stage/iteration rail to the left of us

/**
 * Shared dashboard layout: a resizable left panel (toolbar + that dashboard's controls)
 * beside a main area. Used by every dashboard so the toolbar and left panel sit in the
 * same place and resize the same way across views.
 *
 * Unlike ResizableColumn (used by the Files/preview split, which caps the right side at
 * 60%), the main area here takes all remaining width — dashboards need it for wide tables.
 */
function DashboardShell({ left, children, defaultWidth = 340 }) {
  const [width, setWidth] = useState(() =>
    Math.max(MIN_WIDTH, Math.min(defaultWidth, window.innerWidth * 0.28)));
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return undefined;
    function handleMouseMove(e) {
      const max = Math.max(MIN_WIDTH, window.innerWidth - 420);
      const next = e.clientX - CONTAINER_RAIL_WIDTH;
      if (next >= MIN_WIDTH && next <= max) setWidth(next);
    }
    function handleMouseUp() { setIsResizing(false); }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="d-flex" style={{ height: '100%', overflow: 'hidden' }}>
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

      <div style={{ flexGrow: 1, minWidth: 0, height: '100%' }}>{children}</div>
    </div>
  );
}

export default DashboardShell;
