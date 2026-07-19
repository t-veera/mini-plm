import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { StlViewer } from './StlViewer';
import StepModel from './StepViewer';
import DxfViewer from './DxfViewer';

// Studio-style backdrop, in the spirit of KiCad's 3D viewer: light at the
// horizon falling to dark at the floor, so a pale model still reads against it.
const BG = 'linear-gradient(180deg, #7c8ea1 0%, #4a5665 42%, #232a33 100%)';

// DXF entities are drawn flat in the XY plane, so the only view that reads is
// straight down +Z. Module-level so its identity stays stable across renders.
const DXF_VIEW = [0, 0, 1];

/*
 * Lives inside the Canvas and publishes an imperative camera API on `apiRef`
 * for the DOM toolbar to call. OrbitControls in each viewer is `makeDefault`,
 * so it is reachable here via useThree().
 */
function CameraRig({ apiRef, onZoomChange, initialView }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const scene = useThree((s) => s.scene);
  const homeDistRef = useRef(null);
  const lastSigRef = useRef(null);
  const userMovedRef = useRef(false);
  const tickRef = useRef(0);

  // Bounding box of actual geometry. Grids/helpers are LineSegments, not
  // meshes, so they stay out of it and cannot blow up the fit.
  const contentBox = useCallback(() => {
    const box = new THREE.Box3();
    scene.traverse((obj) => {
      if (obj.isMesh && obj.visible) box.expandByObject(obj);
    });
    return box.isEmpty() ? null : box;
  }, [scene]);

  const target = useCallback(() => (controls ? controls.target : new THREE.Vector3()), [controls]);

  const applyDistance = useCallback(
    (dir, dist, center) => {
      const c = center || target();
      camera.position.copy(c).add(dir.clone().normalize().multiplyScalar(dist));
      camera.lookAt(c);
      camera.updateProjectionMatrix();
      controls?.update();
    },
    [camera, controls, target]
  );

  const fit = useCallback(() => {
    const box = contentBox();
    if (!box) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (maxDim / 2 / Math.tan(fov / 2)) * 1.6;
    // On the very first fit, honour a caller-supplied orientation (DXF drawings
    // are flat in XY and only read face-on); after that, keep the user's angle.
    const firstFit = homeDistRef.current == null;
    const dir = firstFit && initialView
      ? new THREE.Vector3(...initialView)
      : camera.position.clone().sub(target());
    if (dir.lengthSq() < 1e-6) dir.set(1, 0.8, 1);
    if (controls) controls.target.copy(center);
    applyDistance(dir, dist, center);
    // A fitted view is the 100% reference point.
    homeDistRef.current = dist;
    onZoomChange?.(100);
  }, [contentBox, camera, controls, target, applyDistance, onZoomChange, initialView]);

  const zoom = useCallback(
    (factor) => {
      const c = target();
      const dir = camera.position.clone().sub(c);
      const dist = Math.max(0.01, dir.length() * factor);
      applyDistance(dir, dist, c);
    },
    [camera, target, applyDistance]
  );

  const setView = useCallback(
    (vec) => {
      const box = contentBox();
      const center = box ? box.getCenter(new THREE.Vector3()) : target();
      const dist = camera.position.distanceTo(target()) || 20;
      if (controls) controls.target.copy(center);
      applyDistance(new THREE.Vector3(...vec), dist, center);
    },
    [contentBox, camera, controls, target, applyDistance]
  );

  useEffect(() => {
    apiRef.current = { fit, zoom, setView };
  }, [apiRef, fit, zoom, setView]);

  // Report zoom for any interaction, including the mouse wheel.
  useEffect(() => {
    if (!controls || !onZoomChange) return undefined;
    const report = () => {
      const home = homeDistRef.current;
      if (!home) return;
      const dist = camera.position.distanceTo(controls.target) || home;
      onZoomChange(Math.round((home / dist) * 100));
    };
    controls.addEventListener('change', report);
    return () => controls.removeEventListener('change', report);
  }, [controls, camera, onZoomChange]);

  // Note the moment the user takes over, so an auto-fit never yanks the camera
  // out from under them.
  useEffect(() => {
    if (!controls) return undefined;
    const onStart = () => { userMovedRef.current = true; };
    controls.addEventListener('start', onStart);
    return () => controls.removeEventListener('start', onStart);
  }, [controls]);

  /*
   * Each loader shows a placeholder mesh (a torus) while fetching, so fitting
   * the first geometry we see would frame the spinner, not the model. Instead,
   * watch the content bounds and re-fit whenever they change — the placeholder
   * gets fitted, then the real model replaces it and gets fitted in turn. Once
   * the user moves the camera we stop, and `Fit` remains available.
   */
  useFrame(() => {
    if (userMovedRef.current) return;
    tickRef.current += 1;
    if (tickRef.current % 10 !== 0) return; // a Box3 traverse every frame is wasteful
    const box = contentBox();
    if (!box) return;
    const r = (n) => Math.round(n * 1000) / 1000;
    const sig = `${r(box.min.x)},${r(box.min.y)},${r(box.min.z)},${r(box.max.x)},${r(box.max.y)},${r(box.max.z)}`;
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;
    fit();
  });

  return null;
}

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

function Model3DPreview({ fileUrl }) {
  const [brightness, setBrightness] = useState(1.5);
  const [contrast, setContrast] = useState(1.2);
  const [gridPosition, setGridPosition] = useState(-2);
  const [materialColor, setMaterialColor] = useState('#cccccc');
  const [showLighting, setShowLighting] = useState(false);
  const [zoomPct, setZoomPct] = useState(100);
  const [fileType, setFileType] = useState('stl');
  const [key, setKey] = useState(0);
  const [lastFileUrl, setLastFileUrl] = useState('');
  const apiRef = useRef(null);

  useEffect(() => {
    if (fileUrl !== lastFileUrl) {
      setKey(Date.now());
      setLastFileUrl(fileUrl);
    }
    if (fileUrl) {
      const lowerUrl = fileUrl.toLowerCase();
      if (lowerUrl.endsWith('.dxf')) { setFileType('dxf'); setMaterialColor('#4285F4'); }
      else if (lowerUrl.endsWith('.stp') || lowerUrl.endsWith('.step')) { setFileType('step'); setMaterialColor('#cccccc'); }
      else { setFileType('stl'); setMaterialColor('#cccccc'); }
    }
  }, [fileUrl, lastFileUrl]);

  const fallback = <Html center><div style={{ color: 'white', textAlign: 'center' }}>Loading...</div></Html>;
  const canvasStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'transparent' };
  const rig = (initialView) => <CameraRig apiRef={apiRef} onZoomChange={setZoomPct} initialView={initialView} />;

  const renderViewer = () => {
    if (!fileUrl) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>No file selected</div>;

    if (fileType === 'dxf') return (
      <Canvas key={`dxf-${key}`} style={canvasStyle} camera={{ position: [0, 0, 20], fov: 40 }}>
        <Suspense fallback={fallback}><DxfViewer key={`dxf-viewer-${key}`} fileUrl={fileUrl} brightness={brightness} contrast={contrast} gridPosition={gridPosition} materialColor={materialColor} /></Suspense>
        {rig(DXF_VIEW)}
      </Canvas>
    );

    if (fileType === 'step') return (
      <Canvas key={`step-${key}`} shadows style={canvasStyle} camera={{ position: [0, 10, 15], fov: 40 }}>
        <Suspense fallback={fallback}><StepModel key={`step-viewer-${key}`} fileUrl={fileUrl} brightness={brightness} contrast={contrast} gridPosition={gridPosition} materialColor={materialColor} /></Suspense>
        {rig()}
      </Canvas>
    );

    return (
      <Canvas key={`stl-${key}`} shadows style={canvasStyle} camera={{ position: [0, 10, 15], fov: 40 }}>
        <Suspense fallback={fallback}><StlViewer key={`stl-viewer-${key}`} fileUrl={fileUrl} brightness={brightness} contrast={contrast} gridPosition={gridPosition} materialColor={materialColor} /></Suspense>
        {rig()}
      </Canvas>
    );
  };

  const view = (vec) => () => apiRef.current?.setView(vec);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '100%', height: '100%', minHeight: '320px', borderRadius: '8px', border: '1px solid #888', overflow: 'hidden', background: BG }}>
      {renderViewer()}

      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 20, display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(20,22,25,0.82)', padding: '5px 8px', borderRadius: '8px' }}>
        <button style={barBtn} onClick={() => apiRef.current?.zoom(1 / 0.8)} title="Zoom out">−</button>
        <span style={{ color: '#ccc', fontSize: '0.75rem', width: 42, textAlign: 'center' }}>{zoomPct}%</span>
        <button style={barBtn} onClick={() => apiRef.current?.zoom(0.8)} title="Zoom in">＋</button>
        <button style={barBtn} onClick={() => apiRef.current?.fit()} title="Fit model to view">Fit</button>
      </div>

      <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 20, display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(20,22,25,0.82)', padding: '5px 8px', borderRadius: '8px' }}>
        {fileType === 'dxf' ? (
          // A DXF is flat in XY, so solid-model presets are meaningless here:
          // "Top" would show the drawing edge-on as a line.
          <button style={barBtn} onClick={view(DXF_VIEW)} title="Look straight at the drawing">Face</button>
        ) : (
          <>
            <button style={barBtn} onClick={view([0, 1, 0.0001])} title="Top view">Top</button>
            <button style={barBtn} onClick={view([0, 0, 1])} title="Front view">Front</button>
            <button style={barBtn} onClick={view([1, 0, 0])} title="Right view">Right</button>
            <button style={barBtn} onClick={view([1, 0.8, 1])} title="Isometric view">Iso</button>
          </>
        )}
        <button style={{ ...barBtn, background: showLighting ? '#3a4048' : barBtn.background }} onClick={() => setShowLighting((s) => !s)} title="Lighting options">☀</button>
      </div>

      {showLighting && (
        <div style={{ position: 'absolute', bottom: 48, right: 8, zIndex: 20, background: 'rgba(20,22,25,0.9)', padding: '10px 12px', borderRadius: '8px', color: '#ddd', fontSize: '0.75rem', width: '190px' }}>
          <div className="mb-2">
            <label className="d-block mb-1">Brightness: {brightness.toFixed(1)}</label>
            <input type="range" min="0.5" max="3" step="0.1" value={brightness} onChange={(e) => setBrightness(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div className="mb-2">
            <label className="d-block mb-1">Contrast: {contrast.toFixed(1)}</label>
            <input type="range" min="0.5" max="2" step="0.1" value={contrast} onChange={(e) => setContrast(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label className="d-block mb-1">Grid height: {gridPosition.toFixed(1)}</label>
            <input type="range" min="-5" max="0" step="0.5" value={gridPosition} onChange={(e) => setGridPosition(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Model3DPreview;
