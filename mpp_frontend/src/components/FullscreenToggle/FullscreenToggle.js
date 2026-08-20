import React, { createContext, useContext } from 'react';
import { FaExpand, FaCompress } from 'react-icons/fa';
import styles from '../../constants/styles';

/**
 * Collapses the left panel so the main area takes the whole width, and back.
 *
 * The layout shells own the state and publish it here; each view renders the button
 * itself, as the last item of the header row it already has. An earlier version pinned
 * the button to the shell's top-right corner absolutely, which put it straight on top of
 * whatever each view already keeps there -- the preview's Download button, the matrix's
 * status counts, and the node inspector's close button. Sharing the control but letting
 * each header place it is what actually keeps the three lined up, because it lands in
 * the same row as everything else rather than floating over it.
 *
 * It is not the browser's Fullscreen API: this reclaims the left pane inside the app
 * window, which is what the wide tables and the matrix actually need.
 */
const FullscreenContext = createContext(null);

export function FullscreenProvider({ value, children }) {
  return <FullscreenContext.Provider value={value}>{children}</FullscreenContext.Provider>;
}

function FullscreenToggle() {
  const context = useContext(FullscreenContext);
  // Rendered outside a shell (or in a view that has no collapsible panel): show nothing
  // rather than a button that cannot do anything.
  if (!context) return null;

  const { expanded, toggle } = context;
  const label = expanded ? 'Restore the left panel' : 'Expand to full width';
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={expanded}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px', padding: 0, flexShrink: 0,
        background: 'transparent',
        border: `1px solid ${styles.colors.border}`,
        borderRadius: styles.borderRadius.md,
        color: styles.colors.text.muted,
        cursor: 'pointer',
      }}
      onMouseOver={e => { e.currentTarget.style.background = styles.colors.darkAlt; e.currentTarget.style.color = styles.colors.text.light; }}
      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = styles.colors.text.muted; }}
    >
      {expanded ? <FaCompress size={13} /> : <FaExpand size={13} />}
    </button>
  );
}

export default FullscreenToggle;
