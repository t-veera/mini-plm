import React, { useState, useEffect } from 'react';
import styles from '../../constants/styles';
import useLeftPaneWidth, { CONTAINER_RAIL_WIDTH } from '../../hooks/useLeftPaneWidth';

function ResizableColumn({ leftContent, rightContent }) {
  // Same shared width every dashboard uses, so the left pane doesn't jump when you
  // switch between Files and the other views.
  const [leftWidth, setLeftWidth] = useLeftPaneWidth();
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e) => { setIsResizing(true); e.preventDefault(); };

  useEffect(() => {
    function handleMouseMove(e) {
      if (!isResizing) return;
      setLeftWidth(e.clientX - CONTAINER_RAIL_WIDTH);
    }
    function handleMouseUp() { setIsResizing(false); }
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setLeftWidth]);

  return (
    <div className="d-flex flex-grow-1" style={{ height: '100%', overflow: 'hidden', padding: 0, margin: 0, maxWidth: '80%' }}>
      {/* No percentage cap here: the shared hook already clamps, and a % cap would make
          this pane narrower than the same pane on the other dashboards. */}
      <div style={{ width: `${leftWidth}px`, flexShrink: 0, height: '100%', overflowY: 'auto', padding: '0.75rem', borderRight: `1px solid ${styles.colors.border}` }}>
        {leftContent}
      </div>
      <div style={{ width: '10px', cursor: 'col-resize', background: 'transparent', position: 'relative', zIndex: 10 }} onMouseDown={handleMouseDown}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px', background: isResizing ? styles.colors.primary : 'transparent', transition: isResizing ? 'none' : 'background 0.2s' }} />
      </div>
      <div style={{ flexGrow: 1, height: '100%', overflowY: 'auto', overflowX: 'auto', padding: '0.75rem', width: 'auto', maxWidth: '60%' }}>
        {rightContent}
      </div>
    </div>
  );
}

export default ResizableColumn;
