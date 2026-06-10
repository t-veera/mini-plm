import React, { useState, useEffect } from 'react';
import styles from '../../constants/styles';

function ResizableColumn({ leftContent, rightContent }) {
  const [leftWidth, setLeftWidth] = useState(Math.min(500, window.innerWidth * 0.4));
  const [isResizing, setIsResizing] = useState(false);
  const minWidth = 200;
  const maxWidth = Math.max(300, Math.min(window.innerWidth - 300, window.innerWidth * 0.6));

  const handleMouseDown = (e) => { setIsResizing(true); e.preventDefault(); };

  useEffect(() => {
    function handleMouseMove(e) {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) setLeftWidth(newWidth);
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
  }, [isResizing]);

  return (
    <div className="d-flex flex-grow-1" style={{ height: '100%', overflow: 'hidden', padding: 0, margin: 0, maxWidth: '80%' }}>
      <div style={{ width: `${leftWidth}px`, flexShrink: 0, height: '100%', overflowY: 'auto', padding: '0.75rem', borderRight: `1px solid ${styles.colors.border}`, maxWidth: '40%' }}>
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
