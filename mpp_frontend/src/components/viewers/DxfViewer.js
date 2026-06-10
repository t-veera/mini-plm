import React, { useState, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import DxfParser from 'dxf-parser';

function DxfViewer({ fileUrl, brightness = 1.5, contrast = 1.2, gridPosition = -2, materialColor = '#4285F4' }) {
  const [dxfEntities, setDxfEntities] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    if (!fileUrl) { setError(new Error('No file URL provided')); setLoading(false); return; }
    setLoading(true); setError(null); setDxfEntities(null); setDebugInfo(null);

    fetch(`${fileUrl}?t=${Date.now()}`, { method: 'GET', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`); return r.text(); })
      .then(dxfString => {
        if (!dxfString.trim()) throw new Error('DXF file is empty');
        const parser = new DxfParser();
        const dxf = parser.parseSync(dxfString);
        if (dxf.entities) {
          const entityTypes = {};
          dxf.entities.forEach((entity, index) => {
            if (!entityTypes[entity.type]) entityTypes[entity.type] = [];
            entityTypes[entity.type].push({ index, layer: entity.layer, color: entity.colorNumber, entity });
          });
          setDebugInfo({ totalEntities: dxf.entities.length, entityTypes: Object.keys(entityTypes).map(type => ({ type, count: entityTypes[type].length })) });
        }
        setDxfEntities(createThreeJSEntities(dxf, materialColor));
        setLoading(false);
      })
      .catch(err => { setError(err); setLoading(false); });
  }, [fileUrl, materialColor]);

  const getEntityColor = (entity, defaultColor) => {
    if (entity.colorNumber !== undefined && entity.colorNumber !== 256) {
      const acadColors = { 1: 0xFF0000, 2: 0xFFFF00, 3: 0x00FF00, 4: 0x00FFFF, 5: 0x0000FF, 6: 0xFF00FF, 7: 0xFFFFFF, 8: 0x808080, 9: 0xC0C0C0 };
      return acadColors[entity.colorNumber] || 0x4285F4;
    }
    return defaultColor;
  };

  const createLine = (entity, color) => {
    let start, end;
    if (entity.startPoint && entity.endPoint) {
      start = new THREE.Vector3(entity.startPoint.x || 0, entity.startPoint.y || 0, entity.startPoint.z || 0);
      end = new THREE.Vector3(entity.endPoint.x || 0, entity.endPoint.y || 0, entity.endPoint.z || 0);
    } else if (entity.vertices?.length >= 2) {
      start = new THREE.Vector3(entity.vertices[0].x || 0, entity.vertices[0].y || 0, entity.vertices[0].z || 0);
      end = new THREE.Vector3(entity.vertices[1].x || 0, entity.vertices[1].y || 0, entity.vertices[1].z || 0);
    } else return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints([start, end]);
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: getEntityColor(entity, color), linewidth: 3 }));
  };

  const createArcFromBulge = (startVertex, endVertex, bulge) => {
    if (Math.abs(bulge) < 0.000001) return [];
    const p1 = new THREE.Vector2(startVertex.x, startVertex.y);
    const p2 = new THREE.Vector2(endVertex.x, endVertex.y);
    const chord = p1.distanceTo(p2);
    if (chord < 0.000001) return [];
    const angle = 4 * Math.atan(Math.abs(bulge));
    const radius = chord / (2 * Math.sin(angle / 2));
    const midpoint = new THREE.Vector2().addVectors(p1, p2).multiplyScalar(0.5);
    const chordDirection = new THREE.Vector2().subVectors(p2, p1).normalize();
    const perpendicular = new THREE.Vector2(-chordDirection.y, chordDirection.x);
    const centerDistance = Math.sqrt(radius * radius - (chord / 2) * (chord / 2));
    const center = new THREE.Vector2().addVectors(midpoint, perpendicular.multiplyScalar(bulge > 0 ? centerDistance : -centerDistance));
    const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
    const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x);
    let angleDiff = endAngle - startAngle;
    if (bulge > 0) { if (angleDiff <= 0) angleDiff += 2 * Math.PI; } else { if (angleDiff >= 0) angleDiff -= 2 * Math.PI; }
    const segments = Math.max(8, Math.floor(Math.abs(angleDiff) * 8));
    return Array.from({ length: segments - 1 }, (_, i) => {
      const currentAngle = startAngle + ((i + 1) / segments) * angleDiff;
      return new THREE.Vector3(center.x + radius * Math.cos(currentAngle), center.y + radius * Math.sin(currentAngle), startVertex.z || 0);
    });
  };

  const createLWPolyline = (entity, color) => {
    if (!entity.vertices || entity.vertices.length < 2) return null;
    const points = [];
    for (let i = 0; i < entity.vertices.length; i++) {
      const vertex = entity.vertices[i];
      points.push(new THREE.Vector3(vertex.x || 0, vertex.y || 0, vertex.z || 0));
      if (vertex.bulge && Math.abs(vertex.bulge) > 0.000001) {
        const nextIndex = (i + 1) % entity.vertices.length;
        if (nextIndex !== i && (nextIndex < entity.vertices.length || entity.shape)) {
          const nextVertex = entity.vertices[nextIndex] || entity.vertices[0];
          points.push(...createArcFromBulge(vertex, nextVertex, vertex.bulge));
        }
      }
    }
    if (entity.shape && points.length > 2 && points[0].distanceTo(points[points.length - 1]) > 0.001) points.push(points[0].clone());
    if (points.length < 2) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(points);
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: getEntityColor(entity, color), linewidth: 3 }));
  };

  const createPolyline = (entity, color) => {
    if (!entity.vertices || entity.vertices.length < 2) return null;
    const points = entity.vertices.map(v => new THREE.Vector3(v.x || 0, v.y || 0, v.z || 0));
    if (entity.closed && points.length > 2) points.push(points[0]);
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(points);
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: getEntityColor(entity, color), linewidth: 2 }));
  };

  const createCircle = (entity, color) => {
    if (!entity.center || !entity.radius) return null;
    const curve = new THREE.EllipseCurve(0, 0, entity.radius, entity.radius, 0, 2 * Math.PI, false, 0);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(64));
    const circle = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: getEntityColor(entity, color), linewidth: 2 }));
    circle.position.set(entity.center.x || 0, entity.center.y || 0, entity.center.z || 0);
    return circle;
  };

  const createArc = (entity, color) => {
    if (!entity.center || !entity.radius) return null;
    const curve = new THREE.EllipseCurve(0, 0, entity.radius, entity.radius, entity.startAngle || 0, entity.endAngle || Math.PI * 2, false, 0);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
    const arc = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: getEntityColor(entity, color), linewidth: 2 }));
    arc.position.set(entity.center.x || 0, entity.center.y || 0, entity.center.z || 0);
    return arc;
  };

  const createSpline = (entity, color) => {
    if (!entity.controlPoints || entity.controlPoints.length < 2) return null;
    const points = entity.controlPoints.map(p => new THREE.Vector3(p.x || 0, p.y || 0, p.z || 0));
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(Math.max(50, points.length * 10)));
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: getEntityColor(entity, color), linewidth: 2 }));
  };

  const createThreeJSEntities = (dxf, color) => {
    const group = new THREE.Group();
    if (!dxf?.entities) return group;
    dxf.entities.forEach((entity, index) => {
      try {
        let object = null;
        switch (entity.type) {
          case 'LINE':       object = createLine(entity, color); break;
          case 'POLYLINE':   object = createPolyline(entity, color); break;
          case 'LWPOLYLINE': object = createLWPolyline(entity, color); break;
          case 'CIRCLE':     object = createCircle(entity, color); break;
          case 'ARC':        object = createArc(entity, color); break;
          case 'SPLINE':     object = createSpline(entity, color); break;
          default: break;
        }
        if (object) { object.userData = { entityIndex: index, entityType: entity.type, layer: entity.layer }; group.add(object); }
      } catch (e) { console.error(`Error processing entity ${index}:`, e); }
    });
    return group;
  };

  const ThreeScene = () => {
    if (loading) return (
      <>
        <mesh position={[0, 0, 0]}><torusGeometry args={[2, 0.5, 16, 32]} /><meshStandardMaterial color="#4285F4" /></mesh>
        <ambientLight intensity={0.5} /><directionalLight position={[10, 10, 10]} intensity={0.8} />
        <Html center><div style={{ color: 'white' }}>Loading DXF...</div></Html>
      </>
    );
    if (error) return (
      <>
        <mesh position={[0, 0, 0]}><boxGeometry args={[3, 3, 3]} /><meshStandardMaterial color="#FF5252" /></mesh>
        <ambientLight intensity={0.5} /><directionalLight position={[10, 10, 10]} intensity={0.8} />
        <Html center><div style={{ color: 'white' }}>Error: {error.message}</div></Html>
      </>
    );
    if (!dxfEntities || dxfEntities.children.length === 0) return (
      <>
        <mesh position={[0, 0, 0]}><sphereGeometry args={[2, 16, 16]} /><meshStandardMaterial color="#AAAAAA" /></mesh>
        <ambientLight intensity={0.5} /><directionalLight position={[10, 10, 10]} intensity={0.8} />
        <Html center><div style={{ color: 'white' }}>No DXF entities rendered</div></Html>
      </>
    );
    const box = new THREE.Box3().setFromObject(dxfEntities);
    if (box.isEmpty()) return <><ambientLight intensity={0.5} /><directionalLight position={[10, 10, 10]} intensity={0.8} /></>;
    const center = box.getCenter(new THREE.Vector3());
    dxfEntities.position.sub(center);
    const size = box.getSize(new THREE.Vector3()).length();
    const scaleFactor = size > 0 ? 10 / size : 1;
    return (
      <>
        <gridHelper args={[50, 50, 'white', 'gray']} position={[0, gridPosition, 0]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[0, 0, 10]} intensity={brightness * 0.3} />
        <directionalLight position={[10, 10, 5]} intensity={brightness * 0.2} />
        <primitive object={dxfEntities} scale={[scaleFactor, scaleFactor, scaleFactor]} />
        <OrbitControls enableZoom={true} enableRotate={true} enablePan={true} zoomSpeed={1.2} rotateSpeed={1.0} panSpeed={0.8} />
      </>
    );
  };

  return <group><ThreeScene /></group>;
}

export default DxfViewer;
