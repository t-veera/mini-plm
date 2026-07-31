import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  FaSearchPlus, FaSearchMinus, FaUndo, FaRedo, FaExpand, FaCompress,
} from 'react-icons/fa';
import styles from '../../constants/styles';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.2;

// Image preview with zoom (buttons + ctrl/⌘ + wheel), 90° rotation, drag-to-pan,
// fit-to-view and 100% reset. Kept self-contained so App only has to render <ImageViewer />.
export default function ImageViewer({ fileUrl, name }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // degrees, multiple of 90
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [fitMode, setFitMode] = useState(true); // true = auto fit to container
  const [dragging, setDragging] = useState(false);

  const containerRef = useRef(null);
  const dragStart = useRef(null);

  const reset = useCallback(() => {
    setZoom(1); setRotation(0); setOffset({ x: 0, y: 0 }); setFitMode(false);
  }, []);

  const fit = useCallback(() => {
    setZoom(1); setOffset({ x: 0, y: 0 }); setFitMode(true);
  }, []);

  // Reset view whenever the image source changes.
  useEffect(() => { fit(); setRotation(0); }, [fileUrl, fit]);

  const applyZoom = useCallback((factor) => {
    setFitMode(false);
    setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }, []);

  const rotate = useCallback((dir) => {
    setRotation(r => (r + dir * 90 + 360) % 360);
  }, []);

  // Native non-passive wheel listener so preventDefault actually cancels the browser's
  // page zoom on ctrl/⌘ + wheel (trackpad pinch). React's onWheel is passive and can't
  // cancel it, which is why pinching was zooming the whole page too — here only the
  // image should zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheelNative = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return; // plain scroll passes through
      e.preventDefault();
      applyZoom(e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
    };
    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', onWheelNative);
  }, [applyZoom]);

  const onMouseDown = (e) => {
    if (fitMode && zoom === 1) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onMouseMove = (e) => {
    if (!dragging || !dragStart.current) return;
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const endDrag = () => { setDragging(false); dragStart.current = null; };

  const btn = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '30px', height: '28px', background: 'transparent', color: styles.colors.text.muted,
    border: `1px solid ${styles.colors.border}`, borderRadius: styles.borderRadius.md, cursor: 'pointer',
  };
  const ToolBtn = ({ title, onClick, children, active }) => (
    <button
      title={title}
      onClick={onClick}
      style={{ ...btn, ...(active ? { color: styles.colors.text.light, background: styles.colors.darkAlt } : {}) }}
      onMouseOver={e => { e.currentTarget.style.background = styles.colors.darkAlt; e.currentTarget.style.color = styles.colors.text.light; }}
      onMouseOut={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = styles.colors.text.muted; } }}
    >{children}</button>
  );

  // When rotated 90/270, swap the fit dimension so a portrait render still fits.
  const swapped = rotation === 90 || rotation === 270;
  const imgStyle = fitMode
    ? {
        maxWidth: swapped ? 'none' : '100%',
        maxHeight: swapped ? 'none' : '100%',
        // in fit mode we let the browser scale; rotation handled via transform
        transform: `rotate(${rotation}deg)`,
        objectFit: 'contain',
        ...(swapped ? { maxHeight: '100%', maxWidth: '100%' } : {}),
      }
    : {
        transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
        transformOrigin: 'center center',
        maxWidth: 'none',
        maxHeight: 'none',
      };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: '8px', border: `1px solid ${styles.colors.border}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: styles.colors.dark, borderBottom: `1px solid ${styles.colors.border}`, flexShrink: 0 }}>
        <ToolBtn title="Zoom out (Ctrl + scroll)" onClick={() => applyZoom(1 / ZOOM_STEP)}><FaSearchMinus size={12} /></ToolBtn>
        <span style={{ minWidth: '46px', textAlign: 'center', color: styles.colors.text.muted, fontSize: styles.fonts.size.xs, cursor: 'pointer' }}
          title="Reset to 100%" onClick={reset}>
          {Math.round((fitMode ? 1 : zoom) * 100)}%
        </span>
        <ToolBtn title="Zoom in (Ctrl + scroll)" onClick={() => applyZoom(ZOOM_STEP)}><FaSearchPlus size={12} /></ToolBtn>
        <div style={{ width: '1px', height: '18px', background: styles.colors.border, margin: '0 2px' }} />
        <ToolBtn title="Rotate left" onClick={() => rotate(-1)}><FaUndo size={12} /></ToolBtn>
        <ToolBtn title="Rotate right" onClick={() => rotate(1)}><FaRedo size={12} /></ToolBtn>
        <div style={{ width: '1px', height: '18px', background: styles.colors.border, margin: '0 2px' }} />
        <ToolBtn title="Fit to view" onClick={fit} active={fitMode}><FaCompress size={12} /></ToolBtn>
        <ToolBtn title="Actual size (100%)" onClick={reset}><FaExpand size={12} /></ToolBtn>
      </div>
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onDoubleClick={() => (fitMode ? applyZoom(ZOOM_STEP * ZOOM_STEP) : fit())}
        style={{
          flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', background: styles.colors.canvas, position: 'relative',
          touchAction: 'none', overscrollBehavior: 'contain',
          cursor: dragging ? 'grabbing' : (fitMode && zoom === 1 ? 'default' : 'grab'),
        }}
      >
        <img
          src={fileUrl}
          alt={name}
          draggable={false}
          style={{ userSelect: 'none', transition: dragging ? 'none' : 'transform 0.12s ease-out', ...imgStyle }}
        />
      </div>
    </div>
  );
}
