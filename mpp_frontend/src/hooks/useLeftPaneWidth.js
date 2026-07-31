import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'mini-plm-left-pane-width';

export const LEFT_PANE_MIN = 230;
export const LEFT_PANE_DEFAULT = 340;

// The fixed stage/iteration rail sits to the left of every pane, so a drag position
// has to be measured from its right edge for all dashboards to agree.
export const CONTAINER_RAIL_WIDTH = 52;

function leftPaneMax() {
  return Math.max(LEFT_PANE_MIN, window.innerWidth - 420);
}

function clamp(px) {
  return Math.min(Math.max(px, LEFT_PANE_MIN), leftPaneMax());
}

/**
 * One left-pane width shared by every dashboard.
 *
 * Persisted to localStorage so the pane keeps its size when you switch between Files,
 * BOM, Traceability and back, and across reloads. Only one dashboard is mounted at a
 * time, so each read on mount picks up whatever the last drag set - dragging the
 * divider anywhere resizes the pane everywhere.
 */
export default function useLeftPaneWidth() {
  const [width, setWidthState] = useState(() => {
    const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    return clamp(Number.isFinite(saved) ? saved : LEFT_PANE_DEFAULT);
  });

  const setWidth = useCallback((px) => setWidthState(clamp(px)), []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  return [width, setWidth];
}
