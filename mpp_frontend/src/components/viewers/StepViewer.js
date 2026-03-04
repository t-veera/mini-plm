import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import occtimportjs from 'occt-import-js';

function getCsrfToken() {
  const match = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
  return match ? match.split('=')[1] : '';
}

function StepModel({ fileUrl, brightness, contrast, gridPosition, materialColor }) {
  const [geometry, setGeometry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Initializing...');
  const groupRef = useRef();
  const { camera } = useThree();

  useEffect(() => {
    let cancelled = false;

    async function loadStep() {
      try {
        setLoading(true);
        setError(null);

        setStatus('Loading OpenCascade WASM...');
        const occt = await occtimportjs({
          locateFile: (name) => {
            if (name.endsWith('.wasm')) {
              return '/occt-import-js.wasm';
            }
            return name;
          }
        });

        setStatus('Fetching STEP file...');
        const response = await fetch(fileUrl, {
          credentials: 'include',
          headers: {
            'X-CSRFToken': getCsrfToken(),
          }
        });

        if (!response.ok) throw new Error('Fetch failed: ' + response.status);

        const buffer = await response.arrayBuffer();
        const fileBuffer = new Uint8Array(buffer);

        // Check if we got HTML instead of a STEP file
        const firstBytes = new TextDecoder().decode(fileBuffer.slice(0, 50));
        console.log('STEP file first 50 bytes:', firstBytes);
        if (firstBytes.includes('<!DOCTYPE') || firstBytes.includes('<html')) {
          throw new Error('Got HTML instead of STEP file - authentication issue');
        }

        setStatus('Parsing STEP file...');
        console.log('STEP file size:', fileBuffer.length, 'bytes');
        console.log('STEP file starts with:', new TextDecoder().decode(fileBuffer.slice(0, 100)));
        
        const result = occt.ReadStepFile(fileBuffer);
        console.log('STEP parse full result keys:', result ? Object.keys(result) : 'null');
        console.log('STEP parse meshes:', result?.meshes?.length);
        if (result?.meshes?.length > 0) {
          const m = result.meshes[0];
          console.log('First mesh keys:', Object.keys(m));
          console.log('First mesh attributes:', m.attributes ? Object.keys(m.attributes) : 'none');
        }
        if (result?.error) console.log('STEP parse error:', result.error);

        if (cancelled) return;

        const meshes = result?.meshes || [];
        if (meshes.length === 0) {
          throw new Error('No geometry found in STEP file (meshes: ' + meshes.length + ')');
        }

        setStatus('Building 3D model (' + meshes.length + ' meshes)...');
        const group = new THREE.Group();

        for (const mesh of meshes) {
          const geo = new THREE.BufferGeometry();

          const posArray = mesh.attributes?.position?.array;
          if (!posArray || posArray.length === 0) continue;

          geo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));

          if (mesh.attributes?.normal?.array) {
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.attributes.normal.array, 3));
          } else {
            geo.computeVertexNormals();
          }

          if (mesh.index?.array) {
            geo.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.index.array), 1));
          }

          let color = materialColor;
          if (mesh.color && mesh.color.length >= 3) {
            color = new THREE.Color(mesh.color[0], mesh.color[1], mesh.color[2]);
          }

          const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.3,
            roughness: 0.5,
            side: THREE.DoubleSide,
          });

          group.add(new THREE.Mesh(geo, material));
        }

        if (group.children.length === 0) {
          throw new Error('Could not create any 3D meshes from parsed data');
        }

        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 ? 10 / maxDim : 1;

        group.position.sub(center);
        group.scale.setScalar(scale);

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
        <div style={{ color: 'white', textAlign: 'center', maxWidth: '300px' }}>
          <div>Loading STEP file...</div>
          <div style={{ fontSize: '12px', marginTop: '5px', color: '#aaa' }}>{status}</div>
        </div>
      </Html>
    );
  }

  if (error) {
    return (
      <Html center>
        <div style={{ color: '#ff6b6b', textAlign: 'center', maxWidth: '300px' }}>
          <div>Error loading STEP file</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>{error}</div>
        </div>
      </Html>
    );
  }

  return (
    <>
      <ambientLight intensity={brightness * 0.5} />
      <directionalLight position={[10, 10, 10]} intensity={brightness * contrast} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={brightness * 0.3} />
      <gridHelper args={[20, 20, '#444', '#333']} position={[0, gridPosition, 0]} />
      <OrbitControls enableDamping dampingFactor={0.1} />
      {geometry && <primitive ref={groupRef} object={geometry} />}
    </>
  );
}

export default StepModel;
