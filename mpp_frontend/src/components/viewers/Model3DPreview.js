import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { StlViewer, StlViewerControls } from './StlViewer';
import StepModel from './StepViewer';
import DxfViewer from './DxfViewer';

function Model3DPreview({ fileUrl }) {
  const [brightness, setBrightness] = useState(1.5);
  const [contrast, setContrast] = useState(1.2);
  const [gridPosition, setGridPosition] = useState(-2);
  const [materialColor, setMaterialColor] = useState('#cccccc');
  const [showControls, setShowControls] = useState(false);
  const [fileType, setFileType] = useState('stl');
  const [key, setKey] = useState(0);
  const [lastFileUrl, setLastFileUrl] = useState('');

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

  const renderViewer = () => {
    if (!fileUrl) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>No file selected</div>;

    if (fileType === 'dxf') return (
      <Canvas key={`dxf-${key}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#222' }} camera={{ position: [0, 0, 20], fov: 40 }}>
        <Suspense fallback={fallback}><DxfViewer key={`dxf-viewer-${key}`} fileUrl={fileUrl} brightness={brightness} contrast={contrast} gridPosition={gridPosition} materialColor={materialColor} /></Suspense>
      </Canvas>
    );

    if (fileType === 'step') return (
      <Canvas key={`step-${key}`} shadows style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#222' }} camera={{ position: [0, 10, 15], fov: 40 }}>
        <Suspense fallback={fallback}><StepModel key={`step-viewer-${key}`} fileUrl={fileUrl} brightness={brightness} contrast={contrast} gridPosition={gridPosition} materialColor={materialColor} /></Suspense>
      </Canvas>
    );

    return (
      <Canvas key={`stl-${key}`} shadows style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#222' }} camera={{ position: [0, 10, 15], fov: 40 }}>
        <Suspense fallback={fallback}><StlViewer key={`stl-viewer-${key}`} fileUrl={fileUrl} brightness={brightness} contrast={contrast} gridPosition={gridPosition} materialColor={materialColor} /></Suspense>
      </Canvas>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '100%', height: '600px', border: '1px solid #888', overflow: 'hidden' }}>
      {renderViewer()}
      <StlViewerControls
        brightness={brightness} setBrightness={setBrightness}
        contrast={contrast} setContrast={setContrast}
        gridPosition={gridPosition} setGridPosition={setGridPosition}
        showControls={showControls} setShowControls={setShowControls}
      />
    </div>
  );
}

export default Model3DPreview;
