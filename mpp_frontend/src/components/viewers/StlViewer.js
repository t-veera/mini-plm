import React, { useState, useEffect } from 'react';
import { STLLoader } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export function StlViewer({ fileUrl, brightness = 1.5, contrast = 1.2, gridPosition = -2, materialColor = '#ccc' }) {
  const [geometry, setGeometry] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!fileUrl) { setError(new Error('No file URL provided')); setLoading(false); return; }
    setLoading(true); setError(null); setGeometry(null); setLoadingProgress(0);
    const loader = new STLLoader();
    try {
      loader.load(
        fileUrl,
        (loadedGeometry) => {
          loadedGeometry.center();
          loadedGeometry.computeBoundingBox();
          setGeometry(loadedGeometry);
          setLoading(false);
          setLoadingProgress(100);
        },
        (xhr) => { if (xhr.lengthComputable) setLoadingProgress(Math.round((xhr.loaded / xhr.total) * 100)); },
        (err) => { setError(err); setLoading(false); }
      );
    } catch (err) { setError(err); setLoading(false); }
    return () => { if (geometry) geometry.dispose(); };
  }, [fileUrl]);

  const ThreeScene = () => {
    if (loading) return (
      <>
        <mesh position={[0, 0, 0]} rotation={[0, loadingProgress / 100 * Math.PI * 2, 0]}>
          <torusGeometry args={[2, 0.5, 16, 32]} />
          <meshStandardMaterial color="#4285F4" />
        </mesh>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />
      </>
    );

    if (error || !geometry) return (
      <>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3, 3, 3]} />
          <meshStandardMaterial color={error ? '#FF5252' : '#AAAAAA'} />
        </mesh>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />
      </>
    );

    const size = geometry.boundingBox?.getSize(new THREE.Vector3()).length() || 1;
    const scaleFactor = 10 / size;

    return (
      <>
        <gridHelper args={[50, 50, '#5a6675', '#39424e']} position={[0, gridPosition, 0]} />
        <directionalLight castShadow position={[10, 15, 10]} intensity={brightness} />
        <directionalLight position={[-10, 10, -10]} intensity={brightness * 0.5} />
        <ambientLight intensity={0.4} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[scaleFactor, scaleFactor, scaleFactor]} castShadow receiveShadow>
          <primitive object={geometry} attach="geometry" />
          <meshStandardMaterial color={materialColor} roughness={0.5} metalness={0.1} emissiveIntensity={contrast - 1} wireframe={false} />
        </mesh>
        <OrbitControls makeDefault enableDamping dampingFactor={0.12} enableZoom={true} enableRotate={true} enablePan={true} zoomSpeed={1.2} rotateSpeed={1.0} panSpeed={0.8} />
      </>
    );
  };

  return <group><ThreeScene /></group>;
}

