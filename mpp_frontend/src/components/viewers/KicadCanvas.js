import React, { useState, useEffect, useRef, useCallback } from 'react';
import authenticatedFetch from '../../utils/authenticatedFetch';

/*
 * Shared pan/zoom canvas for KiCad previews (schematic + board).
 *
 * Fetches the file, runs the supplied `parse` renderer to SVG, and presents it
 * in a drag-to-pan / wheel-to-zoom / fit canvas. Falls back gracefully to a
 * readable message plus the raw source for anything it cannot draw.
 *
 * Props:
 *   fileUrl      - URL of the .kicad_sch / .kicad_pcb file
 *   parse        - (text) => { ok, inner, viewBox, stats, background, ... }
 *   kind         - noun for messages, e.g. "schematic" or "board"
 *   renderStats  - (stats) => node, shown in the toolbar
 */
export default function KicadCanvas({ fileUrl, parse, kind = 'file', renderStats }) {
  const [state, setState] = useState({ status: 'loading' }); // loading | ready | error
  const [showSource, setShowSource] = useState(false);
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const viewRef = useRef(null); // current viewBox {x,y,w,h}
  const homeRef = useRef(null); // initial (fit) viewBox
  const [, forceTick] = useState(0);

  // ---- load + render ----
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    if (!fileUrl) return undefined;
    authenticatedFetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        let result;
        try {
          result = parse(text);
        } catch (e) {
          result = { ok: false, reason: `Renderer error: ${e.message}`, raw: text };
        }
        if (result.ok) {
          homeRef.current = { ...result.viewBox };
          viewRef.current = { ...result.viewBox };
          setState({ status: 'ready', ...result, raw: text });
        } else {
          setState({ status: 'error', ...result });
        }
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', reason: `Could not load file: ${err.message}` });
      });
    return () => {
      cancelled = true;
    };
  }, [fileUrl, parse]);

  const applyView = useCallback(() => {
    const svg = svgRef.current;
    const v = viewRef.current;
    if (svg && v) svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
    forceTick((t) => t + 1);
  }, []);

  const resetView = useCallback(() => {
    if (!homeRef.current) return;
    viewRef.current = { ...homeRef.current };
    applyView();
  }, [applyView]);

  // ---- wheel zoom (non-passive so we can preventDefault) ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el || state.status !== 'ready') return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const svg = svgRef.current;
      const v = viewRef.current;
      if (!svg || !v) return;
      const rect = svg.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      const factor = e.deltaY < 0 ? 0.85 : 1 / 0.85;
      const newW = v.w * factor;
      const newH = v.h * factor;
      v.x += (v.w - newW) * relX;
      v.y += (v.h - newH) * relY;
      v.w = newW;
      v.h = newH;
      applyView();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [state.status, applyView]);

  // ---- drag to pan ----
  const dragRef = useRef(null);
  const onPointerDown = (e) => {
    if (state.status !== 'ready') return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      view: { ...viewRef.current },
      pxPerUnitX: rect.width / viewRef.current.w,
      pxPerUnitY: rect.height / viewRef.current.h,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.pxPerUnitX;
    const dy = (e.clientY - d.startY) / d.pxPerUnitY;
    viewRef.current = { ...viewRef.current, x: d.view.x - dx, y: d.view.y - dy };
    applyView();
  };
  const onPointerUp = (e) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const zoomBy = (factor) => {
    const v = viewRef.current;
    if (!v) return;
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    v.w *= factor;
    v.h *= factor;
    v.x = cx - v.w / 2;
    v.y = cy - v.h / 2;
    applyView();
  };

  const zoomPct =
    homeRef.current && viewRef.current ? Math.round((homeRef.current.w / viewRef.current.w) * 100) : 100;

  const barBtn = {
    background: '#2a2d31',
    color: '#ddd',
    border: '1px solid #444',
    borderRadius: '6px',
    padding: '3px 10px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    lineHeight: 1.4,
  };

  const shell = (children) => (
    <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'hidden' }}>
      {children}
    </div>
  );

  if (state.status === 'loading') {
    return shell(<p className="text-muted p-3">Loading {kind}…</p>);
  }

  if (state.status === 'error') {
    return shell(
      <div style={{ padding: '1rem', color: '#ddd', background: '#1b1e22', minHeight: '600px' }}>
        <p style={{ color: state.legacy ? '#e0b040' : '#e06060', fontWeight: 600 }}>
          {state.legacy ? `⚠ Legacy ${kind} format` : `⚠ Cannot render ${kind}`}
        </p>
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>{state.reason}</p>
        {state.raw != null && (
          <>
            <button style={{ ...barBtn, marginTop: '8px' }} onClick={() => setShowSource((s) => !s)}>
              {showSource ? 'Hide source' : 'View source'}
            </button>
            {showSource && (
              <pre
                style={{
                  marginTop: '10px',
                  maxHeight: '460px',
                  overflow: 'auto',
                  background: '#0e1013',
                  color: '#b8c0c8',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  whiteSpace: 'pre',
                }}
              >
                {state.raw.slice(0, 200000)}
              </pre>
            )}
          </>
        )}
      </div>
    );
  }

  // ready
  const v = viewRef.current;
  const bg = state.background || '#ffffff';
  return shell(
    <div style={{ background: bg, position: 'relative', height: '600px' }}>
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
          background: 'rgba(20,22,25,0.82)',
          padding: '5px 8px',
          borderRadius: '8px',
        }}
      >
        {renderStats && (
          <span style={{ color: '#9aa', fontSize: '0.75rem', marginRight: 2 }}>{renderStats(state.stats || {})}</span>
        )}
        <button style={barBtn} onClick={() => zoomBy(1 / 0.8)} title="Zoom out">−</button>
        <span style={{ color: '#ccc', fontSize: '0.75rem', width: 42, textAlign: 'center' }}>{zoomPct}%</span>
        <button style={barBtn} onClick={() => zoomBy(0.8)} title="Zoom in">＋</button>
        <button style={barBtn} onClick={resetView} title="Fit to view">Fit</button>
      </div>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          cursor: dragRef.current ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={resetView}
      >
        <svg
          ref={svgRef}
          viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', touchAction: 'none' }}
        >
          <rect x={v.x - v.w} y={v.y - v.h} width={v.w * 3} height={v.h * 3} fill={bg} />
          <g dangerouslySetInnerHTML={{ __html: state.inner }} />
        </svg>
      </div>
    </div>
  );
}
