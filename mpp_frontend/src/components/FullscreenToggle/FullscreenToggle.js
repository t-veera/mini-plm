import React from 'react';
import { FaExpand, FaCompress } from 'react-icons/fa';
import styles from '../../constants/styles';

/**
 * Collapses the left panel so the main area takes the whole width, and back.
 *
 * Both layout shells render this at the same absolute top-right corner, so the control
 * does not move when switching between Files, BOM and the matrix -- the position is
 * fixed here rather than at each call site precisely so the three cannot drift apart.
 *
 * It is not the browser's Fullscreen API: this reclaims the left pane inside the app
 * window, which is what the wide tables and the matrix actually need.
 */
function FullscreenToggle({ expanded, onToggle }) {
  const label = expanded ? 'Restore the left panel' : 'Expand to full width';
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-pressed={expanded}
      style={{
        position: 'absolute', top: '8px', right: '8px', zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px', padding: 0,
        background: styles.colors.darkAlt,
        border: `1px solid ${styles.colors.border}`,
        borderRadius: styles.borderRadius.md,
        color: styles.colors.text.muted,
        cursor: 'pointer',
        transition: 'color 0.12s ease, border-color 0.12s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = styles.colors.text.light; }}
      onMouseLeave={e => { e.currentTarget.style.color = styles.colors.text.muted; }}
    >
      {expanded ? <FaCompress size={13} /> : <FaExpand size={13} />}
    </button>
  );
}

export default FullscreenToggle;
