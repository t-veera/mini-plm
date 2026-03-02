import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import occtimportjs from 'occt-import-js';

function StepModel({ fileUrl, brightness, contrast, gridPosition, materialColor }) {
  const [geometry, setGeometry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const groupRef = useRef();
  const { camera } = useThree();

  useEffect(() => {
    let cancelled = false;

    async function loadStep() {
      try {
        setLoading(true);
        setError(null);

        // Initialize OpenCascade WASM
        const occt = await occtimportjs();

        // Fetch the STEP file
        const response = await fetch(fileUrl, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch STEP file: ' + response.status);

        const buffer = await response.arrayBuffer();
        const fileBuffer = new Uint8Array(buffer);

        // Parse the STEP file
        const result = occt.ReadStepFile(fileBuffer, null);

        if (cancelled) return;

        if (!result.success || result.meshes.length === 0) {
          throw new Error('Failed to parse STEP file or no geometry found');
        }

        // Convert to Three.js geometry
        const group = new THREE.Group();

        for (const mesh of result.meshes) {
          const geo = new THREE.BufferGeometry();

          // Set vertices
          geo.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(mesh.attributes.position.array, 3)
          );

          // Set normals if available
          if (mesh.attributes.normal) {
            geo.setAttribute(
              'normal',
              new THREE.Float32BufferAttribute(mesh.attributes.normal.array, 3)
            );
          } else {
            geo.computeVertexNormals();
          }

          // Set face indices
          if (mesh.index) {
            geo.setIndex(new THREE.BufferAttribute(mesh.index.array, 1));
          }

          // Get color from mesh or use default
          let color = materialColor;
          if (mesh.color) {
            color = new THREE.Color(mesh.color[0], mesh.color[1], mesh.color[2]);
          }

          const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.3,
            roughness: 0.5,
            side: THREE.DoubleSide,
          });

          const threeMesh = new THREE.Mesh(geo, material);
          group.add(threeMesh);
        }

        // Center and scale the model
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 ? 10 / maxDim : 1;

        group.position.sub(center);
        group.scale.setScalar(scale);

        // Position camera
        camera.position.set(0, 10, 15);
        camera.lookAt(0, 0, 0);

        if (!cancelled) {
          setGeometry(group);
          setLoading(false);
        }
      } catch (err) {
        console.error('STEP loading error:', err);
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    if (fileUrl) loadStep();

    return () => { cancelled = true; };
  }, [fileUrl, camera, materialColor]);

  if (loading) {
    return (
      <Html center>
        <div style={{ color: 'white', textAlign: 'center' }}>
          <div>Loading STEP file...</div>
          <div style={{ fontSize: '12px', marginTop: '5px', color: '#aaa' }}>
            Parsing with OpenCascade
          </div>
        </div>
      </Html>
    );
  }

  if (error) {
    return (
      <Html center>
        <div style={{ color: '#ff6b6b', textAlign: 'center' }}>
          <div>Error loading STEP file</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>{error}</div>
        </div>
      </Html>
    );
  }

  return (
    <>
      <ambientLight intensity={brightness * 0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={brightness * contrast}
        castShadow
      />
      <directionalLight
        position={[-5, 5, -5]}
        intensity={brightness * 0.3}
      />
      <gridHelper
        args={[20, 20, '#444', '#333']}
        position={[0, gridPosition, 0]}
      />
      <OrbitControls enableDamping dampingFactor={0.1} />
      {geometry && <primitive ref={groupRef} object={geometry} />}
    </>
  );
}

export default StepModel;
