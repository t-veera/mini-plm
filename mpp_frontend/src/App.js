import React, { useState, useRef, useEffect, Suspense } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import { hybridStorage, createFileUploadHandler } from './hybridStorage';

import {
  Container,
  Row,
  Col,
  Table,
  Form,
  Toast,
  ToastContainer,
  Spinner
} from 'react-bootstrap';
import axios from 'axios';

// Icons
import {
  FaRegFilePdf,
  FaImage,
  FaFileAlt,
  FaJs,
  FaPython,
  FaMarkdown,
  FaCodepen,
  FaCode,
  FaCube,
  FaPlus,
  FaUpload,
  FaDraftingCompass,
  FaFileWord,
  FaCogs,
  FaDownload,
  FaEye, 
  FaTable, 
  FaChartLine,
  FaSpinner,
  FaToriiGate,
  FaDrumSteelpan,
  FaFilter
} from 'react-icons/fa';

// React Three Fiber / Three.js
import { Canvas, useLoader } from '@react-three/fiber';
import { STLLoader } from 'three-stdlib';
import { OrbitControls, GridHelper } from '@react-three/drei';
import * as THREE from 'three';

// For Excel/CSV
import * as XLSX from 'xlsx';

// Code Syntax Highlighting
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark, oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// Markdown
import ReactMarkdown from 'react-markdown';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// After your imports, add this complete styles object
const styles = {
  colors: {
    dark: '#171B24',           // Darker slate (matches Claude's background)
    darkAlt: '#1F2937',        // Slightly lighter slate
    border: '#374151',         // Subtle border color like Claude's
    transparent: 'rgba(241, 245, 244, 0.24)', 
    
    // Accent colors inspired by Claude's UI
    primary: '#6B7280',        // Slate gray for primary elements
    secondary: '#9CA3AF',      // Medium gray for secondary elements
    warning: '#D97706',        // Amber (for warning elements)
    success: '#059669',        // Emerald (for success elements)
    danger: '#DC2626',         // Red (for danger elements)

    iteration: 'rgb(94, 254, 194)',     // Soft lavender/purple for iterationrgb(7, 80, 254)rgb(7, 80, 254)
    stage: '#ffc107',         // Amber for stage
    
    text: {
      light: '#F3F4F6',        // Light gray text like Claude
      muted: '#9CA3AF',        // Medium gray text
      dark: '#1F2937'          // Dark text (for light backgrounds)
    }
  },
  fonts: {
    family: "'Roboto', 'Segoe UI', 'Arial', sans-serif",
    size: {
      xs: '0.75rem',
      sm: '0.85rem',
      md: '1rem',
      lg: '1.25rem'
    },
    weight: {
      normal: 400,
      medium: 500,
      bold: 700
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  borderRadius: {
    sm: '3px',
    md: '4px',
    lg: '6px'
  }
};



/* ---------------- FILE ICON MAP ---------------- */
const iconMap = {
  pdf: <FaRegFilePdf style={{ marginRight: '4px', color: '#ff3d3d', fontSize: '1.5rem' }} />,
  png: <FaImage style={{ marginRight: '4px', color: '#63E6BE', fontSize: '1.5rem' }} />,
  jpg: <FaImage style={{ marginRight: '4px', color: '#63E6BE', fontSize: '1.5rem' }} />,
  jpeg: <FaImage style={{ marginRight: '4px', color: '#63E6BE', fontSize: '1.5rem' }} />,
  gif: <FaImage style={{ marginRight: '4px', color: '#63E6BE', fontSize: '1.5rem' }} />,
  stl: <FaCube style={{ marginRight: '4px', color: '#FFD43B', fontSize: '1.5rem' }} />,
  dxf: <FaDraftingCompass style={{ marginRight: '4px', color: '${styles.colors.primary}', fontSize: '1.5rem' }} />,
  stp: <FaCogs style={{ marginRight: '4px', color: '#9775FA', fontSize: '1.5rem' }} />,
  step: <FaCogs style={{ marginRight: '4px', color: '#9775FA', fontSize: '1.5rem' }} />,
  doc: <FaFileWord style={{ marginRight: '4px', color: '#2B7BF3', fontSize: '1.5rem' }} />,
  docx: <FaFileWord style={{ marginRight: '4px', color: '#2B7BF3', fontSize: '1.5rem' }} />,
  js: <FaJs style={{ marginRight: '4px', color: '#e665a4', fontSize: '1.5rem' }} />,
  py: <FaPython style={{ marginRight: '4px', color: '#B197FC', fontSize: '1.5rem' }} />,
  cpp: <FaCodepen style={{ marginRight: '4px', color: '#ff813d', fontSize: '1.5rem' }} />,
  md: <FaMarkdown style={{ marginRight: '4px', color: '#74C0FC', fontSize: '1.5rem' }} />,
  ino: <FaCode style={{ marginRight: '4px', color: '#FF6B6B', fontSize: '1.5rem' }} />,
  default: <FaFileAlt style={{ marginRight: '4px', color: '#74C0FC', fontSize: '1.5rem' }} />
};

// Status options for files
const FILE_STATUSES = ['In-Work', 'Review', 'Released'];


/* ---------------- STL VIEWER (with grid and controls) ---------------- */
function StlViewer({ fileUrl, brightness = 1.5, contrast = 1.2, gridPosition = -2, materialColor = "#ccc" }) {
    const [geometry, setGeometry] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    
    // Force reload when component mounts or fileUrl changes
    useEffect(() => {
      console.log("StlViewer: Loading file from URL:", fileUrl);
      setLoading(true);
      setError(null);
      setGeometry(null);
      setLoadingProgress(0);
      
      // Simple direct loading approach - more reliable
      const loader = new STLLoader();
      
      try {
        // Load directly from the URL
        loader.load(
          fileUrl,
          (loadedGeometry) => {
            console.log("STL loaded successfully");
            
            // Center geometry & compute bounding box for scaling
            loadedGeometry.center();
            loadedGeometry.computeBoundingBox();
            setGeometry(loadedGeometry);
            setLoading(false);
            setLoadingProgress(100);
          },
          // Progress callback
          (xhr) => {
            if (xhr.lengthComputable) {
              const progress = Math.round((xhr.loaded / xhr.total) * 100);
              console.log(`STL loading progress: ${progress}%`);
              setLoadingProgress(progress);
            }
          },
          (err) => {
            console.error('Error loading STL:', err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Exception loading STL:', err);
        setError(err);
        setLoading(false);
      }
      
      return () => {
        // Cleanup geometry
        if (geometry) {
          geometry.dispose();
        }
      };
    }, [fileUrl]);
  
    // The Three.js scene content
    const ThreeScene = () => {
      if (loading) {
        return (
          <>
            {/* Loading indicator */}
            <mesh position={[0, 0, 0]} rotation={[0, loadingProgress / 100 * Math.PI * 2, 0]}>
              <torusGeometry args={[2, 0.5, 16, 32]} />
              <meshStandardMaterial color="#4285F4" />
            </mesh>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={0.8} />
            {/* OrbitControls added in the main return */}
          </>
        );
      }
      
      if (error) {
        console.log("Rendering error state in ThreeScene");
        return (
          <>
            {/* Error indicator */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[3, 3, 3]} />
              <meshStandardMaterial color="#FF5252" />
            </mesh>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={0.8} />
            {/* OrbitControls added in the main return */}
          </>
        );
      }
    
      if (!geometry) {
        console.log("No geometry available in ThreeScene");
        return (
          <>
            {/* Empty state indicator */}
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[2, 16, 16]} />
              <meshStandardMaterial color="#AAAAAA" />
            </mesh>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={0.8} />
            {/* OrbitControls added in the main return */}
          </>
        );
      }
    
      // Calculate appropriate scale based on bounding box
      const size = geometry.boundingBox?.getSize(new THREE.Vector3()).length() || 1;
      const scaleFactor = 10 / size;
      
      return (
        <>
          {/* Grid positioned lower */}
          <gridHelper
            args={[50, 50, 'white', 'gray']}
            position={[0, gridPosition, 0]}
          />
          
          {/* Enhanced lighting */}
          <directionalLight
            castShadow
            position={[10, 15, 10]}
            intensity={brightness}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight
            position={[-10, 10, -10]}
            intensity={brightness * 0.5}
          />
          <ambientLight intensity={0.4} />
          
          {/* The 3D model */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[scaleFactor, scaleFactor, scaleFactor]}
            castShadow
            receiveShadow
          >
            <primitive object={geometry} attach="geometry" />
            <meshStandardMaterial
              color={materialColor}
              roughness={0.5}
              metalness={0.1}
              // Apply contrast through emissive intensity
              emissive="${styles.colors.border}"
              emissiveIntensity={contrast - 1}
              wireframe={false}
            />
          </mesh>
          
          {/* Always add OrbitControls in the main return */}
          <OrbitControls
            enableZoom={true}
            enableRotate={true}
            enablePan={true}
            zoomSpeed={1.2}
            rotateSpeed={1.0}
            panSpeed={0.8}
          />
        </>
      );
    };
  
    // The complete component with both Three.js scene and HTML controls
    return (
      <group>
        <ThreeScene />
      </group>
    );
  }

/* ---------------- 3D MODEL PREVIEW COMPONENT ---------------- */
function Model3DPreview({ fileUrl }) {
  const [brightness, setBrightness] = useState(1.5);
  const [contrast, setContrast] = useState(1.2);
  const [gridPosition, setGridPosition] = useState(-2);
  const [materialColor, setMaterialColor] = useState("#cccccc"); // Default gray color
  const [showControls, setShowControls] = useState(false); // Show controls by default
  const [fileType, setFileType] = useState('stl'); // Default to STL
  
  // Force re-render when fileUrl changes
  const [key, setKey] = useState(0);
  useEffect(() => {
    // Generate a new key when fileUrl changes to force complete re-render
    setKey(prevKey => prevKey + 1);
    console.log("Model3DPreview: fileUrl changed, forcing re-render with key:", key + 1);
    
    // Determine file type from URL
    const lowerUrl = fileUrl.toLowerCase();
    if (lowerUrl.endsWith('.dxf')) {
      setFileType('dxf');
    } else if (lowerUrl.endsWith('.stp') || lowerUrl.endsWith('.step')) {
      setFileType('step');
    } else {
      setFileType('stl'); // Default to STL for other formats
    }
  }, [fileUrl]);
  
  // Render different viewers based on file type
  const renderViewer = () => {
    if (fileType === 'dxf') {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: '${styles.colors.text.light}',
          overflow: 'hidden'
        }}>
          <iframe
            src={`https://sharecad.org/cadframe/load?url=${encodeURIComponent(fileUrl)}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              maxWidth: '100%',
              height: '100%',
              border: 'none'
            }}
            title="DXF Preview"
            frameBorder="0"
          />
        </div>
      );
    } else {
      // For STL and other 3D formats
      return (
        <Canvas
          key={key} // Force complete re-creation of canvas when key changes
          shadows
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            maxWidth: '100%',
            height: '100%',
            background: '#222'
          }}
          camera={{ position: [0, 10, 15], fov: 40 }}
        >
          <Suspense fallback={null}>
            <StlViewer
              key={key} // Also force re-creation of the StlViewer
              fileUrl={fileUrl}
              brightness={brightness}
              contrast={contrast}
              gridPosition={gridPosition}
              materialColor={materialColor}
            />
          </Suspense>
        </Canvas>
      );
    }
  };
  
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        height: '600px',
        border: '1px solid #888',
        overflow: 'hidden'
      }}
    >
      {/* Render appropriate viewer based on file type */}
      {renderViewer()}
      
      {/* Only show 3D controls for 3D models */}
      {fileType !== 'dxf' && (
        <StlViewerControls
          brightness={brightness}
          setBrightness={setBrightness}
          contrast={contrast}
          setContrast={setContrast}
          gridPosition={gridPosition}
          setGridPosition={setGridPosition}
          materialColor={materialColor}
          setMaterialColor={setMaterialColor}
          showControls={showControls}
          setShowControls={setShowControls}
        />
      )}
    </div>
  );
}

// Separate component for 3D viewer controls (outside of Three.js context)
function StlViewerControls({ brightness, setBrightness, contrast, setContrast, gridPosition, setGridPosition, materialColor, setMaterialColor, showControls, setShowControls }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
      <div style={{ pointerEvents: 'auto' }}>
        {/* Toggle button for controls */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            zIndex: 20
          }}
          onClick={() => setShowControls(!showControls)}
        >
          {showControls ? 'Hide Controls' : 'Show Controls'}
        </div>
        
        {/* Controls panel */}
        {showControls && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.36)',
              padding: '10px',
              borderRadius: '5px',
              zIndex: 20,
              color: 'white',
              fontSize: '0.8rem',
              width: '200px'
            }}
          >
            <div className="mb-2">
              <label className="d-block mb-1">Brightness: {brightness.toFixed(1)}</label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div className="mb-2">
              <label className="d-block mb-1">Contrast: {contrast.toFixed(1)}</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={contrast}
                onChange={(e) => setContrast(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div className="mb-2">
              <label className="d-block mb-1">Grid Position: {gridPosition.toFixed(1)}</label>
              <input
                type="range"
                min="-5"
                max="0"
                step="0.5"
                value={gridPosition}
                onChange={(e) => setGridPosition(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
  
  /* ---------------- CODE PREVIEW ---------------- */
  function CodePreview({ fileUrl, extension }) {
    const [codeContent, setCodeContent] = useState('');
    const [error, setError] = useState(null);
  
    useEffect(() => {
      async function fetchCode() {
        try {
          const res = await fetch(fileUrl);
          if (!res.ok) {
            throw new Error(`Failed to fetch code file: ${res.status} ${res.statusText}`);
          }
          const text = await res.text();
          setCodeContent(text);
        } catch (err) {
          console.error('Error fetching code file:', err);
          setError(err.message || 'Error loading code');
        }
      }
      
      if (fileUrl) {
        fetchCode();
      }
    }, [fileUrl]);
  
    let language = 'javascript';
    if (extension === '.py') language = 'python';
    else if (extension === '.cpp') language = 'cpp';
    else if (extension === '.java') language = 'java';
    else if (extension === '.ts') language = 'typescript';
    else if (extension === '.ino') language = 'cpp'; // treat .ino as c++
  
    if (error) {
      return (
        <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', padding: '1rem' }}>
          <p className="text-danger">Error loading code: {error}</p>
        </div>
      );
    }
  
    return (
      <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'auto' }}>
        {codeContent ? (
          <SyntaxHighlighter language={language} style={materialDark} showLineNumbers>
            {codeContent}
          </SyntaxHighlighter>
        ) : (
          <p className="text-muted">Loading code...</p>
        )}
      </div>
    );
  }
  
  /* ---------------- MARKDOWN PREVIEW ---------------- */
  function MarkdownPreview({ fileUrl }) {
    const [markdownContent, setMarkdownContent] = useState('');
    const [error, setError] = useState(null);
  
    useEffect(() => {
      async function fetchMarkdown() {
        try {
          const res = await fetch(fileUrl);
          if (!res.ok) {
            throw new Error(`Failed to fetch markdown file: ${res.status} ${res.statusText}`);
          }
          const text = await res.text();
          setMarkdownContent(text);
        } catch (err) {
          console.error('Error fetching markdown file:', err);
          setError(err.message || 'Error loading markdown');
        }
      }
      
      if (fileUrl) {
        fetchMarkdown();
      }
    }, [fileUrl]);
  
    if (error) {
      return (
        <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', padding: '1rem' }}>
          <p className="text-danger">Error loading markdown: {error}</p>
        </div>
      );
    }
  
    return (
      <div     style={{
        minHeight: '600px', borderRadius: '8px',
        border: '1px solid #888',
        overflow: 'auto',
        padding: '1rem',
        fontFamily: 'system-ui, -apple-system, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'
      }}
      >
        {markdownContent ? (
          <ReactMarkdown>{markdownContent}</ReactMarkdown>
        ) : (
          <p className="text-muted">Loading markdown...</p>
        )}
      </div>
    );
  }
   
  /* ---------------- CSV PREVIEW ---------------- */
  function CsvPreview({ fileUrl }) {
    const [rows, setRows] = useState([]);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      async function fetchCsv() {
        try {
          const res = await fetch(fileUrl);
          if (!res.ok) {
            throw new Error(`Failed to fetch CSV file: ${res.status} ${res.statusText}`);
          }
          const text = await res.text();
          // naive parse: split lines by \n, columns by ,
          const lines = text.split('\n').map(line => line.split(','));
          setRows(lines);
        } catch (err) {
          console.error('Error fetching CSV file:', err);
          setError(err.message || 'Error loading CSV');
        }
      }
      
      if (fileUrl) {
        fetchCsv();
      }
    }, [fileUrl]);
  
    if (error) {
      return (
        <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', padding: '1rem' }}>
          <p className="text-danger">Error loading CSV: {error}</p>
        </div>
      );
    }
  
    return (
      <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'auto' }}>
        {rows.length === 0 ? (
          <p className="text-muted p-2">Loading CSV data...</p>
        ) : (
          <Table hover borderless className="table-dark table-sm">
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    );
  }
  
  /* ---------------- EXCEL PREVIEW ---------------- */
  function ExcelPreview({ fileUrl }) {
    const [rows, setRows] = useState([]);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      async function fetchExcel() {
        try {
          const res = await fetch(fileUrl);
          if (!res.ok) {
            throw new Error(`Failed to fetch Excel file: ${res.status} ${res.statusText}`);
          }
          const blob = await res.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          setRows(jsonData);
        } catch (err) {
          console.error('Error fetching Excel file:', err);
          setError(err.message || 'Error loading Excel');
        }
      }
      
      if (fileUrl) {
        fetchExcel();
      }
    }, [fileUrl]);
  
    if (error) {
      return (
        <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', padding: '1rem' }}>
          <p className="text-danger">Error loading Excel: {error}</p>
        </div>
      );
    }
  
    return (
      <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'auto' }}>
        {rows.length === 0 ? (
          <p className="text-muted p-2">Loading Excel data...</p>
        ) : (
          <Table hover borderless className="table-dark table-sm">
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    );
  }
  /* ---------------- RESIZABLE COLUMN ---------------- */
function ResizableColumn({ leftContent, rightContent }) {
    //const [leftWidth, setLeftWidth] = useState(500); // Increased default width
    const [leftWidth, setLeftWidth] = useState(Math.min(500, window.innerWidth * 0.4)); // Set responsive default
    const [isResizing, setIsResizing] = useState(false);
    const minWidth = 200; // Minimum width for left column
   // const maxWidth = window.innerWidth - 300; // Maximum width (leave space for right column)
    const maxWidth = Math.max(300, Math.min(window.innerWidth - 300, window.innerWidth * 0.6)); 
  
    // Handle mouse down on the resizer
    const handleMouseDown = (e) => {
      setIsResizing(true);
      e.preventDefault();
    };
  
    // Handle mouse move to resize
    useEffect(() => {
      function handleMouseMove(e) {
        if (!isResizing) return;
        
        const newWidth = e.clientX;
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setLeftWidth(newWidth);
        }
      }
  
      function handleMouseUp() {
        setIsResizing(false);
      }
  
      if (isResizing) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
  
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isResizing]);
  
    return (
      <div className="d-flex flex-grow-1" style={{ height: '100%', overflow: 'hidden', padding: 0, margin: 0, maxWidth: '80%' }}>
        {/* Left Column */}
          <div style={{
            width: `${leftWidth}px`,
            flexShrink: 0,
            height: '100%',
            overflowY: 'auto',
            padding: '0.75rem',
            borderRight: `1px solid ${styles.colors.border}`, // Changed quotes to backticks for proper interpolation
            maxWidth: '40%'
          }}>
            {leftContent}
          </div>
        
        {/* Resizer */}
        <div
          style={{
            width: '10px',
            cursor: 'col-resize',
            background: 'transparent',
            position: 'relative',
            zIndex: 10
          }}
          onMouseDown={handleMouseDown}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '4px',
            background: isResizing ? '${styles.colors.primary}' : 'transparent',
            transition: isResizing ? 'none' : 'background 0.2s'
          }}></div>
        </div>
        
        {/* Right Column */}
        <div style={{
          flexGrow: 1,
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0.75rem',
          width: 'auto',
          maxWidth: '60%' //calc(100% - 10px - 40%)'
        }}>
          {rightContent}
        </div>
      </div>
    );
  }

  /* ---------------- MAIN APP ---------------- */
  export default function App() {
     // 1. ALL useState declarations FIRST (in any order)
  const [viewMode, setViewMode] = useState('normal');
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProductIndex, setSelectedProductIndex] = useState(() => {
    const idx = localStorage.getItem('phasorSelectedProductIndex');
    return idx ? parseInt(idx, 10) : 0;
  });
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [containerType, setContainerType] = useState(null);
  const [selectedFileObj, setSelectedFileObj] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    fileObj: null
  });
  const [showChildFileModal, setShowChildFileModal] = useState(false);
  const [parentFileForChild, setParentFileForChild] = useState(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showChangeDescriptionModal, setShowChangeDescriptionModal] = useState(false);
  const [currentFileForModal, setCurrentFileForModal] = useState(null);
  const [tempChangeDescription, setTempChangeDescription] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  
  // 2. THEN derived values (AFTER all useState)
  const prod = products[selectedProductIndex] || {};
  
  // 3. THEN refs
  const hiddenFileInput = useRef(null);
  const revisionFileInput = useRef(null);
  const contextMenuFileInput = useRef(null);
  const childFileInput = useRef(null);

    
    //load products from your Django backend when the app starts, and fall back to local storage if the backend is unavailable
    // useEffect(() => {
    //   const loadData = async () => {
    //     setIsLoading(true);
    //     try {
    //       // Try to load from backend first
    //       const response = await fetch('/api/products/');
    //       if (response.ok) {
    //         const backendProducts = await response.json();
    //         setProducts(backendProducts);
    //         if (backendProducts.length > 0) {
    //           setSelectedProductIndex(0);
    //         }
    //       } else {
    //         // Fallback to local storage
    //         const loadedProducts = await hybridStorage.loadProducts();
    //         setProducts(loadedProducts);
    //         setSelectedProductIndex(0);
    //       }
    //     } catch (error) {
    //       console.error('Failed to load products:', error);
    //       // Fallback to default
    //       setProducts([{
    //         id: 1,
    //         name: 'Sample Product',
    //         stages: [],
    //         iterations: [],
    //         selectedContainer: null,
    //         containerType: null,
    //         filesByContainer: {}
    //       }]);
    //     } finally {
    //       setIsLoading(false);
    //     }
    //   };
      
    //   loadData();
    // }, []);
    useEffect(() => {
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Try to load from backend first
      const response = await fetch('/api/products/');
      if (response.ok) {
        const backendProducts = await response.json();
        
        // CRITICAL FIX: Enrich backend data with local frontend properties
        const enrichedProducts = backendProducts.map(product => ({
          ...product,
          selectedContainer: product.selectedContainer || null,
          containerType: product.containerType || null,
          filesByContainer: product.filesByContainer || {}
        }));
        
        setProducts(enrichedProducts);
        if (enrichedProducts.length > 0) {
          setSelectedProductIndex(0);
        }
      } else {
        // Fallback to local storage (hybridStorage should already return enriched data)
        const loadedProducts = await hybridStorage.loadProducts();
        setProducts(loadedProducts);
        setSelectedProductIndex(0);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      // Fallback to default (already has required properties)
      setProducts([{
        id: 1,
        name: 'Sample Product',
        stages: [],
        iterations: [],
        selectedContainer: null,
        containerType: null,
        filesByContainer: {}
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  loadData();
}, []);
    
    
    
    useEffect(() => {
      if (products.length === 0 || isLoading) return;
    
      const timeoutId = setTimeout(() => {
        hybridStorage.saveProducts(products)
          .catch(err => console.error("Auto-save failed:", err));
      }, 1000); // Debounced save
    
      return () => clearTimeout(timeoutId);
    }, [products, isLoading]);
    


    
    useEffect(() => {
      localStorage.setItem('phasorSelectedProductIndex', selectedProductIndex.toString());
    }, [selectedProductIndex]);
  
   
  

  
    /* Effect to close context menu on click outside */
    useEffect(() => {
      function handleClick() {
        if (contextMenu.visible) {
          hideContextMenu();
        }
      }
      
      document.addEventListener('click', handleClick);
      
      return () => {
        document.removeEventListener('click', handleClick);
      };
    }, [contextMenu.visible]);
  
  /* CREATE NEW PRODUCT */
  //   function handleCreateProduct() {
  //   const prodName = prompt('Enter new product name:');
  //   if (!prodName) return;
  
  //   const newProd = {
  //     name: prodName,
  //     stageIcons: [],
  //     selectedStage: null,
  //     filesByStage: {}
  //   };
  
  //   const updatedProducts = [...products, newProd];
  //   setProducts(updatedProducts);
  //   setSelectedProductIndex(products.length);
  //   setSelectedFileObj(null);
  
  //   // Persist immediately
  //   hybridStorage.saveProducts(updatedProducts)
  //     .catch(err => console.error("Error saving product after creation:", err));
  // }
  async function handleCreateProduct() {
  const prodName = prompt('Enter new product name:');
  console.log('📝 Product name entered:', prodName);
  if (!prodName){
    console.log('❌ No product name, returning early');
    return;
  } 

  try {
    // Create product on backend
    console.log('🚀 About to make API call to /api/products/');
    const response = await fetch('/api/products/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: prodName,
        description: '' // Optional description
      })
    });
     console.log('📡 API Response received:', response);

    if (!response.ok) {
      throw new Error(`Failed to create product: ${response.statusText}`);
    }

    const newProduct = await response.json();
    console.log('Created product:', newProduct);

    // Update local state with the new product structure
    const newProd = {
      id: newProduct.id,
      name: newProduct.name,
      description: newProduct.description || '',
      created_at: newProduct.created_at,
      updated_at: newProduct.updated_at,
      owner: newProduct.owner,
      stages: newProduct.stages || [], // Array of stage objects
      iterations: newProduct.iterations || [], // Array of iteration objects
      selectedContainer: null, // Can be stage or iteration
      containerType: null, // 'stage' or 'iteration'
      filesByContainer: {} // Files organized by container
    };

    const updatedProducts = [...products, newProd];
    setProducts(updatedProducts);
    setSelectedProductIndex(products.length);
    setSelectedFileObj(null);

    // Clear any previous container selection
    setSelectedContainer(null);
    setContainerType(null);

    // Persist to local storage or hybrid storage
    hybridStorage.saveProducts(updatedProducts)
      .catch(err => console.error("Error saving products after creation:", err));

    console.log(`Product "${prodName}" created successfully with ID: ${newProduct.id}`);
    
  } catch (error) {
    console.error('Error creating product:', error);
    alert(`Failed to create product: ${error.message}`);
  }
}
  

  /* SWITCH PRODUCT */
  // function handleSelectProduct(e) {
  //   const index = parseInt(e.target.value, 10);
  //   setSelectedProductIndex(index);
  //   setSelectedFileObj(null); // clear preview
  // }

//   function handleSelectProduct(e) {
//   console.log('🟢 PRODUCT CLICK HANDLER CALLED!');
//   const index = parseInt(e.target.value, 10);
//   setSelectedProductIndex(index);
//   setSelectedFileObj(null); // clear preview
  
//   // Clear container selection when switching products
//   setSelectedContainer(null);
//   setContainerType(null);
  
//   // Optional: Load fresh data for the selected product from backend
//   if (products[index]?.id) {
//     loadProductDetails(products[index].id);
//   }
// }
// function handleSelectProduct(e) {
//   console.log('🟢 PRODUCT CLICK HANDLER CALLED!');
//   const index = parseInt(e.target.value, 10);
//   setSelectedProductIndex(index);
//   setSelectedFileObj(null); // clear preview
  
//   // Clear container selection when switching products
//   setSelectedContainer(null);
//   setContainerType(null);
  
//   // CRITICAL FIX: Pass the index directly instead of relying on selectedProductIndex state
//   if (products[index]?.id) {
//     loadProductDetails(products[index].id, index);
//   }
// }
function handleSelectProduct(e) {
  console.log('🟢 PRODUCT CLICK HANDLER CALLED!');
  const index = parseInt(e.target.value, 10);
  setSelectedProductIndex(index);
  setSelectedFileObj(null); // clear preview
  
  // Clear container selection when switching products
  setSelectedContainer(null);
  setContainerType(null);
  
  // CRITICAL FIX: Pass the index directly instead of relying on selectedProductIndex state
  if (products[index]?.id) {
    loadProductDetails(products[index].id, index);
  }
}

  // Helper function to load fresh product details from backend
  // async function loadProductDetails(productId) {
  //   try {
  //     const response = await fetch(`/api/products/${productId}/`);
  //     if (response.ok) {
  //       const productData = await response.json();
        
  //       // Update the specific product in the products array
  //       setProducts(prevProducts => 
  //         prevProducts.map((product, idx) => 
  //           idx === selectedProductIndex ? {
  //             ...product,
  //             stages: productData.stages || [],
  //             iterations: productData.iterations || [],
  //             // Keep existing local state but update backend data
  //             selectedContainer: product.selectedContainer,
  //             containerType: product.containerType,
  //             filesByContainer: product.filesByContainer || {}
  //           } : product
  //         )
  //       );
  //     }
  //   } catch (error) {
  //     console.error('Failed to load product details:', error);
  //     // Continue with existing data if backend fails
  //   }
  // }
async function loadProductDetails(productId, targetIndex = null) {
  try {
    const response = await fetch(`/api/products/${productId}/`);
    if (response.ok) {
      const productData = await response.json();
      
      // Use provided index or fall back to selectedProductIndex
      const indexToUpdate = targetIndex !== null ? targetIndex : selectedProductIndex;
      
      // Update the specific product in the products array
      setProducts(prevProducts => 
        prevProducts.map((product, idx) => 
          idx === indexToUpdate ? {
            ...product,
            stages: productData.stages || [],
            iterations: productData.iterations || [],
            // Keep existing local state but update backend data
            selectedContainer: product.selectedContainer || null,
            containerType: product.containerType || null,
            filesByContainer: product.filesByContainer || {}
          } : product
        )
      );
    }
  } catch (error) {
    console.error('Failed to load product details:', error);
    // Continue with existing data if backend fails
  }
}
  // Adding Stages and Iterations
    // function handleAddStage() {
    //   // Create deep copies to ensure proper React state updates
    //   const updatedProducts = [...products];
    //   const updatedProduct = { ...updatedProducts[selectedProductIndex] };
    //   updatedProducts[selectedProductIndex] = updatedProduct;
    
    //   // Count existing stage icons (type 'S')
    //   const sCount = (updatedProduct.stageIcons || []).filter(icon => icon.type === 'S').length;
    //   const newNumber = sCount + 1; // numeric part
    //   const newLabel = `S${newNumber}`; // full label for file mapping, etc.
    //   const color = styles.colors.stage; // e.g., Amber
    
    //   // Create a new icon object that stores both the full label and numeric value
    //   const newIcon = { type: 'S', label: newLabel, number: newNumber, color };
    
    //   // Update the product with the new stage icon and initialize its file group
    //   updatedProduct.stageIcons = [...(updatedProduct.stageIcons || []), newIcon];
    //   updatedProduct.filesByStage = { ...updatedProduct.filesByStage, [newLabel]: [] };
    //   updatedProduct.selectedStage = newLabel; // auto-select the new stage
    
    //   setProducts(updatedProducts);
    //   setSelectedFileObj(null);
    // }
    
    // function handleAddIteration() {
    //   // Create deep copies to ensure proper React state updates
    //   const updatedProducts = [...products];
    //   const updatedProduct = { ...updatedProducts[selectedProductIndex] };
    //   updatedProducts[selectedProductIndex] = updatedProduct;
    
    //   // Count existing iteration icons (type 'I')
    //   const iCount = (updatedProduct.stageIcons || []).filter(icon => icon.type === 'I').length;
    //   const newNumber = iCount + 1; // numeric part
    //   const newLabel = `i${newNumber}`; // full label for file mapping, etc.
    //   const color = styles.colors.iteration;
    
    //   // Create a new icon object that stores both the full label and numeric value
    //   const newIcon = { type: 'I', label: newLabel, number: newNumber, color };
    
    //   // Update the product with the new iteration icon and initialize its file group
    //   updatedProduct.stageIcons = [...(updatedProduct.stageIcons || []), newIcon];
    //   updatedProduct.filesByStage = { ...updatedProduct.filesByStage, [newLabel]: [] };
    //   updatedProduct.selectedStage = newLabel; // auto-select the new iteration
    
    //   setProducts(updatedProducts);
    //   setSelectedFileObj(null);
    // }
  // async function handleAddStage() {
  //   if (selectedProductIndex === null || !products[selectedProductIndex]?.id) {
  //     alert('Please select a valid product first');
  //     return;
  //   }

  //   const currentProduct = products[selectedProductIndex];
  //   const stageCount = (currentProduct.stages?.length || 0) + 1;
  //   const stageName = `Stage ${stageCount}`;

  //   try {
  //     // Create stage on backend
  //     const response = await fetch('/api/stages/', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         product: currentProduct.id,
  //         name: stageName,
  //         type: 'workflow', // default type
  //         color: styles.colors.stage // Use your existing stage color
  //       })
  //     });

  //     if (!response.ok) {
  //       throw new Error(`Failed to create stage: ${response.statusText}`);
  //     }

  //     const newStage = await response.json();
  //     console.log('Created stage:', newStage);

  //     // Update local state
  //     const updatedProducts = [...products];
  //     const updatedProduct = { ...updatedProducts[selectedProductIndex] };
  //     updatedProducts[selectedProductIndex] = updatedProduct;

  //     // Add new stage to the stages array
  //     updatedProduct.stages = [...(updatedProduct.stages || []), newStage];
      
  //     // Initialize file storage for this stage
  //     const stageKey = `stage_${newStage.id}`;
  //     updatedProduct.filesByContainer = { 
  //       ...updatedProduct.filesByContainer, 
  //       [stageKey]: [] 
  //     };

  //     // Auto-select the new stage
  //     updatedProduct.selectedContainer = newStage;
  //     updatedProduct.containerType = 'stage';

  //     // Update state
  //     setProducts(updatedProducts);
  //     setSelectedContainer(newStage);
  //     setContainerType('stage');
  //     setSelectedFileObj(null);

  //     // Persist changes
  //     hybridStorage.saveProducts(updatedProducts)
  //       .catch(err => console.error("Error saving after stage creation:", err));

  //     console.log(`Stage "${stageName}" created successfully with ID: ${newStage.stage_id}`);

  //   } catch (error) {
  //     console.error('Error creating stage:', error);
  //     alert(`Failed to create stage: ${error.message}`);
  //   }
  // }

  // async function handleAddIteration() {
  //   if (selectedProductIndex === null || !products[selectedProductIndex]?.id) {
  //     alert('Please select a valid product first');
  //     return;
  //   }

  //   const currentProduct = products[selectedProductIndex];
  //   const iterationName = prompt('Enter iteration name:') || `Iteration ${(currentProduct.iterations?.length || 0) + 1}`;

  //   try {
  //     // Create iteration on backend
  //     const response = await fetch('/api/iterations/', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         product: currentProduct.id,
  //         name: iterationName,
  //         type: 'design', // default type
  //         color: styles.colors.iteration // Use your existing iteration color
  //       })
  //     });

  //     if (!response.ok) {
  //       throw new Error(`Failed to create iteration: ${response.statusText}`);
  //     }

  //     const newIteration = await response.json();
  //     console.log('Created iteration:', newIteration);

  //     // Update local state
  //     const updatedProducts = [...products];
  //     const updatedProduct = { ...updatedProducts[selectedProductIndex] };
  //     updatedProducts[selectedProductIndex] = updatedProduct;

  //     // Add new iteration to the iterations array
  //     updatedProduct.iterations = [...(updatedProduct.iterations || []), newIteration];
      
  //     // Initialize file storage for this iteration
  //     const iterationKey = `iteration_${newIteration.id}`;
  //     updatedProduct.filesByContainer = { 
  //       ...updatedProduct.filesByContainer, 
  //       [iterationKey]: [] 
  //     };

  //     // Auto-select the new iteration
  //     updatedProduct.selectedContainer = newIteration;
  //     updatedProduct.containerType = 'iteration';

  //     // Update state
  //     setProducts(updatedProducts);
  //     setSelectedContainer(newIteration);
  //     setContainerType('iteration');
  //     setSelectedFileObj(null);

  //     // Persist changes
  //     hybridStorage.saveProducts(updatedProducts)
  //       .catch(err => console.error("Error saving after iteration creation:", err));

  //     console.log(`Iteration "${iterationName}" created successfully with ID: ${newIteration.iteration_id}`);

  //   } catch (error) {
  //     console.error('Error creating iteration:', error);
  //     alert(`Failed to create iteration: ${error.message}`);
  //   }
  // }

async function handleAddStage() {
  if (selectedProductIndex === null || !products[selectedProductIndex]?.id) {
    alert('Please select a valid product first');
    return;
  }

  const currentProduct = products[selectedProductIndex];
  
  // Generate unique name to avoid unique constraint violation
  const currentStageCount = currentProduct.stages?.length || 0;
  const stageNumber = currentStageCount + 1;
  const stageName = `Stage ${stageNumber}`;

  console.log(`Creating ${stageName} for product: ${currentProduct.name}`);

  try {
    // Prepare the request payload
    const requestPayload = {
      product: currentProduct.id,
      name: stageName,
      type: 'workflow', // default type
      color: '#007bff' // Use Django model default color
    };

    console.log('Creating stage with payload:', requestPayload);

    // Create stage on backend
    const response = await fetch('/api/stages/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server responded with ${response.status}:`, errorText);
      throw new Error(`Failed to create stage: ${response.status} - ${errorText}`);
    }

    const newStage = await response.json();
    console.log('Created stage:', newStage);

    // Update local state
    const updatedProducts = [...products];
    const updatedProduct = { ...updatedProducts[selectedProductIndex] };
    updatedProducts[selectedProductIndex] = updatedProduct;

    // Add new stage to the stages array
    updatedProduct.stages = [...(updatedProduct.stages || []), newStage];
    
    // Initialize file storage for this stage
    const stageKey = `stage_${newStage.id}`;
    updatedProduct.filesByContainer = { 
      ...updatedProduct.filesByContainer, 
      [stageKey]: [] 
    };

    // Auto-select the new stage
    updatedProduct.selectedContainer = newStage;
    updatedProduct.containerType = 'stage';

    // Update state
    setProducts(updatedProducts);
    setSelectedContainer(newStage);
    setContainerType('stage');
    setSelectedFileObj(null);

    // Persist changes
    hybridStorage.saveProducts(updatedProducts)
      .catch(err => console.error("Error saving after stage creation:", err));

    console.log(`Stage created successfully: ${newStage.name} (ID: ${newStage.id})`);

  } catch (error) {
    console.error('Error creating stage:', error);
    alert(`Failed to create stage: ${error.message}`);
  }
}

  async function handleAddIteration() {
  if (selectedProductIndex === null || !products[selectedProductIndex]?.id) {
    alert('Please select a valid product first');
    return;
  }

  const currentProduct = products[selectedProductIndex];
  
  // Generate unique name to avoid unique constraint violation
  const currentIterationCount = currentProduct.iterations?.length || 0;
  const iterationNumber = currentIterationCount + 1;
  const iterationName = `Iteration ${iterationNumber}`;

  console.log(`Creating ${iterationName} for product: ${currentProduct.name}`);

  try {
    // Prepare the request payload
    const requestPayload = {
      product: currentProduct.id,
      name: iterationName,
      type: 'design', // default type
      color: '#28a745' // Use Django model default color
    };

    console.log('Creating iteration with payload:', requestPayload);

    // Create iteration on backend
    const response = await fetch('/api/iterations/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server responded with ${response.status}:`, errorText);
      throw new Error(`Failed to create iteration: ${response.status} - ${errorText}`);
    }

    const newIteration = await response.json();
    console.log('Created iteration:', newIteration);

    // Update local state
    const updatedProducts = [...products];
    const updatedProduct = { ...updatedProducts[selectedProductIndex] };
    updatedProducts[selectedProductIndex] = updatedProduct;

    // Add new iteration to the iterations array
    updatedProduct.iterations = [...(updatedProduct.iterations || []), newIteration];
           
    // Initialize file storage for this iteration
    const iterationKey = `iteration_${newIteration.id}`;
    updatedProduct.filesByContainer = {
       ...updatedProduct.filesByContainer,
       [iterationKey]: []
     };

    // Auto-select the new iteration
    updatedProduct.selectedContainer = newIteration;
    updatedProduct.containerType = 'iteration';

    // Update state
    setProducts(updatedProducts);
    setSelectedContainer(newIteration);
    setContainerType('iteration');
    setSelectedFileObj(null);

    // Persist changes
    hybridStorage.saveProducts(updatedProducts)
      .catch(err => console.error("Error saving after iteration creation:", err));

    console.log(`Iteration created successfully: ${newIteration.name} (ID: ${newIteration.id})`);

  } catch (error) {
    console.error('Error creating iteration:', error);
    alert(`Failed to create iteration: ${error.message}`);
  }
}
  
  /* STAGE ICON LEFT-CLICK => SELECT THAT STAGE */
  /* NEED TO CHANGE THE UI ACCORDINGLY */
  // function handleStageIconClick(label) {
  //   const updatedProducts = [...products];
  //   const updatedProduct = { ...updatedProducts[selectedProductIndex] };
  //   updatedProducts[selectedProductIndex] = updatedProduct;
  
  //   updatedProduct.selectedStage = label;
  
  //   setProducts(updatedProducts);
  //   setSelectedFileObj(null);
  // }
//   function handleContainerClick(container, type) {
//   // container is the stage or iteration object
//   // type is 'stage' or 'iteration'
  
//   const updatedProducts = [...products];
//   const updatedProduct = { ...updatedProducts[selectedProductIndex] };
//   updatedProducts[selectedProductIndex] = updatedProduct;

//   // Update the selected container and type
//   updatedProduct.selectedContainer = container;
//   updatedProduct.containerType = type;

//   setProducts(updatedProducts);
//   setSelectedContainer(container);
//   setContainerType(type);
//   setSelectedFileObj(null);

//   // Optional: Load files for this container from backend
//   loadContainerFiles(container, type);
// }
function handleContainerClick(container, type) {
  // container is the stage or iteration object
  // type is 'stage' or 'iteration'
  
  const updatedProducts = [...products];
  const currentProduct = updatedProducts[selectedProductIndex];
  
  // CRITICAL FIX: Ensure all local properties are preserved/initialized
  const updatedProduct = {
    ...currentProduct,
    selectedContainer: container,
    containerType: type,
    filesByContainer: currentProduct.filesByContainer || {} // Preserve or initialize
  };
  
  updatedProducts[selectedProductIndex] = updatedProduct;

  setProducts(updatedProducts);
  setSelectedContainer(container);
  setContainerType(type);
  setSelectedFileObj(null);

  // Optional: Load files for this container from backend
  loadContainerFiles(container, type);
}
// Helper function to load files for the selected container
  // async function loadContainerFiles(container, type) {
  //   try {
  //     let endpoint;
  //     if (type === 'stage') {
  //       endpoint = `/api/stages/${container.id}/files/`;
  //     } else if (type === 'iteration') {
  //       endpoint = `/api/iterations/${container.id}/files/`;
  //     }

  //     const response = await fetch(endpoint);
  //     if (response.ok) {
  //       const files = await response.json();
        
  //       // Update the files for this container in local state
  //       const containerKey = `${type}_${container.id}`;
  //       const updatedProducts = [...products];
  //       const updatedProduct = { ...updatedProducts[selectedProductIndex] };
  //       updatedProduct.filesByContainer = {
  //         ...updatedProduct.filesByContainer,
  //         [containerKey]: files
  //       };
  //       updatedProducts[selectedProductIndex] = updatedProduct;
  //       setProducts(updatedProducts);
  //     }
  //   } catch (error) {
  //     console.error(`Failed to load ${type} files:`, error);
  //     // Continue with existing data if backend fails
  //   }
  // }
  async function loadContainerFiles(container, type) {
  try {
    let endpoint;
    if (type === 'stage') {
      endpoint = `/api/stages/${container.id}/files/`;
    } else if (type === 'iteration') {
      endpoint = `/api/iterations/${container.id}/files/`;
    }

    const response = await fetch(endpoint);
    if (response.ok) {
      const files = await response.json();
      
      // Update the files for this container in local state
      const containerKey = `${type}_${container.id}`;
      const updatedProducts = [...products];
      const currentProduct = updatedProducts[selectedProductIndex];
      
      // CRITICAL FIX: Ensure filesByContainer exists before spreading
      const updatedProduct = {
        ...currentProduct,
        filesByContainer: {
          ...(currentProduct.filesByContainer || {}), // Safe spread with fallback
          [containerKey]: files
        }
      };
      
      updatedProducts[selectedProductIndex] = updatedProduct;
      setProducts(updatedProducts);
    }
  } catch (error) {
    console.error(`Failed to load ${type} files:`, error);
    // Continue with existing data if backend fails
  }
}
  
  
  /* STAGE ICON RIGHT-CLICK => DELETE IF EMPTY */
  // function handleStageIconRightClick(e, label) {
  //   e.preventDefault(); // no default context menu
    
  //   // Create deep copies for React state updates
  //   const updatedProducts = [...products];
  //   const updatedProduct = {...updatedProducts[selectedProductIndex]};
  //   updatedProducts[selectedProductIndex] = updatedProduct;

  //   // Check if this stage/iteration has files
  //   const fileList = updatedProduct.filesByStage[label] || [];
  //   if (fileList.length > 0) {
  //     // has files => do nothing or show alert
  //     setToastMsg('Cannot delete a stage/iteration with files!');
  //     return;
  //   }

  //   // If empty => ask user
  //   const confirmDel = window.confirm(`Delete ${label}? It's empty and will be removed.`);
  //   if (!confirmDel) return;

  //   // remove from stageIcons
  //   updatedProduct.stageIcons = updatedProduct.stageIcons.filter(icon => icon.label !== label);
    
  //   // remove from filesByStage
  //   updatedProduct.filesByStage = {...updatedProduct.filesByStage};
  //   delete updatedProduct.filesByStage[label];

  //   // If the user is currently selected that stage, reset selectedStage
  //   if (updatedProduct.selectedStage === label) {
  //     updatedProduct.selectedStage = null;
  //   }

  //   setProducts(updatedProducts);
  // }
  /* CONTAINER RIGHT-CLICK => DELETE IF EMPTY */
  async function handleContainerRightClick(e, container, type) {
    e.preventDefault(); // no default context menu
    
    // Create deep copies for React state updates
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;

    // Check if this container has files
    const containerKey = `${type}_${container.id}`;
    const fileList = updatedProduct.filesByContainer[containerKey] || [];
    
    if (fileList.length > 0) {
      // has files => do nothing or show alert
      setToastMsg(`Cannot delete a ${type} with files!`);
      return;
    }

    // If empty => ask user
    const containerLabel = type === 'stage' ? container.stage_id : container.iteration_id;
    const confirmDel = window.confirm(`Delete ${containerLabel}? It's empty and will be removed.`);
    if (!confirmDel) return;

    try {
      // Delete from backend
      let endpoint;
      if (type === 'stage') {
        endpoint = `/api/stages/${container.id}/`;
      } else if (type === 'iteration') {
        endpoint = `/api/iterations/${container.id}/`;
      }

      const response = await fetch(endpoint, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${type}: ${response.statusText}`);
      }

      // Remove from local state
      if (type === 'stage') {
        updatedProduct.stages = updatedProduct.stages.filter(s => s.id !== container.id);
      } else if (type === 'iteration') {
        updatedProduct.iterations = updatedProduct.iterations.filter(i => i.id !== container.id);
      }
      
      // Remove from filesByContainer
      updatedProduct.filesByContainer = {...updatedProduct.filesByContainer};
      delete updatedProduct.filesByContainer[containerKey];

      // If the user currently has this container selected, reset selection
      if (updatedProduct.selectedContainer?.id === container.id) {
        updatedProduct.selectedContainer = null;
        updatedProduct.containerType = null;
        setSelectedContainer(null);
        setContainerType(null);
      }

      setProducts(updatedProducts);
      setSelectedFileObj(null);

      // Persist changes
      hybridStorage.saveProducts(updatedProducts)
        .catch(err => console.error("Error saving after container deletion:", err));

      console.log(`${type} "${containerLabel}" deleted successfully`);
      setToastMsg(`${type} "${containerLabel}" deleted successfully`);

    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      setToastMsg(`Failed to delete ${type}: ${error.message}`);
    }
  }

  // /* UPLOAD => check stage is selected, else show toast */
  // function handlePlusClick() {
  //   const prod = products[selectedProductIndex];
  //   if (!prod.selectedStage) {
  //     setToastMsg('Please select a Stage/Iteration first!');
  //     return;
  //   }
  //   hiddenFileInput.current.click();
  // }
  /* UPLOAD => check container is selected, else show toast */
  function handlePlusClick() {
    const prod = products[selectedProductIndex];
    
    // Check if a container (stage or iteration) is selected
    if (!prod.selectedContainer || !prod.containerType) {
      setToastMsg('Please select a Stage or Iteration first!');
      return;
    }
    
    // Additional validation to ensure we have a valid container
    if (!selectedContainer || !containerType) {
      setToastMsg('Please select a Stage or Iteration first!');
      return;
    }
    
    hiddenFileInput.current.click();
  }

  // /* Handle right-click on file name */
  // function handleFileRightClick(e, fileObj) {
  //   e.preventDefault(); // Prevent default context menu
  //   e.stopPropagation(); // Prevent row click
    
  //   // Show custom context menu
  //   setContextMenu({
  //     visible: true,
  //     x: e.clientX,
  //     y: e.clientY,
  //     fileObj: fileObj
  //   });
  // }
  /* Handle right-click on file name */
  function handleFileRightClick(e, fileObj) {
    e.preventDefault(); // Prevent default context menu
    e.stopPropagation(); // Prevent row click
    
    // Show custom context menu
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      fileObj: fileObj
    });
    
    // Optional: Log for debugging
    console.log('Context menu opened for file:', fileObj.name, 'Container:', fileObj.container_type, fileObj.container_id);
  }

//   /* Handle move option */
// function handleMoveOption() {
//   if (contextMenu.fileObj) {
//     // Store the file to be moved
//     const fileToMove = contextMenu.fileObj;
//     hideContextMenu();
    
//     // Ask which stage to move to
//     const targetStage = prompt('Enter stage to move file to (e.g., S1, i2):');
//     if (!targetStage) return;
    
//     // Check if target stage exists
//     const prod = products[selectedProductIndex];
//     if (!prod.filesByStage.hasOwnProperty(targetStage)) {
//       setToastMsg(`Stage ${targetStage} does not exist!`);
//       return;
//     }
    
//     // Create proper deep copies
//     const updatedProducts = [...products];
//     const updatedProduct = {...updatedProducts[selectedProductIndex]};
//     updatedProducts[selectedProductIndex] = updatedProduct;
    
//     const currentStage = updatedProduct.selectedStage;
//     updatedProduct.filesByStage = {...updatedProduct.filesByStage};
    
//     // Copy array references
//     updatedProduct.filesByStage[currentStage] = [...updatedProduct.filesByStage[currentStage]];
//     if (!updatedProduct.filesByStage[targetStage]) {
//       updatedProduct.filesByStage[targetStage] = [];
//     } else {
//       updatedProduct.filesByStage[targetStage] = [...updatedProduct.filesByStage[targetStage]];
//     }
    
//     // Find file and its child files (if any)
//     const filesToMove = [];
    
//     // If this is a parent file, also move its children
//     if (!fileToMove.isChildFile) {
//       // Get the file index
//       const fileIndex = updatedProduct.filesByStage[currentStage].findIndex(
//         f => f.id === fileToMove.id
//       );
      
//       if (fileIndex === -1) {
//         setToastMsg('File not found.');
//         return;
//       }
      
//       // Copy the file
//       const fileCopy = {...updatedProduct.filesByStage[currentStage][fileIndex]};
//       filesToMove.push(fileCopy);
      
//       // Find any child files
//       const childFiles = updatedProduct.filesByStage[currentStage].filter(
//         f => f.parentId === fileToMove.id
//       );
      
//       // Copy the child files
//       filesToMove.push(...childFiles.map(f => ({...f})));
      
//       // Remove the files from current stage (in reverse to not mess up indices)
//       const fileIdsToRemove = [fileToMove.id, ...childFiles.map(f => f.id)];
//       updatedProduct.filesByStage[currentStage] = updatedProduct.filesByStage[currentStage].filter(
//         f => !fileIdsToRemove.includes(f.id)
//       );
//     } else {
//       // For child files, just move the single file
//       const fileIndex = updatedProduct.filesByStage[currentStage].findIndex(
//         f => f.id === fileToMove.id
//       );
      
//       if (fileIndex === -1) {
//         setToastMsg('File not found.');
//         return;
//       }
      
//       // Copy the file
//       const fileCopy = {...updatedProduct.filesByStage[currentStage][fileIndex]};
//       filesToMove.push(fileCopy);
      
//       // Remove from current stage
//       updatedProduct.filesByStage[currentStage] = updatedProduct.filesByStage[currentStage].filter(
//         f => f.id !== fileToMove.id
//       );
      
//       // Also update parent's childFiles array if necessary
//       const parentFile = updatedProduct.filesByStage[currentStage].find(
//         f => f.id === fileToMove.parentId
//       );
      
//       if (parentFile) {
//         const updatedParentFile = {...parentFile};
//         updatedParentFile.childFiles = updatedParentFile.childFiles.filter(
//           id => id !== fileToMove.id
//         );
        
//         // Replace parent file in the stage
//         const parentIndex = updatedProduct.filesByStage[currentStage].findIndex(
//           f => f.id === fileToMove.parentId
//         );
        
//         if (parentIndex !== -1) {
//           updatedProduct.filesByStage[currentStage][parentIndex] = updatedParentFile;
//         }
//       }
//     }
    
//     // Add files to target stage
//     updatedProduct.filesByStage[targetStage].push(...filesToMove);
    
//     // Update state
//     setProducts(updatedProducts);
    
//     // Clear selected file if it was moved
//     if (selectedFileObj && selectedFileObj.id === fileToMove.id) {
//       setSelectedFileObj(null);
//     }
    
//     setToastMsg(`File moved to ${targetStage}`);
//   }
//   hideContextMenu();
// }
/* Handle move option */
  async function handleMoveOption() {
    if (!contextMenu.fileObj) {
      hideContextMenu();
      return;
    }

    const fileToMove = contextMenu.fileObj;
    hideContextMenu();
    
    // Get available containers for this product
    const prod = products[selectedProductIndex];
    const availableContainers = [];
    
    // Add stages
    (prod.stages || []).forEach(stage => {
      availableContainers.push({
        id: stage.id,
        label: stage.stage_id,
        name: stage.name,
        type: 'stage'
      });
    });
    
    // Add iterations
    (prod.iterations || []).forEach(iteration => {
      availableContainers.push({
        id: iteration.id,
        label: iteration.iteration_id,
        name: iteration.name,
        type: 'iteration'
      });
    });
    
    if (availableContainers.length === 0) {
      setToastMsg('No stages or iterations available to move to!');
      return;
    }
    
    // Show available containers to user
    const containerList = availableContainers.map(c => `${c.label} (${c.name})`).join(', ');
    const targetLabel = prompt(`Enter container to move file to.\nAvailable: ${containerList}\n\nEnter (e.g., S1, I2):`);
    
    if (!targetLabel) return;
    
    // Find target container
    const targetContainer = availableContainers.find(c => 
      c.label.toLowerCase() === targetLabel.toLowerCase()
    );
    
    if (!targetContainer) {
      setToastMsg(`Container ${targetLabel} does not exist!`);
      return;
    }
    
    // Check if trying to move to same container
    const currentContainerType = fileToMove.container_type;
    const currentContainerId = fileToMove.container_id;
    
    if (currentContainerType === targetContainer.type && 
        currentContainerId === targetContainer.label) {
      setToastMsg('File is already in that container!');
      return;
    }

    try {
      // Update file on backend
      const updateData = {};
      
      if (targetContainer.type === 'stage') {
        updateData.stage_id = targetContainer.id;
      } else if (targetContainer.type === 'iteration') {
        updateData.iteration_id = targetContainer.id;
      }

      const response = await fetch(`/api/files/${fileToMove.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Failed to move file: ${response.statusText}`);
      }

      const updatedFile = await response.json();
      console.log('File moved successfully:', updatedFile);

      // Update local state
      const updatedProducts = [...products];
      const updatedProduct = {...updatedProducts[selectedProductIndex]};
      updatedProducts[selectedProductIndex] = updatedProduct;
      
      updatedProduct.filesByContainer = {...updatedProduct.filesByContainer};
      
      // Remove from current container
      const currentContainerKey = `${fileToMove.container_type}_${fileToMove.container_id}`;
      if (updatedProduct.filesByContainer[currentContainerKey]) {
        updatedProduct.filesByContainer[currentContainerKey] = 
          updatedProduct.filesByContainer[currentContainerKey].filter(f => f.id !== fileToMove.id);
      }
      
      // Add to target container
      const targetContainerKey = `${targetContainer.type}_${targetContainer.id}`;
      if (!updatedProduct.filesByContainer[targetContainerKey]) {
        updatedProduct.filesByContainer[targetContainerKey] = [];
      }
      
      // Update file object with new container info
      const movedFile = {
        ...fileToMove,
        container_type: targetContainer.type,
        container_id: targetContainer.label,
        // Update other fields from backend response
        ...updatedFile
      };
      
      updatedProduct.filesByContainer[targetContainerKey] = [
        ...updatedProduct.filesByContainer[targetContainerKey],
        movedFile
      ];

      // Handle child files if this is a parent file
      if (fileToMove.child_files && fileToMove.child_files.length > 0) {
        // Move child files as well
        for (const childFile of fileToMove.child_files) {
          try {
            const childResponse = await fetch(`/api/files/${childFile.id}/`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updateData)
            });

            if (childResponse.ok) {
              const updatedChildFile = await childResponse.json();
              
              // Remove child from current container
              if (updatedProduct.filesByContainer[currentContainerKey]) {
                updatedProduct.filesByContainer[currentContainerKey] = 
                  updatedProduct.filesByContainer[currentContainerKey].filter(f => f.id !== childFile.id);
              }
              
              // Add child to target container
              const movedChildFile = {
                ...childFile,
                container_type: targetContainer.type,
                container_id: targetContainer.label,
                ...updatedChildFile
              };
              
              updatedProduct.filesByContainer[targetContainerKey].push(movedChildFile);
            }
          } catch (childError) {
            console.error('Error moving child file:', childError);
          }
        }
      }
      
      // Update state
      setProducts(updatedProducts);
      
      // Clear selected file if it was moved
      if (selectedFileObj && selectedFileObj.id === fileToMove.id) {
        setSelectedFileObj(null);
      }
      
      // Persist changes
      hybridStorage.saveProducts(updatedProducts)
        .catch(err => console.error("Error saving after file move:", err));
      
      setToastMsg(`File moved to ${targetContainer.label} (${targetContainer.name})`);

    } catch (error) {
      console.error('Error moving file:', error);
      setToastMsg(`Failed to move file: ${error.message}`);
    }
  }

/* Handle remove option */
async function handleRemoveOption() {
  if (!contextMenu.fileObj) {
    hideContextMenu();
    return;
  }

  const fileToRemove = contextMenu.fileObj;
  
  // Confirm deletion
  const confirmMessage = fileToRemove.is_child_file
    ? `Remove this child file "${fileToRemove.name}"?`
    : `Remove this file "${fileToRemove.name}" and all its child files?`;
  
  if (!window.confirm(confirmMessage)) {
    hideContextMenu();
    return;
  }

  try {
    // Collect all files to delete (parent + children)
    const filesToDelete = [fileToRemove.id];
    
    if (!fileToRemove.is_child_file && fileToRemove.child_files && fileToRemove.child_files.length > 0) {
      // Add child file IDs
      filesToDelete.push(...fileToRemove.child_files.map(child => child.id));
    }

    // Delete files from backend
    const deletePromises = filesToDelete.map(fileId => 
      fetch(`/api/files/${fileId}/`, {
        method: 'DELETE'
      })
    );

    const responses = await Promise.all(deletePromises);
    
    // Check if all deletions were successful
    const failedDeletions = responses.filter(response => !response.ok);
    if (failedDeletions.length > 0) {
      throw new Error(`Failed to delete ${failedDeletions.length} file(s)`);
    }

    console.log(`Successfully deleted ${filesToDelete.length} file(s) from backend`);

    // Update local state
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    updatedProduct.filesByContainer = {...updatedProduct.filesByContainer};
    
    // Get current container key
    const containerKey = `${fileToRemove.container_type}_${getCurrentContainerIdFromFile(fileToRemove)}`;
    
    if (updatedProduct.filesByContainer[containerKey]) {
      // Remove all files (parent + children) from local state
      updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];
      updatedProduct.filesByContainer[containerKey] = updatedProduct.filesByContainer[containerKey].filter(
        f => !filesToDelete.includes(f.id)
      );
    }

    // Update state
    setProducts(updatedProducts);
    
    // Clear selected file if it was removed
    if (selectedFileObj && filesToDelete.includes(selectedFileObj.id)) {
      setSelectedFileObj(null);
    }
    
    // Persist changes
    hybridStorage.saveProducts(updatedProducts)
      .catch(err => console.error("Error saving after file deletion:", err));
    
    // Show success message
    if (!fileToRemove.is_child_file && fileToRemove.child_files && fileToRemove.child_files.length > 0) {
      setToastMsg(`File and ${fileToRemove.child_files.length} child files removed`);
    } else {
      setToastMsg(fileToRemove.is_child_file ? 'Child file removed' : 'File removed');
    }

  } catch (error) {
    console.error('Error removing file(s):', error);
    setToastMsg(`Failed to remove file: ${error.message}`);
  }
  
  hideContextMenu();
}

// Helper function to get container ID from file object
function getCurrentContainerIdFromFile(fileObj) {
  // The container_id in the file object might be the label (S1, I1) or the actual database ID
  // We need to map this to the database ID for the container key
  const prod = products[selectedProductIndex];
  
  if (fileObj.container_type === 'stage') {
    const stage = prod.stages?.find(s => s.stage_id === fileObj.container_id);
    return stage ? stage.id : fileObj.container_id;
  } else if (fileObj.container_type === 'iteration') {
    const iteration = prod.iterations?.find(i => i.iteration_id === fileObj.container_id);
    return iteration ? iteration.id : fileObj.container_id;
  }
  
  return fileObj.container_id;
}

  /* Hide context menu */
  function hideContextMenu() {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      fileObj: null
    });
  }

  /* Handle upload from context menu */
  function handleContextMenuUpload() {
    // Store the file object for reference
    if (contextMenu.fileObj) {
      setCurrentFileForModal(contextMenu.fileObj);
      contextMenuFileInput.current.click();
    }
    hideContextMenu();
  }

  /* Handle quantity option */
  function handleQuantityOption() {
    if (contextMenu.fileObj) {
      setCurrentFileForModal(contextMenu.fileObj);
      setShowQuantityModal(true);
    }
    hideContextMenu();
  }

  /* Handle price option */
  function handlePriceOption() {
    if (contextMenu.fileObj) {
      setCurrentFileForModal(contextMenu.fileObj);
      setShowPriceModal(true);
    }
    hideContextMenu();
  }

  /* Handle clicking on quantity badge */
  function handleQuantityClick(e, fileObj) {
    e.stopPropagation(); // Don't select the file
    setCurrentFileForModal(fileObj);
    setShowQuantityModal(true);
  }

  /* Handle clicking on price badge */
  function handlePriceClick(e, fileObj) {
    e.stopPropagation(); // Don't select the file
    setCurrentFileForModal(fileObj);
    setShowPriceModal(true);
  }
  
  /* Handle status change */
  // function handleStatusChange(fileObj, newStatus) {
  //   // Create proper deep copies
  //   const updatedProducts = [...products];
  //   const updatedProduct = {...updatedProducts[selectedProductIndex]};
  //   updatedProducts[selectedProductIndex] = updatedProduct;
    
  //   const stage = updatedProduct.selectedStage;
  //   updatedProduct.filesByStage = {...updatedProduct.filesByStage};
  //   updatedProduct.filesByStage[stage] = [...updatedProduct.filesByStage[stage]];
    
  //   // Find the file
  //   const fileIndex = updatedProduct.filesByStage[stage].findIndex(f => f.id === fileObj.id);
  //   if (fileIndex === -1) return;
    
  //   // Update the file with new status
  //   const updatedFile = {...updatedProduct.filesByStage[stage][fileIndex]};
  //   updatedFile.status = newStatus;
  //   updatedProduct.filesByStage[stage][fileIndex] = updatedFile;
    
  //   // If this is a parent file, update its selected_revision_obj as well
  //   if (updatedFile.revisions && updatedFile.selected_revision_obj) {
  //     updatedFile.revisions = [...updatedFile.revisions]; // Create a new array
  //     const revIndex = updatedFile.revisions.findIndex(
  //       rev => rev.rev_number === updatedFile.current_revision
  //     );
  //     if (revIndex !== -1) {
  //       updatedFile.revisions[revIndex] = {
  //         ...updatedFile.revisions[revIndex],
  //         status: newStatus
  //       };
  //       updatedFile.selected_revision_obj = {
  //         ...updatedFile.selected_revision_obj,
  //         status: newStatus
  //       };
  //     }
  //   }
    
  //   // Update state
  //   setProducts(updatedProducts);
    
  //   // If this is the selected file, update it
  //   if (selectedFileObj && selectedFileObj.id === fileObj.id) {
  //     setSelectedFileObj(updatedFile);
  //   }
    
  //   setToastMsg(`Status updated to ${newStatus}`);
  // }
  /* Handle status change */
  async function handleStatusChange(fileObj, newStatus) {
    try {
      // Update status on backend
      const response = await fetch(`/api/files/${fileObj.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.statusText}`);
      }

      const updatedFile = await response.json();
      console.log('Status updated on backend:', updatedFile);

      // Update local state
      const updatedProducts = [...products];
      const updatedProduct = {...updatedProducts[selectedProductIndex]};
      updatedProducts[selectedProductIndex] = updatedProduct;
      
      updatedProduct.filesByContainer = {...updatedProduct.filesByContainer};
      
      // Build container key using the new container_db_id field
      const containerKey = `${fileObj.container_type}_${fileObj.container_db_id}`;
      
      if (updatedProduct.filesByContainer[containerKey]) {
        updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];
        
        // Find and update the file
        const fileIndex = updatedProduct.filesByContainer[containerKey].findIndex(f => f.id === fileObj.id);
        if (fileIndex !== -1) {
          // Update with the fresh data from backend
          updatedProduct.filesByContainer[containerKey][fileIndex] = {
            ...updatedProduct.filesByContainer[containerKey][fileIndex],
            ...updatedFile
          };
        }
      }
      
      // Update state
      setProducts(updatedProducts);
      
      // If this is the selected file, update it with fresh data
      if (selectedFileObj && selectedFileObj.id === fileObj.id) {
        setSelectedFileObj(updatedFile);
      }
      
      // Persist changes
      hybridStorage.saveProducts(updatedProducts)
        .catch(err => console.error("Error saving after status update:", err));
      
      setToastMsg(`Status updated to ${newStatus}`);

    } catch (error) {
      console.error('Error updating status:', error);
      setToastMsg(`Failed to update status: ${error.message}`);
    }
  }

  // /* Handle adding child file */
 
/* Handle adding child file */
  function handleAddChildClick(e, fileObj) {
    e.stopPropagation(); // Don't select the parent file
    e.preventDefault(); // Prevent any default behavior
    
    // Only parent files can have children (not child files themselves)
    if (fileObj.is_child_file) {
      setToastMsg('Child files cannot have their own children');
      return;
    }

    // Set the parent file and then trigger the file input click
    setParentFileForChild(fileObj);
    
    // Use setTimeout to ensure state is updated before clicking
    setTimeout(() => {
      if (childFileInput.current) {
        childFileInput.current.click();
      }
    }, 0);
  }

   /* Handle child file upload */
  async function handleChildFileChange(e) {
    const file = e.target.files[0];
    if (!file || !parentFileForChild) {
      e.target.value = '';
      return;
    }

    const prod = products[selectedProductIndex];
    if (!prod.selectedContainer || !prod.containerType) {
      setToastMsg('No container (stage/iteration) selected yet.');
      e.target.value = '';
      return;
    }

    setIsLoading(true);
    setToastMsg('');

    try {
      // Upload to server first (no placeholder needed)
      const formData = new FormData();
      formData.append('uploaded_file', file);
      formData.append('original_name', file.name);
      formData.append('is_child_file', 'true');
      formData.append('parent_id', parentFileForChild.id);
      
      // Add container ID based on type
      if (prod.containerType === 'stage') {
        formData.append('stage_id', prod.selectedContainer.id);
      } else if (prod.containerType === 'iteration') {
        formData.append('iteration_id', prod.selectedContainer.id);
      }
      
      formData.append('change_description', 'Initial child file upload');

      const response = await fetch('/api/files/', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const savedChildFile = await response.json();
      console.log('Child file uploaded successfully:', savedChildFile);

      // Update local state with the new child file
      const updatedProducts = [...products];
      const updatedProduct = { ...updatedProducts[selectedProductIndex] };
      updatedProducts[selectedProductIndex] = updatedProduct;

      updatedProduct.filesByContainer = { ...updatedProduct.filesByContainer };
      
      // Build container key
      const containerKey = `${prod.containerType}_${prod.selectedContainer.id}`;
      
      if (!updatedProduct.filesByContainer[containerKey]) {
        updatedProduct.filesByContainer[containerKey] = [];
      } else {
        updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];
      }

      // Create child file object from backend response
      const childFileObj = {
        ...savedChildFile,
        // Add dataUrl for preview if needed
        dataUrl: await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
      };

      // Add child file to container
      updatedProduct.filesByContainer[containerKey].push(childFileObj);

      // Update parent file's child_files array
      const parentFileIndex = updatedProduct.filesByContainer[containerKey].findIndex(
        f => f.id === parentFileForChild.id && !f.is_child_file
      );

      if (parentFileIndex !== -1) {
        const updatedParentFile = { ...updatedProduct.filesByContainer[containerKey][parentFileIndex] };
        
        // Ensure child_files array exists and add new child
        if (!updatedParentFile.child_files) {
          updatedParentFile.child_files = [];
        }
        updatedParentFile.child_files = [...updatedParentFile.child_files, childFileObj];
        
        updatedProduct.filesByContainer[containerKey][parentFileIndex] = updatedParentFile;
      }

      // Update state
      setProducts(updatedProducts);
      setSelectedFileObj(childFileObj);

      // Persist changes
      hybridStorage.saveProducts(updatedProducts)
        .catch(err => console.error("Error saving after child file upload:", err));

      setToastMsg(`Child file "${file.name}" added to "${parentFileForChild.name}"`);

      // Optional: Open change description modal for additional details
      setTimeout(() => {
        setCurrentFileForModal(childFileObj);
        setTempChangeDescription('');
        setShowChangeDescriptionModal(true);
        console.log('Opening change description modal for new child file');
      }, 100);

    } catch (err) {
      console.error('Error uploading child file:', err);
      setToastMsg(`Error uploading child file: ${err.message}`);
    } finally {
      setIsLoading(false);
      e.target.value = '';
      setParentFileForChild(null);
    }
  }
  
  /* Handle child file revision change */
   function handleChildRevisionChange(childFileObj, revisionNumber) {
  // Find the revision object
  const revision = childFileObj.revisions.find(rev => rev.revision_number === revisionNumber);
  if (!revision) return;
  
  // Create proper deep copies
  const updatedProducts = [...products];
  const updatedProduct = {...updatedProducts[selectedProductIndex]};
  updatedProducts[selectedProductIndex] = updatedProduct;
  
  // Use container-based file storage
  updatedProduct.filesByContainer = {...updatedProduct.filesByContainer};
  
  // Build container key using container_db_id
  const containerKey = `${childFileObj.container_type}_${childFileObj.container_db_id}`;
  
  if (!updatedProduct.filesByContainer[containerKey]) return;
  
  updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];
  
  // Find the child file
  const childFileIndex = updatedProduct.filesByContainer[containerKey].findIndex(f => f.id === childFileObj.id);
  if (childFileIndex === -1) return;
  
  // Make a copy of the child file
  const updatedChildFile = {...updatedProduct.filesByContainer[containerKey][childFileIndex]};
  updatedProduct.filesByContainer[containerKey][childFileIndex] = updatedChildFile;
  
  // Set the current revision
  updatedChildFile.current_revision = revisionNumber;
  updatedChildFile.selected_revision_obj = revision;
  
  // Update state
  setProducts(updatedProducts);
  
  // If this is the selected file, update it
  if (selectedFileObj && selectedFileObj.id === childFileObj.id) {
    setSelectedFileObj(updatedChildFile);
  }
  
  // Persist changes
  hybridStorage.saveProducts(updatedProducts)
    .catch(err => console.error("Error saving after revision change:", err));
}

  /* FILE SELECT (UPLOAD) - Fixed version that properly handles all file types */
  async function handleFileChange(e) {
  const file = e.target.files[0];
  if (!file) {
    e.target.value = '';
    return;
  }

  const prod = products[selectedProductIndex];
  if (!prod.selectedContainer || !prod.containerType) {
    setToastMsg('No container (stage/iteration) selected yet.');
    e.target.value = '';
    return;
  }

  setIsLoading(true);
  setToastMsg('');

  try {
    // Upload to server first (backend handles revision logic)
    const formData = new FormData();
    formData.append('uploaded_file', file);
    formData.append('original_name', file.name);
    formData.append('is_child_file', 'false'); // Explicitly mark as parent file
    
    // Add container ID based on type
    if (prod.containerType === 'stage') {
      formData.append('stage_id', prod.selectedContainer.id);
    } else if (prod.containerType === 'iteration') {
      formData.append('iteration_id', prod.selectedContainer.id);
    }
    
    formData.append('change_description', 'Initial file upload');
    formData.append('status', 'in_work');
    formData.append('quantity', '1');

    const response = await fetch('/api/files/', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const savedFile = await response.json();
    console.log('File uploaded successfully:', savedFile);

    // Create dataURL for preview
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(error);
      };
      reader.readAsDataURL(file);
    });

    // Update local state with the backend response
    const updatedProducts = [...products];
    const updatedProduct = { ...updatedProducts[selectedProductIndex] };
    updatedProducts[selectedProductIndex] = updatedProduct;

    updatedProduct.filesByContainer = { ...updatedProduct.filesByContainer };
    
    // Build container key
    const containerKey = `${prod.containerType}_${prod.selectedContainer.id}`;
    
    if (!updatedProduct.filesByContainer[containerKey]) {
      updatedProduct.filesByContainer[containerKey] = [];
    } else {
      updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];
    }

    // Check if this is a new file or revision
    const existingFileIndex = updatedProduct.filesByContainer[containerKey].findIndex(
      f => f.name === file.name && !f.is_child_file
    );

    // Create file object from backend response
    const fileObj = {
      ...savedFile,
      dataUrl, // Add dataURL for preview
    };

    let fileToSelect;
    let isNewRevision = false;

    if (existingFileIndex !== -1 && savedFile.revision > 1) {
      // This is a revision - update existing file
      const existingFile = { ...updatedProduct.filesByContainer[containerKey][existingFileIndex] };
      
      // Update with new revision data
      existingFile.current_revision = savedFile.revision;
      existingFile.dataUrl = dataUrl;
      existingFile.updated_at = savedFile.created_at;
      existingFile.file_path = savedFile.file_path;
      existingFile.latest_revision = savedFile.latest_revision;
      
      // Add to revisions array if it exists
      if (existingFile.revisions) {
        existingFile.revisions = [...existingFile.revisions, savedFile.latest_revision];
      }

      updatedProduct.filesByContainer[containerKey][existingFileIndex] = existingFile;
      fileToSelect = existingFile;
      isNewRevision = true;

      setToastMsg(`New revision (Rev ${savedFile.revision}) created!`);
    } else {
      // This is a new file
      updatedProduct.filesByContainer[containerKey].push(fileObj);
      fileToSelect = fileObj;

      setToastMsg('File uploaded successfully!');
    }

    // Update state
    setProducts(updatedProducts);
    setSelectedFileObj(fileToSelect);

    // Persist changes
    hybridStorage.saveProducts(updatedProducts)
      .catch(err => console.error("Error saving after file upload:", err));

    // Open change description modal for additional details
    setTimeout(() => {
      setCurrentFileForModal(fileToSelect);
      setTempChangeDescription('');
      setShowChangeDescriptionModal(true);
      console.log("Opening change description modal for new file upload");
    }, 100);

    console.log('File uploaded and local state updated successfully');

  } catch (err) {
    console.error('Error uploading file:', err);
    setToastMsg('Error uploading file: ' + (err.message || 'Unknown error'));
  } finally {
    setIsLoading(false);
    e.target.value = '';
  }
}

  /* Handle context menu upload - Fixed version for uploading revisions */
  async function handleContextMenuFileChange(e) {
    const file = e.target.files[0];
    if (!file || !currentFileForModal) {
      e.target.value = '';
      return;
    }

    const prod = products[selectedProductIndex];
    if (!prod.selectedContainer || !prod.containerType) {
      setToastMsg('No container (stage/iteration) selected yet.');
      e.target.value = '';
      return;
    }

    setIsLoading(true);
    setToastMsg('');

    try {
      // Upload to server first (backend handles revision logic)
      const formData = new FormData();
      formData.append('uploaded_file', file);
      formData.append('original_name', currentFileForModal.name);
      formData.append('is_child_file', currentFileForModal.is_child_file ? 'true' : 'false');
      
      // Add container ID based on type
      if (prod.containerType === 'stage') {
        formData.append('stage_id', prod.selectedContainer.id);
      } else if (prod.containerType === 'iteration') {
        formData.append('iteration_id', prod.selectedContainer.id);
      }
      
      formData.append('change_description', 'File revision from context menu');
      formData.append('status', 'in_work');
      
      // Add parent info for child files
      if (currentFileForModal.is_child_file && currentFileForModal.parent_file) {
        formData.append('parent_id', currentFileForModal.parent_file);
      }
      
      // Add price if exists
      if (currentFileForModal.price) {
        formData.append('price', currentFileForModal.price);
      }

      const response = await fetch('/api/files/', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const savedFile = await response.json();
      console.log('File revision uploaded successfully:', savedFile);

      // Create dataURL for preview
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          reject(error);
        };
        reader.readAsDataURL(file);
      });

      // Update local state
      const updatedProducts = [...products];
      const updatedProduct = {...updatedProducts[selectedProductIndex]};
      updatedProducts[selectedProductIndex] = updatedProduct;
      
      updatedProduct.filesByContainer = {...updatedProduct.filesByContainer};
      
      // Build container key using container_db_id
      const containerKey = `${currentFileForModal.container_type}_${currentFileForModal.container_db_id}`;
      
      if (!updatedProduct.filesByContainer[containerKey]) {
        setToastMsg('Container not found in current product');
        setIsLoading(false);
        e.target.value = '';
        return;
      }

      updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];

      // Find the existing file
      const existingFileIndex = updatedProduct.filesByContainer[containerKey].findIndex(
        f => f.id === currentFileForModal.id
      );

      if (existingFileIndex === -1) {
        setToastMsg('File not found in current container');
        setIsLoading(false);
        e.target.value = '';
        return;
      }

      // Update existing file with new revision data
      const existingFile = {...updatedProduct.filesByContainer[containerKey][existingFileIndex]};
      
      // Update with backend response data
      existingFile.current_revision = savedFile.revision || savedFile.current_revision;
      existingFile.dataUrl = dataUrl; // Add preview
      existingFile.updated_at = savedFile.created_at || savedFile.updated_at;
      existingFile.file_path = savedFile.file_path;
      existingFile.latest_revision = savedFile.latest_revision;
      
      // Add to revisions array if it exists and is new
      if (existingFile.revisions && savedFile.latest_revision) {
        // Check if this revision already exists
        const revisionExists = existingFile.revisions.some(
          rev => rev.revision_number === savedFile.latest_revision.revision_number
        );
        
        if (!revisionExists) {
          existingFile.revisions = [...existingFile.revisions, savedFile.latest_revision];
        }
      }

      // Update file in container
      updatedProduct.filesByContainer[containerKey][existingFileIndex] = existingFile;
      
      // Update state
      setProducts(updatedProducts);
      setSelectedFileObj(existingFile);

      // Persist changes
      hybridStorage.saveProducts(updatedProducts)
        .catch(err => console.error("Error saving after revision upload:", err));
      
      // Show success message
      const revisionNumber = savedFile.revision || savedFile.current_revision;
      const fileType = currentFileForModal.is_child_file ? 'child file' : 'file';
      setToastMsg(`New revision (Rev ${revisionNumber}) created for ${fileType} ${existingFile.name}!`);
      
      // Show change description modal for additional details
      setTimeout(() => {
        setCurrentFileForModal(existingFile);
        setTempChangeDescription('');
        setShowChangeDescriptionModal(true);
        console.log("Opening change description modal for file revision");
      }, 100);

    } catch (err) {
      console.error('Error uploading file revision:', err);
      setToastMsg('Error uploading revision: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
      e.target.value = '';
      setCurrentFileForModal(null);
    }
  }

  /* Handle quantity update */
  async function handleQuantityUpdate(quantity) {
  if (!currentFileForModal) return;
  
  try {
    // Update quantity on backend
    const response = await fetch(`/api/files/${currentFileForModal.id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quantity: quantity
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update quantity: ${response.statusText}`);
    }

    const updatedFile = await response.json();
    console.log('Quantity updated on backend:', updatedFile);

    // Update local state
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    updatedProduct.filesByContainer = {...updatedProduct.filesByContainer};
    
    // Build container key using container_db_id
    const containerKey = `${currentFileForModal.container_type}_${currentFileForModal.container_db_id}`;
    
    if (updatedProduct.filesByContainer[containerKey]) {
      updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];
      
      // Find and update the file
      const fileIndex = updatedProduct.filesByContainer[containerKey].findIndex(f => f.id === currentFileForModal.id);
      if (fileIndex !== -1) {
        // Update with fresh data from backend
        updatedProduct.filesByContainer[containerKey][fileIndex] = {
          ...updatedProduct.filesByContainer[containerKey][fileIndex],
          ...updatedFile
        };
      }
    }
    
    // Update state
    setProducts(updatedProducts);
    
    // If this is the selected file, update it with fresh data
    if (selectedFileObj && selectedFileObj.id === currentFileForModal.id) {
      setSelectedFileObj(updatedFile);
    }
    
    // Persist changes
    hybridStorage.saveProducts(updatedProducts)
      .catch(err => console.error("Error saving after quantity update:", err));
    
    setToastMsg(`Quantity updated to ${quantity} for ${updatedFile.name}`);
    setShowQuantityModal(false);
    setCurrentFileForModal(null);

  } catch (error) {
    console.error('Error updating quantity:', error);
    setToastMsg(`Failed to update quantity: ${error.message}`);
  }
}

  /* Handle change description update */
  async function handleChangeDescriptionUpdate(description) {
  if (!currentFileForModal) {
    console.error("No file selected for change description update");
    setShowChangeDescriptionModal(false);
    return;
  }
  
  try {
    // Update the latest revision's description on backend
    const latestRevision = currentFileForModal.latest_revision;
    if (!latestRevision) {
      throw new Error("No latest revision found for this file");
    }

    const response = await fetch(`/api/file-revisions/${latestRevision.id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: description
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update description: ${response.statusText}`);
    }

    const updatedRevision = await response.json();
    console.log('Description updated on backend:', updatedRevision);

    // Update local state
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    updatedProduct.filesByContainer = {...updatedProduct.filesByContainer};
    
    // Build container key using container_db_id
    const containerKey = `${currentFileForModal.container_type}_${currentFileForModal.container_db_id}`;
    
    if (updatedProduct.filesByContainer[containerKey]) {
      updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];
      
      // Find and update the file
      const fileIndex = updatedProduct.filesByContainer[containerKey].findIndex(f => f.id === currentFileForModal.id);
      if (fileIndex !== -1) {
        const updatedFile = {...updatedProduct.filesByContainer[containerKey][fileIndex]};
        
        // Update latest revision with new description
        if (updatedFile.latest_revision) {
          updatedFile.latest_revision = {
            ...updatedFile.latest_revision,
            description: description
          };
        }
        
        // Update revisions array if it exists
        if (updatedFile.revisions) {
          updatedFile.revisions = updatedFile.revisions.map(rev => 
            rev.id === latestRevision.id 
              ? { ...rev, description: description }
              : rev
          );
        }
        
        updatedProduct.filesByContainer[containerKey][fileIndex] = updatedFile;
      }
    }
    
    // Update state
    setProducts(updatedProducts);
    
    // If this is the selected file, update it
    if (selectedFileObj && selectedFileObj.id === currentFileForModal.id) {
      // Update the selected file with the new description
      const updatedSelectedFile = {
        ...selectedFileObj,
        latest_revision: {
          ...selectedFileObj.latest_revision,
          description: description
        }
      };
      setSelectedFileObj(updatedSelectedFile);
    }
    
    // Persist changes
    hybridStorage.saveProducts(updatedProducts)
      .catch(err => console.error("Error saving after description update:", err));
    
    setToastMsg(`Change description updated for ${currentFileForModal.name}`);
    setShowChangeDescriptionModal(false);
    setCurrentFileForModal(null);

  } catch (error) {
    console.error('Error updating change description:', error);
    setToastMsg(`Failed to update description: ${error.message}`);
    setShowChangeDescriptionModal(false);
    setCurrentFileForModal(null);
  }
}
  /* Handle price update */
  async function handlePriceUpdate(price) {
  if (!currentFileForModal) return;
  
  try {
    // Update price on both file and latest revision
    const updatePromises = [];
    
    // Update file price
    updatePromises.push(
      fetch(`/api/files/${currentFileForModal.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: price
        })
      })
    );
    
    // Update latest revision price if it exists
    if (currentFileForModal.latest_revision?.id) {
      updatePromises.push(
        fetch(`/api/file-revisions/${currentFileForModal.latest_revision.id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            price: price
          })
        })
      );
    }

    const responses = await Promise.all(updatePromises);
    
    // Check if all updates were successful
    const failedUpdates = responses.filter(response => !response.ok);
    if (failedUpdates.length > 0) {
      throw new Error(`Failed to update price: ${failedUpdates.length} update(s) failed`);
    }

    const [updatedFile, updatedRevision] = await Promise.all(
      responses.map(response => response.json())
    );
    
    console.log('Price updated on backend:', { file: updatedFile, revision: updatedRevision });

    // Update local state
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    updatedProduct.filesByContainer = {...updatedProduct.filesByContainer};
    
    // Build container key using container_db_id
    const containerKey = `${currentFileForModal.container_type}_${currentFileForModal.container_db_id}`;
    
    if (updatedProduct.filesByContainer[containerKey]) {
      updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];
      
      // Find and update the file
      const fileIndex = updatedProduct.filesByContainer[containerKey].findIndex(f => f.id === currentFileForModal.id);
      if (fileIndex !== -1) {
        // Update with fresh data from backend
        const fileToUpdate = {
          ...updatedProduct.filesByContainer[containerKey][fileIndex],
          ...updatedFile
        };
        
        // Update latest revision if we have updated revision data
        if (updatedRevision && fileToUpdate.latest_revision) {
          fileToUpdate.latest_revision = {
            ...fileToUpdate.latest_revision,
            ...updatedRevision
          };
        }
        
        // Update revisions array if it exists
        if (fileToUpdate.revisions && updatedRevision) {
          fileToUpdate.revisions = fileToUpdate.revisions.map(rev => 
            rev.id === updatedRevision.id 
              ? { ...rev, ...updatedRevision }
              : rev
          );
        }
        
        updatedProduct.filesByContainer[containerKey][fileIndex] = fileToUpdate;
      }
    }
    
    // Update state
    setProducts(updatedProducts);
    
    // If this is the selected file, update it with fresh data
    if (selectedFileObj && selectedFileObj.id === currentFileForModal.id) {
      setSelectedFileObj(updatedFile);
    }
    
    // Persist changes
    hybridStorage.saveProducts(updatedProducts)
      .catch(err => console.error("Error saving after price update:", err));
    
    setToastMsg(`Price updated to $${price} for ${updatedFile.name}`);
    setShowPriceModal(false);
    setCurrentFileForModal(null);

  } catch (error) {
    console.error('Error updating price:', error);
    setToastMsg(`Failed to update price: ${error.message}`);
  }
}

  /* Handle revision change */
  function handleRevisionChange(fileObj, revisionNumber) {
  // Find the revision object
  const revision = fileObj.revisions.find(rev => rev.revision_number === revisionNumber);
  if (!revision) return;
  
  // Create proper deep copies
  const updatedProducts = [...products];
  const updatedProduct = {...updatedProducts[selectedProductIndex]};
  updatedProducts[selectedProductIndex] = updatedProduct;
  
  // Use container-based file storage
  updatedProduct.filesByContainer = {...updatedProduct.filesByContainer};
  
  // Build container key using container_db_id
  const containerKey = `${fileObj.container_type}_${fileObj.container_db_id}`;
  
  if (!updatedProduct.filesByContainer[containerKey]) return;
  
  updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];
  
  // Find the file
  const fileIndex = updatedProduct.filesByContainer[containerKey].findIndex(f => f.id === fileObj.id);
  if (fileIndex === -1) return;
  
  // Make a copy of the file
  const updatedFile = {...updatedProduct.filesByContainer[containerKey][fileIndex]};
  updatedProduct.filesByContainer[containerKey][fileIndex] = updatedFile;
  
  // Set the current revision
  updatedFile.current_revision = revisionNumber;
  updatedFile.selected_revision_obj = revision;
  
  // Update state with the selected file object
  setProducts(updatedProducts);
  setSelectedFileObj(updatedFile);
  
  // Persist changes
  hybridStorage.saveProducts(updatedProducts)
    .catch(err => console.error("Error saving after revision change:", err));
}


  /* RENDER PREVIEW => checks extension, shows stl, code, markdown, CSV, Excel, etc. */
  function renderPreview(fileObj) {
  if (!fileObj) {
    return <p className="text-muted">No file selected</p>;
  }

  // Determine which revision to show
  const selectedRevision = fileObj.selected_revision_obj || fileObj.latest_revision || fileObj;
  
  // Construct server URL using file_path or file name
  const filePath = selectedRevision.file_path || fileObj.file_path || fileObj.name;
  const serverUrl = `/media/${filePath}`;
  const dataUrl = selectedRevision.dataUrl || fileObj.dataUrl || serverUrl;
  
  const fileToDisplay = selectedRevision;

  // Display current revision number
  const currentRevisionNumber = fileObj.current_revision || 1;
  
  // Always show revision information, even for files with only one revision
  const revisionSelector = (
    <div className="mb-3 d-flex align-items-center">
      <label className="me-2" style={{ minWidth: 'auto', fontSize: '0.9rem' }}>Revision:</label>
      <div className="d-flex align-items-center">
        <Form.Select
          size="sm"
          style={{
            width: '90px',
            marginRight: '10px',
            backgroundColor: '${styles.colors.dark}',
            color: '${styles.colors.text.light}',
            border: '1px solid ${styles.colors.border}',
            fontSize: '0.8rem',
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`
          }}
          value={fileObj.current_revision || 1}
          onClick={e => e.stopPropagation()}
          onChange={e => {
            e.stopPropagation();
            const revNum = parseInt(e.target.value, 10);
            if (fileObj.is_child_file) {
              handleChildRevisionChange(fileObj, revNum);
            } else {
              handleRevisionChange(fileObj, revNum);
            }
          }}
        >
          {fileObj.revisions && fileObj.revisions.length > 0 ? (
            fileObj.revisions.map((rev) => (
              <option key={rev.revision_number} value={rev.revision_number}>
                v {rev.revision_number}.0
              </option>
            ))
          ) : (
            <option value={1}>v 1.0</option>
          )}
        </Form.Select>
        {selectedRevision.description && (
          <span className="ms-3 text-light" style={{ fontSize: '0.9rem', borderRadius: '8px', backgroundColor: `${styles.colors.primary}26`, padding: '5px 10px' }}>
            {selectedRevision.description}
          </span>
        )}
      </div>
    </div>
  );

  // Container for file preview with revision selector
  const previewContainer = (previewContent) => (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      {revisionSelector}
      {previewContent}
    </div>
  );

  const nameLower = fileObj.name.toLowerCase();
  const fileUrl = dataUrl || serverUrl;

  // Images
  if (
    nameLower.endsWith('.png') ||
    nameLower.endsWith('.jpg') ||
    nameLower.endsWith('.jpeg') ||
    nameLower.endsWith('.gif')
  ) {
    return previewContainer(
      <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'auto' }}>
        <img
          src={fileUrl}
          alt={fileObj.name}
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    );
  }
  // PDF
  else if (nameLower.endsWith('.pdf')) {
    return previewContainer(
      <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'auto' }}>
        <iframe
          src={fileUrl}
          style={{
            display: 'block',
            width: '100%',
            height: '1000px',
            border: 'none'
          }}
          title={fileObj.name}
        />
      </div>
    );
  }
  // STL, DXF, STP/STEP (3D files)
  else if (
    nameLower.endsWith('.stl') ||
    nameLower.endsWith('.dxf') ||
    nameLower.endsWith('.stp') ||
    nameLower.endsWith('.step')
  ) {
    return previewContainer(
      <Model3DPreview fileUrl={fileUrl} />
    );
  }
  // Code files
  else if (
    nameLower.endsWith('.js') ||
    nameLower.endsWith('.py') ||
    nameLower.endsWith('.cpp') ||
    nameLower.endsWith('.java') ||
    nameLower.endsWith('.ts') ||
    nameLower.endsWith('.ino')
  ) {
    const ext = nameLower.substring(nameLower.lastIndexOf('.'));
    return previewContainer(<CodePreview fileUrl={fileUrl} extension={ext} />);
  }
  // Markdown
  else if (nameLower.endsWith('.md') || nameLower.endsWith('.markdown')) {
      // If we have a dataUrl that appears to be a base64 string
    if (dataUrl && dataUrl.startsWith('data:')) {
      // Extract the content directly from the dataUrl
      try {
        const base64Content = dataUrl.split(',')[1];
        const decodedContent = atob(base64Content);
        
        return previewContainer(
          <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'auto', padding: '1rem' }}>
            <ReactMarkdown>{decodedContent}</ReactMarkdown>
          </div>
        );
      } catch (error) {
        console.error("Error processing markdown dataUrl:", error);
        // Fall through to regular fetch method if dataUrl processing fails
      }
    }
    
    // Otherwise use the normal markdown preview component
    return previewContainer(<MarkdownPreview fileUrl={fileUrl} />);
  }
  // CSV
  else if (nameLower.endsWith('.csv')) {
    return previewContainer(<CsvPreview fileUrl={fileUrl} />);
  }
  // Excel
  else if (nameLower.endsWith('.xls') || nameLower.endsWith('.xlsx')) {
    return previewContainer(<ExcelPreview fileUrl={fileUrl} />);
  }
  // Word documents
  else if (nameLower.endsWith('.doc') || nameLower.endsWith('.docx')) {
    return previewContainer(
      <div style={{
        minHeight: '600px', borderRadius: '8px',
        border: '1px solid #888',
        overflow: 'hidden',
        backgroundColor: '${styles.colors.text.light}',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        color: '#333'
      }}>
        <FaFileWord style={{ fontSize: '3rem', color: '#2B7BF3', marginBottom: '20px' }} />
        <h4>Word Document Preview</h4>
        <p>Viewing file: {fileObj.name}</p>
        <p>Word documents are best viewed in Microsoft Word or similar applications.</p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#2B7BF3',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          Download Document
        </a>
      </div>
    );
  }
  // Fallback
  else {
    // Get file size and upload date from the correct fields
    const fileSize = fileObj.file_size || fileObj.size || 0;
    const uploadDate = fileObj.created_at || fileObj.upload_date;
    const fileType = fileObj.file_type || fileObj.type;
    
    return previewContainer(
      <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', padding: '1rem' }}>
        <p className="text-muted">No preview available for {fileObj.name}</p>
        <p>File type: {fileType || "Unknown"}</p>
        <p>Size: {(fileSize / 1024).toFixed(2)} KB</p>
        <p>Upload date: {uploadDate ? new Date(uploadDate).toLocaleDateString() : 'Unknown'}</p>
        {fileObj.container_type && fileObj.container_id && (
          <p>Container: {fileObj.container_id} ({fileObj.container_type})</p>
        )}
      </div>
    );
  }
}

/* RENDER FILE LIST => always show headings for Name/Date, even if empty */
function renderFileList(prod) {
  if (!prod.selectedContainer || !prod.containerType) {
    return <p className="text-muted" style={{ fontSize: '0.85rem' }}>Select a Stage or Iteration on the left to see or upload files.</p>;
  }
  
  // Build container key
  const containerKey = `${prod.containerType}_${prod.selectedContainer.id}`;
  const containerFiles = prod.filesByContainer[containerKey] || [];
  
  // Get parent files (files without parent_file)
  const parentFiles = containerFiles.filter(file => !file.is_child_file);

  return (
    <>
      <Table
        hover
        borderless
        className="table-dark table-sm"
        style={{ cursor: 'pointer', fontSize: '0.85rem' }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid #555'}}>
            <th style={{ fontWeight:'200'}}>Name</th>
            <th style={{ fontWeight:'200'}}>Date</th>
            <th style={{ fontWeight:'200'}}>Rev</th>
          </tr>
        </thead>
        <tbody>
          {parentFiles.length === 0 ? (
            <tr>
              <td colSpan="3" className="text-muted">
                No files in {prod.selectedContainer.container_id || prod.selectedContainer.stage_id || prod.selectedContainer.iteration_id} yet.
              </td>
            </tr>
          ) : (
            // Map through parent files first
            parentFiles.map((fileObj, i) => {
              const ext = fileObj.name.split('.').pop().toLowerCase();
              const icon = iconMap[ext] || iconMap.default;
              const hasRevisions = fileObj.revisions && fileObj.revisions.length > 0;
              
              // Find child files that belong to this parent
              const childFiles = containerFiles.filter(
                file => file.parent_file === fileObj.id
              );
              
              return (
                <React.Fragment key={fileObj.id}>
                  {/* Parent File Row */}
                  <tr 
                    onClick={() => setSelectedFileObj(fileObj)}
                    className={selectedFileObj && selectedFileObj.id === fileObj.id ? 'selected-file-row' : ''}
                  >
                    <td 
                      style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                      onContextMenu={(e) => handleFileRightClick(e, fileObj)}
                    >
                      <div className="d-flex align-items-center">
                        {icon}
                        <span className="flex-grow-1">{fileObj.name}</span>
                        <div 
                          className="ms-1"
                          onClick={(e) => handleAddChildClick(e, fileObj)}
                          style={{ cursor: 'pointer', color: '${styles.colors.secondary}' }}
                        >
                          <FaPlus size={10} />
                        </div>
                        <div className="ms-2">
                          {fileObj.quantity && (
                            <span 
                              className="badge bg-warning me-1" 
                              style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                              onClick={(e) => handleQuantityClick(e, fileObj)}
                            >
                              Qty: {fileObj.quantity}
                            </span>
                          )}
                          {fileObj.price && (
                            <span 
                              className="badge bg-success" 
                              style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                              onClick={(e) => handlePriceClick(e, fileObj)}
                            >
                              ₹{fileObj.price}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(fileObj.created_at || fileObj.upload_date).toLocaleDateString()}
                    </td>
                    <td>
                      <Form.Select 
                        size="sm"
                        style={{ 
                          width: '80px', 
                          backgroundColor: styles.colors.darkAlt,
                          color: styles.colors.text.light,
                          border: `1px solid ${styles.colors.border}`,
                          fontSize: styles.fonts.size.sm,
                          borderRadius: styles.borderRadius.sm,
                          padding: '0.25rem 0.5rem',
                          textAlign: 'center',
                          cursor: 'pointer'
                        }}
                        value={fileObj.current_revision || 1}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          e.stopPropagation();
                          const revNum = parseInt(e.target.value, 10);
                          if (!selectedFileObj || selectedFileObj.id !== fileObj.id) {
                            setSelectedFileObj(fileObj);
                          }
                          if (hasRevisions) {
                            handleRevisionChange(fileObj, revNum);
                          }
                        }}
                      >
                        {hasRevisions ? (
                          fileObj.revisions.map((rev) => (
                            <option key={rev.revision_number} value={rev.revision_number}>
                              v {rev.revision_number}.0
                            </option>
                          ))
                        ) : (
                          <option value={1}>v 1.0</option>
                        )}
                      </Form.Select>
                    </td>
                  </tr>
                  
                  {/* Child Files Rows */}
                  {childFiles.map(childFile => {
                    const childExt = childFile.name.split('.').pop().toLowerCase();
                    const childIcon = iconMap[childExt] || iconMap.default;
                    const hasChildRevisions = childFile.revisions && childFile.revisions.length > 0;
                    
                    return (
                      <tr 
                        key={childFile.id}
                        onClick={() => setSelectedFileObj(childFile)}
                        style={selectedFileObj && selectedFileObj.id === childFile.id ? {
                          backgroundColor: 'rgba(108, 117, 125, 0.6)', // Semi-transparent gray
                          transition: 'background-color 0.2s'
                        } : {}}
                      >
                        <td 
                          style={{ 
                            whiteSpace: 'normal', 
                            wordBreak: 'break-word',
                            paddingLeft: '24px' // Indent child files
                          }}
                          onContextMenu={(e) => handleFileRightClick(e, childFile)}
                        >
                          <div className="d-flex align-items-center">
                            {childIcon}
                            <span>{childFile.name}</span>
                            <div className="ms-2">
                              {childFile.quantity && (
                                <span 
                                  className="badge bg-warning me-1" 
                                  style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                                  onClick={(e) => handleQuantityClick(e, childFile)}
                                >
                                  Qty: {childFile.quantity}
                                </span>
                              )}
                              {childFile.price && (
                                <span 
                                  className="badge bg-success" 
                                  style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                                  onClick={(e) => handlePriceClick(e, childFile)}
                                >
                                  ₹{childFile.price}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(childFile.created_at || childFile.upload_date).toLocaleDateString()}
                        </td>
                        <td>
                          <Form.Select 
                            size="sm"
                            style={{ 
                              width: '80px',
                              backgroundColor: '${styles.colors.dark}',
                              color: '${styles.colors.text.light}',
                              border: '1px solid ${styles.colors.border}',
                              fontSize: '0.8rem',
                              textAlign: 'center',
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`
                            }}
                            value={childFile.current_revision || 1}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              e.stopPropagation();
                              const revNum = parseInt(e.target.value, 10);
                              if (!selectedFileObj || selectedFileObj.id !== childFile.id) {
                                setSelectedFileObj(childFile);
                              }
                              if (hasChildRevisions) {
                                handleChildRevisionChange(childFile, revNum);
                              }
                            }}
                          >
                            {hasChildRevisions ? (
                              childFile.revisions.map((rev) => (
                                <option key={rev.revision_number} value={rev.revision_number}>
                                  v {rev.revision_number}.0
                                </option>
                              ))
                            ) : (
                              <option value={1}>v 1.0</option>
                            )}
                          </Form.Select>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </Table>
      
      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: '${styles.colors.dark}',
            border: '1px solid ${styles.colors.border}',
            borderRadius: '4px',
            padding: '0.5rem 0',
            zIndex: 1000,
            minWidth: '150px',
            fontSize: '0.85rem'
          }}
          onMouseLeave={hideContextMenu} 
        >
          <div 
            style={{
              padding: '0.375rem 1rem',
              cursor: 'pointer',
              color: '${styles.colors.text.light}',
              fontWeight: 'normal'
            }}
            className="context-menu-item"
            onClick={handleContextMenuUpload}
            onMouseOver={(e) => e.target.style.backgroundColor = '${styles.colors.darkAlt}'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Upload Revision
          </div>
          <div 
            style={{
              padding: '0.375rem 1rem',
              cursor: 'pointer',
              color: '${styles.colors.text.light}',
              fontWeight: 'normal'
            }}
            className="context-menu-item"
            onClick={handleQuantityOption}
            onMouseOver={(e) => e.target.style.backgroundColor = '${styles.colors.darkAlt}'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Set Quantity
          </div>
          <div 
            style={{
              padding: '0.375rem 1rem',
              cursor: 'pointer',
              color: '${styles.colors.text.light}',
              fontWeight: 'normal'
            }}
            className="context-menu-item"
            onClick={handlePriceOption}
            onMouseOver={(e) => e.target.style.backgroundColor = '${styles.colors.darkAlt}'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Set Price
          </div>
          <div 
            style={{
              padding: '0.375rem 1rem',
              cursor: 'pointer',
              color: '${styles.colors.text.light}',
              fontWeight: 'normal'
            }}
            className="context-menu-item"
            onClick={handleMoveOption}
            onMouseOver={(e) => e.target.style.backgroundColor = '${styles.colors.darkAlt}'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Move
          </div>
          <div 
            style={{
              padding: '0.375rem 1rem',
              cursor: 'pointer',
              color: '${styles.colors.text.light}',
              fontWeight: 'normal',
              backgroundColor: '#dc3545'
            }}
            className="context-menu-item"
            onClick={handleRemoveOption}
            onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            Remove
          </div>
        </div>
      )}
      
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={contextMenuFileInput}
        onChange={handleContextMenuFileChange}
        style={{ display: 'none' }}
      />
      
      <input
        type="file"
        ref={childFileInput}
        onChange={handleChildFileChange}
        style={{ display: 'none' }}
      />
      
      {/* Quantity Modal */}
      {showQuantityModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1050
          }}
        >
          <div 
            style={{
              backgroundColor: '${styles.colors.dark}',
              border: '1px solid ${styles.colors.border}',
              borderRadius: '4px',
              padding: '1.5rem',
              width: '400px',
              maxWidth: '90%',
              fontSize: '0.9rem'
            }}
          >
            <h5 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Set Quantity</h5>
            <Form onSubmit={(e) => {
              e.preventDefault();
              const quantityInput = e.target.elements.quantity;
              handleQuantityUpdate(quantityInput.value);
            }}>
              <Form.Group className="mb-3">
                <Form.Control 
                  type="number" 
                  name="quantity"
                  min="1"
                  placeholder="Enter quantity"
                  defaultValue={currentFileForModal?.quantity || ''}
                  style={{
                    backgroundColor: '${styles.colors.darkAlt}',
                    color: '${styles.colors.text.light}',
                    border: '1px solid ${styles.colors.border}',
                    fontSize: '0.9rem'
                  }}
                />
              </Form.Group>
              <div className="d-flex justify-content-end gap-2">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowQuantityModal(false);
                    setCurrentFileForModal(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
      
      {/* Price Modal */}
      {showPriceModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1050
          }}
        >
          <div
            style={{
              backgroundColor: '${styles.colors.dark}',
              border: '1px solid ${styles.colors.border}',
              borderRadius: '4px',
              padding: '1.5rem',
              width: '400px',
              maxWidth: '90%',
              fontSize: '0.9rem'
            }}
          >
            <h5 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Set Price (INR)</h5>
            <Form onSubmit={(e) => {
              e.preventDefault();
              const priceInput = e.target.elements.price;
              handlePriceUpdate(priceInput.value);
            }}>
              <Form.Group className="mb-3">
                <Form.Control
                  type="number"
                  name="price"
                  min="0.01"
                  step="0.01"
                  placeholder="Enter price in INR"
                  defaultValue={currentFileForModal?.price || ''}
                  style={{
                    backgroundColor: '${styles.colors.darkAlt}',
                    color: '${styles.colors.text.light}',
                    border: '1px solid ${styles.colors.border}',
                    fontSize: '0.9rem'
                  }}
                />
              </Form.Group>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowPriceModal(false);
                    setCurrentFileForModal(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
      
      {/* Change Description Modal */}
      {showChangeDescriptionModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1050
          }}
        >
          <div
            style={{
              backgroundColor: '${styles.colors.dark}',
              border: '1px solid ${styles.colors.border}',
              borderRadius: '4px',
              padding: '1.5rem',
              width: '500px',
              maxWidth: '90%',
              fontSize: '0.9rem'
            }}
          >
            <h5 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Revision Summary</h5>
            <Form onSubmit={(e) => {
              e.preventDefault();
              console.log("Form submitted with description:", tempChangeDescription);
              handleChangeDescriptionUpdate(tempChangeDescription);
            }}>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  placeholder="Describe the changes made in this upload"
                  value={tempChangeDescription}
                  onChange={(e) => setTempChangeDescription(e.target.value)}
                  style={{
                    backgroundColor: '${styles.colors.text.light}f',
                    color: '#00000',
                    border: '1px solid ${styles.colors.border}',
                    fontSize: '0.9rem'
                  }}
                />
              </Form.Group>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowChangeDescriptionModal(false);
                    setCurrentFileForModal(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    console.log("Save button clicked with description:", tempChangeDescription);
                    handleChangeDescriptionUpdate(tempChangeDescription);
                  }}
                >
                  Save
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </>
  );
}

function handleViewChange() {
  setViewMode('normal');
}


// Updated updateFile function for container-based file organization
  function updateFile(fileId, updates) {
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    updatedProduct.filesByContainer = {...updatedProduct.filesByContainer};
    
    // Find the file across all containers
    let foundFile = null;
    let containerKey = null;
    let fileIndex = -1;
    
    // Search through all containers to find the file
    Object.keys(updatedProduct.filesByContainer).forEach(key => {
      const files = updatedProduct.filesByContainer[key];
      const index = files.findIndex(f => f.id === fileId);
      if (index !== -1) {
        foundFile = files[index];
        containerKey = key;
        fileIndex = index;
      }
    });
    
    if (!foundFile || fileIndex === -1 || !containerKey) {
      console.warn(`File with ID ${fileId} not found in any container`);
      return;
    }
    
    // Create a copy of the container's files array
    updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];
    
    // Update the file with the provided updates
    const updatedFile = {...foundFile, ...updates};
    updatedProduct.filesByContainer[containerKey][fileIndex] = updatedFile;
    
    // If the file has revisions, update the current revision too
    if (updatedFile.revisions && updatedFile.current_revision) {
      updatedFile.revisions = [...updatedFile.revisions]; // Create new array
      const revIndex = updatedFile.revisions.findIndex(
        rev => rev.revision_number === updatedFile.current_revision
      );
      if (revIndex !== -1) {
        updatedFile.revisions[revIndex] = {
          ...updatedFile.revisions[revIndex],
          ...updates
        };
      }
    }
    
    // Update latest_revision if it exists
    if (updatedFile.latest_revision) {
      updatedFile.latest_revision = {
        ...updatedFile.latest_revision,
        ...updates
      };
    }
    
    // Update selected_revision_obj if it exists
    if (updatedFile.selected_revision_obj) {
      updatedFile.selected_revision_obj = {
        ...updatedFile.selected_revision_obj,
        ...updates
      };
    }
    
    // Update state
    setProducts(updatedProducts);
    
    // If this is the selected file, update it
    if (selectedFileObj && selectedFileObj.id === fileId) {
      setSelectedFileObj(updatedFile);
    }
    
    // Persist changes
    hybridStorage.saveProducts(updatedProducts)
      .catch(err => console.error("Error saving after file update:", err));
  }

  // const renderFileBrowser = () => {
  //   return (
  //     <>
  //       {/* Top Row: Product dropdown, add product, and header icons */}
  //       <div className="d-flex justify-content-between align-items-center mb-2">
    
  //         {/* Left Side: Product Dropdown + Add Product */}
  //         <div className="d-flex align-items-center gap-2">
  //           <Form.Select
  //             size="sm"
  //             value={selectedProductIndex}
  //             onChange={handleSelectProduct}
  //             style={{
  //               width: 'fit-content',
  //               backgroundColor: styles.colors.dark,
  //               color: styles.colors.text.light,
  //               border: `1px solid ${styles.colors.border}`,
  //               fontSize: '0.85rem',
  //               backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`
  //             }}
  //             className="shadow-none"
  //           >
  //             {products.map((p, idx) => (
  //               <option key={idx} value={idx}>
  //                 {p.name.toUpperCase()}
  //               </option>
  //             ))}
  //           </Form.Select>

               


  //           <div
  //             style={{
  //               cursor: 'pointer',
  //               color: styles.colors.text.light,
  //               display: 'flex',
  //               alignItems: 'center',
  //               justifyContent: 'center',
  //               width: '24px',
  //               height: '24px'
  //             }}
  //             //onClick={() => console.log('🔥 PLUS BUTTON CLICKED!')}
  //             onClick={handleCreateProduct}
  //           >
  //             <FaPlus size={20} style={{ transform: 'scale(0.9)', pointerEvents: 'none' }} />
  //           </div>
  //         </div>

  //         {/* Right Side: Icons */}
  //         <div className="d-flex align-items-center gap-2">
            
  //           <div style={{ cursor: 'pointer' }}
  //           //onClick={() => console.log('🔥 ITERATION BUTTON CLICKED!')}
  //           //onMouseDown={() => console.log('🔥 MOUSE DOWN!')}
  //           onClick={handleAddIteration}
  //           >
  //             <FaDrumSteelpan size={20} color={styles.colors.iteration} style={{pointerEvents: 'none'}} />
  //           </div>
  //           <div style={{ cursor: 'pointer' }} onClick={handleAddStage}>
  //             <FaToriiGate size={20} color={styles.colors.stage} style={{pointerEvents: 'none'}} />
  //           </div>
  //           <div
  //             style={{
  //               width: '24px',
  //               height: '24px',
  //               display: 'flex',
  //               alignItems: 'center',
  //               justifyContent: 'center',
  //               background: 'transparent',
  //               color: '#ffffff',
  //               cursor: 'pointer',
  //               borderRadius: '4px'
  //             }}
  //             onClick={handlePlusClick}
  //           >
  //             <FaUpload size={20} style={{pointerEvents: 'none'}} />
  //           </div>
  //           <div
  //             style={{
  //               width: '24px',
  //               height: '24px',
  //               display: 'flex',
  //               alignItems: 'center',
  //               justifyContent: 'center',
  //               background: 'transparent',
  //               color: '#ffffff',
  //               cursor: 'pointer',
  //               borderRadius: '4px'
  //             }}
  //             onClick={handleViewChange}
  //           >
  //             <FaEye size={20} />
  //           </div>
  //           <div
  //             style={{
  //               width: '24px',
  //               height: '24px',
  //               display: 'flex',
  //               alignItems: 'center',
  //               justifyContent: 'center',
  //               background: 'transparent',
  //               color: '#ffffff',
  //               cursor: 'pointer',
  //               borderRadius: '4px'
  //             }}
  //             onClick={handleShowBOM}
  //           >
  //             <FaTable size={20} />
  //           </div>
  //         </div>
  //       </div>

  //       {/* Render content based on viewMode */}
  //       {viewMode === 'normal' ? (
  //         renderFileList(prod)
  //       ) : (
  //         <BOMView prod={prod} updateFile={updateFile} />
  //       )}

  //       {/* Hidden file input for uploads */}
  //       <input
  //         type="file"
  //         ref={hiddenFileInput}
  //         onChange={handleFileChange}
  //         style={{ display: 'none' }}
  //       />
  //     </>
  //   );
  // };

// Add the BOMView component (place this outside of your App component)
// function BOMView({ prod, updateFile }) {
//   if (!prod.selectedStage) {
//     return <p className="text-muted">Select a Stage/Iteration to view BOM.</p>;
//   }
  
//   const stageFiles = prod.filesByStage[prod.selectedStage] || [];
  
//   // Helper function to get the latest version of each file
//   const getLatestVersionFiles = () => {
//     return stageFiles.map(file => {
//       if (file.revisions && file.selected_revision_obj) {
//         return {...file, ...file.selected_revision_obj};
//       }
//       return file;
//     });
//   };
  
//   const latestFiles = getLatestVersionFiles();
  
//   // Group files by type
//   const fileGroups = {};
  
//   // First, group non-child files by extension
//   latestFiles.forEach(file => {
//     if (file.isChildFile) return; // Skip child files for now
    
//     const ext = file.name.split('.').pop().toLowerCase();
//     if (!fileGroups[ext]) {
//       fileGroups[ext] = [];
//     }
//     fileGroups[ext].push(file);
//   });
  
//   // Then, group child files by parent file's extension
//   latestFiles.forEach(file => {
//     if (!file.isChildFile) return; // Skip non-child files
    
//     // Find parent file
//     const parentFile = latestFiles.find(f => f.id === file.parentId);
//     if (!parentFile) return; // Skip if parent not found
    
//     const parentExt = parentFile.name.split('.').pop().toLowerCase();
//     const ext = file.name.split('.').pop().toLowerCase();
    
//     // Create a group for child files if it doesn't exist
//     const groupName = `${parentExt}_children`;
//     if (!fileGroups[groupName]) {
//       fileGroups[groupName] = [];
//     }
    
//     fileGroups[groupName].push({...file, parentName: parentFile.name});
//   });
  
//   // Special handling for spreadsheet files (treat as their own category)
//   const spreadsheetFiles = latestFiles.filter(file => {
//     const ext = file.name.split('.').pop().toLowerCase();
//     return ext === 'xls' || ext === 'xlsx' || ext === 'csv';
//   });
  
//   if (spreadsheetFiles.length > 0) {
//     fileGroups['spreadsheets'] = spreadsheetFiles;
//   }
  
//   // Calculate grand total across all tables
//   const calculateGrandTotal = () => {
//     let total = 0;
    
//     latestFiles.forEach(file => {
//       const quantity = file.quantity || 1;
//       const price = parseFloat(file.price) || 0;
//       total += quantity * price;
//     });
    
//     return total.toFixed(2);
//   };
  
//   // Function to calculate total for a group of files
//   const calculateGroupTotal = (files) => {
//     return files.reduce((sum, file) => {
//       const quantity = file.quantity || 1;
//       const price = parseFloat(file.price) || 0;
//       return sum + (quantity * price);
//     }, 0).toFixed(2);
//   };
  
//   // Function to handle label changes
//   const handleLabelChange = (fileId, newLabel) => {
//     updateFile(fileId, { label: newLabel });
//   };
  
//   // Function to handle quantity changes
//   const handleQuantityChange = (fileId, newQuantity) => {
//     const quantity = parseInt(newQuantity) || 1;
//     updateFile(fileId, { quantity: quantity });
//   };
  
//   // Function to handle price changes
//   const handlePriceChange = (fileId, newPrice) => {
//     const price = newPrice === '' ? '' : (parseFloat(newPrice) || 0);
//     updateFile(fileId, { price: price });
//   };
  
//   return (
//     <div className="p-3">
//       <h4>Bill of Materials: {prod.name} - {prod.selectedStage}</h4>
      
//       {Object.entries(fileGroups).map(([groupKey, files]) => {
//         if (files.length === 0) return null;
        
//         // Format the group title
//         let groupTitle;
//         if (groupKey.includes('_children')) {
//           const parentExt = groupKey.split('_')[0].toUpperCase();
//           groupTitle = `${parentExt} Child Components`;
//         } else if (groupKey === 'spreadsheets') {
//           groupTitle = 'Spreadsheets';
//         } else {
//           groupTitle = `${groupKey.toUpperCase()} Components`;
//         }
        
//         return (
//           <div key={groupKey} className="mb-4">
//             <h5>{groupTitle}</h5>
//             <Table striped bordered hover variant="dark" className="mb-2">
//               <thead>
//                 <tr>
//                   <th>Component</th>
//                   <th>Label</th>
//                   <th>Qty</th>
//                   <th>Price (₹)</th>
//                   <th>Total (₹)</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {files.map(file => {
//                   const quantity = file.quantity || 1;
//                   const price = parseFloat(file.price) || 0;
//                   const total = quantity * price;
                  
//                   return (
//                     <tr key={file.id}>
//                       <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
//                         {file.isChildFile && file.parentName && (
//                           <span style={{ opacity: 0.7, marginRight: '5px' }}>
//                             ↳ {file.parentName} / 
//                           </span>
//                         )}
//                         {file.name}
//                       </td>
//                       <td>
//                         <Form.Control 
//                           size="sm" 
//                           type="text"
//                           placeholder="Add label"
//                           defaultValue={file.label || ''}
//                           onBlur={(e) => handleLabelChange(file.id, e.target.value)}
//                           style={{
//                             backgroundColor: styles.colors.darkAlt,
//                             color: styles.colors.text.light,
//                             border: `1px solid ${styles.colors.border}`,
//                           }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control 
//                           size="sm" 
//                           type="number"
//                           min="1"
//                           value={quantity}
//                           onChange={(e) => handleQuantityChange(file.id, e.target.value)}
//                           style={{
//                             backgroundColor: styles.colors.darkAlt,
//                             color: styles.colors.text.light,
//                             border: `1px solid ${styles.colors.border}`,
//                             width: '60px'
//                           }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control 
//                           size="sm" 
//                           type="number"
//                           min="0"
//                           step="0.01"
//                           value={file.price === '' ? '' : price}
//                           onChange={(e) => handlePriceChange(file.id, e.target.value)}
//                           style={{
//                             backgroundColor: styles.colors.darkAlt,
//                             color: styles.colors.text.light,
//                             border: `1px solid ${styles.colors.border}`,
//                             width: '80px'
//                           }}
//                         />
//                       </td>
//                       <td style={{ minWidth: '80px' }}>{total.toFixed(2)}</td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//               <tfoot>
//                 <tr>
//                   <td colSpan="4" className="text-end"><strong>Total</strong></td>
//                   <td><strong>{calculateGroupTotal(files)}</strong></td>
//                 </tr>
//               </tfoot>
//             </Table>
//           </div>
//         );
//       })}
      
//       {/* Grand Total */}
//       <div className="mt-4 p-3" style={{ backgroundColor: styles.colors.darkAlt, borderRadius: '4px' }}>
//         <h5>Grand Total: ₹ {calculateGrandTotal()}</h5>
//       </div>
//     </div>
//   );
// }
// function BOMView({ prod, updateFile }) {
//   const [showFilters, setShowFilters] = useState(false);
//   const [visibleGroups, setVisibleGroups] = useState({});
  
//   if (!prod.selectedStage) {
//     return <p className="text-muted">Select a Stage/Iteration to view BOM.</p>;
//   }
  
//   const stageFiles = prod.filesByStage[prod.selectedStage] || [];
  
//   // Helper function to get the latest version of each file
//   const getLatestVersionFiles = () => {
//     return stageFiles.map(file => {
//       if (file.revisions && file.selected_revision_obj) {
//         return {...file, ...file.selected_revision_obj};
//       }
//       return file;
//     });
//   };
  
//   const latestFiles = getLatestVersionFiles();
  
//   // Group files by parent for DXF files
//   const parentFileMap = {};
//   const dxfParentFiles = [];
//   const spreadsheetFiles = [];
  
//   // First, identify all DXF parent files and spreadsheets
//   latestFiles.forEach(file => {
//     if (file.isChildFile) return;
    
//     const ext = file.name.split('.').pop().toLowerCase();
    
//     if (ext === 'dxf') {
//       dxfParentFiles.push(file);
//       // Initialize child array
//       parentFileMap[file.id] = [];
//     } else if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
//       spreadsheetFiles.push(file);
//     }
//   });
  
//   // Then, group child files by their parent
//   latestFiles.forEach(file => {
//     if (!file.isChildFile) return;
    
//     // Only process child files whose parent is in our parent map
//     if (parentFileMap.hasOwnProperty(file.parentId)) {
//       parentFileMap[file.parentId].push(file);
//     }
//   });
  
//   // Initialize visible groups if first render
//   useEffect(() => {
//     if (Object.keys(visibleGroups).length === 0) {
//       const initialGroups = {};
      
//       // Set all DXF parent files to visible
//       dxfParentFiles.forEach(file => {
//         initialGroups[file.id] = true;
//       });
      
//       // Set spreadsheet group to visible
//       initialGroups['spreadsheets'] = true;
      
//       setVisibleGroups(initialGroups);
//     }
//   }, [dxfParentFiles]);
  
//   // Function to toggle group visibility
//   const toggleGroupVisibility = (groupId) => {
//     setVisibleGroups(prev => ({
//       ...prev,
//       [groupId]: !prev[groupId]
//     }));
//   };
  
//   // Function to toggle all groups
//   const toggleAllGroups = (value) => {
//     const updatedGroups = {};
//     dxfParentFiles.forEach(file => {
//       updatedGroups[file.id] = value;
//     });
//     updatedGroups['spreadsheets'] = value;
//     setVisibleGroups(updatedGroups);
//   };
  
//   // Calculate grand total across all tables
//   const calculateGrandTotal = () => {
//     let total = 0;
    
//     // Add up totals from DXF parent files
//     dxfParentFiles.forEach(file => {
//       const quantity = file.quantity || 1;
//       const price = parseFloat(file.price) || 0;
//       total += quantity * price;
      
//       // Add child files if parent is in our map
//       if (parentFileMap[file.id]) {
//         parentFileMap[file.id].forEach(childFile => {
//           const childQuantity = childFile.quantity || 1;
//           const childPrice = parseFloat(childFile.price) || 0;
//           total += childQuantity * childPrice;
//         });
//       }
//     });
    
//     // Add spreadsheet files
//     spreadsheetFiles.forEach(file => {
//       const quantity = file.quantity || 1;
//       const price = parseFloat(file.price) || 0;
//       total += quantity * price;
//     });
    
//     return total.toFixed(2);
//   };
  
//   // Function to calculate total for a parent and its children
//   const calculateGroupTotal = (parentFile) => {
//     let total = 0;
    
//     // Add parent file
//     const parentQuantity = parentFile.quantity || 1;
//     const parentPrice = parseFloat(parentFile.price) || 0;
//     total += parentQuantity * parentPrice;
    
//     // Add child files
//     if (parentFileMap[parentFile.id]) {
//       parentFileMap[parentFile.id].forEach(childFile => {
//         const childQuantity = childFile.quantity || 1;
//         const childPrice = parseFloat(childFile.price) || 0;
//         total += childQuantity * childPrice;
//       });
//     }
    
//     return total.toFixed(2);
//   };
  
//   // Function to calculate total for spreadsheets
//   const calculateSpreadsheetTotal = () => {
//     return spreadsheetFiles.reduce((sum, file) => {
//       const quantity = file.quantity || 1;
//       const price = parseFloat(file.price) || 0;
//       return sum + (quantity * price);
//     }, 0).toFixed(2);
//   };
  
//   // Function handlers
//   const handleLabelChange = (fileId, newLabel) => {
//     updateFile(fileId, { label: newLabel });
//   };
  
//   const handleQuantityChange = (fileId, newQuantity) => {
//     const quantity = parseInt(newQuantity) || 1;
//     updateFile(fileId, { quantity: quantity });
//   };
  
//   const handlePriceChange = (fileId, newPrice) => {
//     const price = newPrice === '' ? '' : (parseFloat(newPrice) || 0);
//     updateFile(fileId, { price: price });
//   };
  
//   return (
//     <div className="p-3">
//       <div className="d-flex justify-content-between align-items-center mb-3">
//         <h4 className="mb-0">Bill of Materials: {prod.name} - {prod.selectedStage}</h4>
        
//         <div className="d-flex align-items-center">
//           <Button 
//             variant="outline-secondary" 
//             size="sm" 
//             className="me-2" 
//             onClick={() => setShowFilters(!showFilters)}
//           >
//             <FaFilter className="me-1" /> Filters
//           </Button>
//         </div>
//       </div>
      
//       {/* Filters Panel */}
//       {showFilters && (
//         <div className="mb-3 p-3" style={{ backgroundColor: `${styles.colors.darkAlt}44`, borderRadius: '4px' }}>
//           <h6>Toggle Visibility:</h6>
//           <div className="d-flex flex-wrap gap-2 mt-2">
//             <Button 
//               variant="outline-secondary" 
//               size="sm"
//               onClick={() => toggleAllGroups(true)}
//             >
//               Show All
//             </Button>
//             <Button 
//               variant="outline-secondary" 
//               size="sm"
//               onClick={() => toggleAllGroups(false)}
//             >
//               Hide All
//             </Button>
            
//             {dxfParentFiles.map(file => (
//               <Button
//                 key={file.id} 
//                 variant={visibleGroups[file.id] ? "outline-success" : "outline-danger"}
//                 size="sm"
//                 onClick={() => toggleGroupVisibility(file.id)}
//               >
//                 {file.name.split('.')[0]}
//               </Button>
//             ))}
            
//             {spreadsheetFiles.length > 0 && (
//               <Button
//                 variant={visibleGroups['spreadsheets'] ? "outline-success" : "outline-danger"}
//                 size="sm"
//                 onClick={() => toggleGroupVisibility('spreadsheets')}
//               >
//                 Spreadsheets
//               </Button>
//             )}
//           </div>
//         </div>
//       )}
      
//       {/* DXF Parent Files and their children */}
//       {dxfParentFiles.map(parentFile => {
//         // Skip if not visible
//         if (!visibleGroups[parentFile.id]) return null;
        
//         // Get parent name without extension for the header
//         const parentName = parentFile.name.split('.')[0];
//         const childFiles = parentFileMap[parentFile.id] || [];
        
//         return (
//           <div key={parentFile.id} className="mb-4">
//             <h5 style={{ 
//               backgroundColor: styles.colors.darkAlt, 
//               padding: '10px 15px', 
//               borderRadius: '4px 4px 0 0', 
//               marginBottom: 0,
//               borderBottom: `1px solid ${styles.colors.border}`
//             }}>
//               {parentName}
//             </h5>
//             <Table 
//               striped 
//               bordered 
//               hover 
//               variant="dark" 
//               className="mb-0"
//               style={{ 
//                 borderCollapse: 'collapse',
//                 borderRadius: '0 0 4px 4px',
//                 overflow: 'hidden',
//                 border: `1px solid ${styles.colors.border}`
//               }}
//             >
//               <thead>
//                 <tr style={{ backgroundColor: `${styles.colors.darkAlt}88` }}>
//                   <th style={{ width: '40%' }}>Component</th>
//                   <th style={{ width: '25%' }}>Label</th>
//                   <th style={{ width: '10%' }}>Qty</th>
//                   <th style={{ width: '12%' }}>Price (₹)</th>
//                   <th style={{ width: '13%' }}>Total (₹)</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {/* Parent file row */}
//                 <tr key={parentFile.id}>
//                   <td style={{ 
//                     whiteSpace: 'normal', 
//                     wordBreak: 'break-word',
//                     fontWeight: '500'
//                   }}>
//                     {parentFile.name}
//                   </td>
//                   <td>
//                     <Form.Control 
//                       size="sm" 
//                       type="text"
//                       placeholder="Add label"
//                       defaultValue={parentFile.label || ''}
//                       onBlur={(e) => handleLabelChange(parentFile.id, e.target.value)}
//                       style={{
//                         backgroundColor: styles.colors.darkAlt,
//                         color: styles.colors.text.light,
//                         border: `1px solid ${styles.colors.border}`,
//                       }}
//                     />
//                   </td>
//                   <td>
//                     <Form.Control 
//                       size="sm" 
//                       type="number"
//                       min="1"
//                       value={parentFile.quantity || 1}
//                       onChange={(e) => handleQuantityChange(parentFile.id, e.target.value)}
//                       style={{
//                         backgroundColor: styles.colors.darkAlt,
//                         color: styles.colors.text.light,
//                         border: `1px solid ${styles.colors.border}`,
//                         width: '100%'
//                       }}
//                     />
//                   </td>
//                   <td>
//                     <Form.Control 
//                       size="sm" 
//                       type="number"
//                       min="0"
//                       step="0.01"
//                       value={parentFile.price === '' ? '' : (parseFloat(parentFile.price) || 0)}
//                       onChange={(e) => handlePriceChange(parentFile.id, e.target.value)}
//                       style={{
//                         backgroundColor: styles.colors.darkAlt,
//                         color: styles.colors.text.light,
//                         border: `1px solid ${styles.colors.border}`,
//                         width: '100%'
//                       }}
//                     />
//                   </td>
//                   <td style={{ 
//                     minWidth: '80px',
//                     textAlign: 'right'
//                   }}>
//                     {((parentFile.quantity || 1) * (parseFloat(parentFile.price) || 0)).toFixed(2)}
//                   </td>
//                 </tr>
                
//                 {/* Child file rows */}
//                 {childFiles.map(childFile => {
//                   const quantity = childFile.quantity || 1;
//                   const price = parseFloat(childFile.price) || 0;
//                   const total = quantity * price;
                  
//                   return (
//                     <tr 
//                       key={childFile.id}
//                       style={{ backgroundColor: 'rgba(40, 45, 50, 0.8)' }}
//                     >
//                       <td style={{ 
//                         whiteSpace: 'normal', 
//                         wordBreak: 'break-word',
//                         paddingLeft: '25px'
//                       }}>
//                         <span style={{ opacity: 0.8 }}>↳</span> {childFile.name}
//                       </td>
//                       <td>
//                         <Form.Control 
//                           size="sm" 
//                           type="text"
//                           placeholder="Add label"
//                           defaultValue={childFile.label || ''}
//                           onBlur={(e) => handleLabelChange(childFile.id, e.target.value)}
//                           style={{
//                             backgroundColor: styles.colors.darkAlt,
//                             color: styles.colors.text.light,
//                             border: `1px solid ${styles.colors.border}`,
//                           }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control 
//                           size="sm" 
//                           type="number"
//                           min="1"
//                           value={quantity}
//                           onChange={(e) => handleQuantityChange(childFile.id, e.target.value)}
//                           style={{
//                             backgroundColor: styles.colors.darkAlt,
//                             color: styles.colors.text.light,
//                             border: `1px solid ${styles.colors.border}`,
//                             width: '100%'
//                           }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control 
//                           size="sm" 
//                           type="number"
//                           min="0"
//                           step="0.01"
//                           value={childFile.price === '' ? '' : price}
//                           onChange={(e) => handlePriceChange(childFile.id, e.target.value)}
//                           style={{
//                             backgroundColor: styles.colors.darkAlt,
//                             color: styles.colors.text.light,
//                             border: `1px solid ${styles.colors.border}`,
//                             width: '100%'
//                           }}
//                         />
//                       </td>
//                       <td style={{ 
//                         minWidth: '80px',
//                         textAlign: 'right'
//                       }}>
//                         {total.toFixed(2)}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//               <tfoot>
//                 <tr style={{ backgroundColor: styles.colors.darkAlt }}>
//                   <td colSpan="4" className="text-end"><strong>Total</strong></td>
//                   <td style={{ textAlign: 'right' }}>
//                     <strong>{calculateGroupTotal(parentFile)}</strong>
//                   </td>
//                 </tr>
//               </tfoot>
//             </Table>
//           </div>
//         );
//       })}
      
//       {/* Spreadsheet Files */}
//       {spreadsheetFiles.length > 0 && visibleGroups['spreadsheets'] && (
//         <div className="mb-4">
//           <h5 style={{ 
//             backgroundColor: styles.colors.darkAlt, 
//             padding: '10px 15px', 
//             borderRadius: '4px 4px 0 0', 
//             marginBottom: 0,
//             borderBottom: `1px solid ${styles.colors.border}`
//           }}>
//             Spreadsheets
//           </h5>
//           <Table 
//             striped 
//             bordered 
//             hover 
//             variant="dark" 
//             className="mb-0"
//             style={{ 
//               borderCollapse: 'collapse',
//               borderRadius: '0 0 4px 4px',
//               overflow: 'hidden',
//               border: `1px solid ${styles.colors.border}`
//             }}
//           >
//             <thead>
//               <tr style={{ backgroundColor: `${styles.colors.darkAlt}88` }}>
//                 <th style={{ width: '40%' }}>Component</th>
//                 <th style={{ width: '25%' }}>Label</th>
//                 <th style={{ width: '10%' }}>Qty</th>
//                 <th style={{ width: '12%' }}>Price (₹)</th>
//                 <th style={{ width: '13%' }}>Total (₹)</th>
//               </tr>
//             </thead>
//             <tbody>
//               {spreadsheetFiles.map(file => {
//                 const quantity = file.quantity || 1;
//                 const price = parseFloat(file.price) || 0;
//                 const total = quantity * price;
                
//                 return (
//                   <tr key={file.id}>
//                     <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
//                       {file.name}
//                     </td>
//                     <td>
//                       <Form.Control 
//                         size="sm" 
//                         type="text"
//                         placeholder="Add label"
//                         defaultValue={file.label || ''}
//                         onBlur={(e) => handleLabelChange(file.id, e.target.value)}
//                         style={{
//                           backgroundColor: styles.colors.darkAlt,
//                           color: styles.colors.text.light,
//                           border: `1px solid ${styles.colors.border}`,
//                         }}
//                       />
//                     </td>
//                     <td>
//                       <Form.Control 
//                         size="sm" 
//                         type="number"
//                         min="1"
//                         value={quantity}
//                         onChange={(e) => handleQuantityChange(file.id, e.target.value)}
//                         style={{
//                           backgroundColor: styles.colors.darkAlt,
//                           color: styles.colors.text.light,
//                           border: `1px solid ${styles.colors.border}`,
//                           width: '100%'
//                         }}
//                       />
//                     </td>
//                     <td>
//                       <Form.Control 
//                         size="sm" 
//                         type="number"
//                         min="0"
//                         step="0.01"
//                         value={file.price === '' ? '' : price}
//                         onChange={(e) => handlePriceChange(file.id, e.target.value)}
//                         style={{
//                           backgroundColor: styles.colors.darkAlt,
//                           color: styles.colors.text.light,
//                           border: `1px solid ${styles.colors.border}`,
//                           width: '100%'
//                         }}
//                       />
//                     </td>
//                     <td style={{ 
//                       minWidth: '80px',
//                       textAlign: 'right'
//                     }}>
//                       {total.toFixed(2)}
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//             <tfoot>
//               <tr style={{ backgroundColor: styles.colors.darkAlt }}>
//                 <td colSpan="4" className="text-end"><strong>Total</strong></td>
//                 <td style={{ textAlign: 'right' }}>
//                   <strong>{calculateSpreadsheetTotal()}</strong>
//                 </td>
//               </tr>
//             </tfoot>
//           </Table>
//         </div>
//       )}
      
//       {/* Grand Total */}
//       <div 
//         className="mt-4 p-3" 
//         style={{ 
//           backgroundColor: styles.colors.darkAlt, 
//           borderRadius: '4px', 
//           borderLeft: `4px solid ${styles.colors.success}`
//         }}
//       >
//         <div className="d-flex justify-content-between align-items-center">
//           <h5 className="mb-0">Grand Total</h5>
//           <h5 className="mb-0">₹ {calculateGrandTotal()}</h5>
//         </div>
//       </div>
//     </div>
//   );
// }
// function BOMView({ prod, updateFile }) {
//   const [showFilters, setShowFilters] = useState(false);
//   const [visibleGroups, setVisibleGroups] = useState({});

//   // Calculate stageFiles even if prod.selectedStage is false.
//   const stageFiles = prod.selectedStage ? (prod.filesByStage[prod.selectedStage] || []) : [];

//   // Helper function to get the latest version of each file
//   const getLatestVersionFiles = () => {
//     return stageFiles.map(file => {
//       if (file.revisions && file.selected_revision_obj) {
//         return { ...file, ...file.selected_revision_obj };
//       }
//       return file;
//     });
//   };

//   const latestFiles = getLatestVersionFiles();

//   // Group files by parent for DXF files
//   const parentFileMap = {};
//   const dxfParentFiles = [];
//   const spreadsheetFiles = [];

//   // Identify DXF parent files and spreadsheets
//   latestFiles.forEach(file => {
//     if (file.isChildFile) return;
//     const ext = file.name.split('.').pop().toLowerCase();

//     if (ext === 'dxf') {
//       dxfParentFiles.push(file);
//       parentFileMap[file.id] = [];
//     } else if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
//       spreadsheetFiles.push(file);
//     }
//   });

//   // Group child files by their parent
//   latestFiles.forEach(file => {
//     if (!file.isChildFile) return;
//     if (parentFileMap.hasOwnProperty(file.parentId)) {
//       parentFileMap[file.parentId].push(file);
//     }
//   });

//   // Initialize visible groups if not set, called unconditionally
//   useEffect(() => {
//     if (Object.keys(visibleGroups).length === 0) {
//       const initialGroups = {};
//       // Set all DXF parent files to visible
//       dxfParentFiles.forEach(file => {
//         initialGroups[file.id] = true;
//       });
//       // Set spreadsheet group to visible
//       initialGroups['spreadsheets'] = true;
//       setVisibleGroups(initialGroups);
//     }
//   }, [dxfParentFiles, visibleGroups]);

//   // Early return if no stage is selected AFTER hooks have been called
//   if (!prod.selectedStage) {
//     return <p className="text-muted">Select a Stage/Iteration to view BOM.</p>;
//   }

//   // Function to toggle group visibility
//   const toggleGroupVisibility = (groupId) => {
//     setVisibleGroups(prev => ({
//       ...prev,
//       [groupId]: !prev[groupId]
//     }));
//   };

//   // Function to toggle all groups
//   const toggleAllGroups = (value) => {
//     const updatedGroups = {};
//     dxfParentFiles.forEach(file => {
//       updatedGroups[file.id] = value;
//     });
//     updatedGroups['spreadsheets'] = value;
//     setVisibleGroups(updatedGroups);
//   };

//   // Calculate grand total across all tables
//   const calculateGrandTotal = () => {
//     let total = 0;
//     dxfParentFiles.forEach(file => {
//       const quantity = file.quantity || 1;
//       const price = parseFloat(file.price) || 0;
//       total += quantity * price;
//       if (parentFileMap[file.id]) {
//         parentFileMap[file.id].forEach(childFile => {
//           const childQuantity = childFile.quantity || 1;
//           const childPrice = parseFloat(childFile.price) || 0;
//           total += childQuantity * childPrice;
//         });
//       }
//     });
//     spreadsheetFiles.forEach(file => {
//       const quantity = file.quantity || 1;
//       const price = parseFloat(file.price) || 0;
//       total += quantity * price;
//     });
//     return total.toFixed(2);
//   };

//   // Function to calculate total for a parent and its children
//   const calculateGroupTotal = (parentFile) => {
//     let total = 0;
//     const parentQuantity = parentFile.quantity || 1;
//     const parentPrice = parseFloat(parentFile.price) || 0;
//     total += parentQuantity * parentPrice;
//     if (parentFileMap[parentFile.id]) {
//       parentFileMap[parentFile.id].forEach(childFile => {
//         const childQuantity = childFile.quantity || 1;
//         const childPrice = parseFloat(childFile.price) || 0;
//         total += childQuantity * childPrice;
//       });
//     }
//     return total.toFixed(2);
//   };

//   // Function to calculate total for spreadsheets
//   const calculateSpreadsheetTotal = () => {
//     return spreadsheetFiles.reduce((sum, file) => {
//       const quantity = file.quantity || 1;
//       const price = parseFloat(file.price) || 0;
//       return sum + (quantity * price);
//     }, 0).toFixed(2);
//   };

//   // Function handlers
//   const handleLabelChange = (fileId, newLabel) => {
//     updateFile(fileId, { label: newLabel });
//   };

//   const handleQuantityChange = (fileId, newQuantity) => {
//     const quantity = parseInt(newQuantity) || 1;
//     updateFile(fileId, { quantity: quantity });
//   };

//   const handlePriceChange = (fileId, newPrice) => {
//     const price = newPrice === '' ? '' : (parseFloat(newPrice) || 0);
//     updateFile(fileId, { price: price });
//   };

//   return (
//     <div className="p-3">
//       <div className="d-flex justify-content-between align-items-center mb-3">
//         <h4 className="mb-0">Bill of Materials: {prod.name} - {prod.selectedStage}</h4>
//         <div className="d-flex align-items-center">
//           <Button 
//             variant="outline-secondary" 
//             size="sm" 
//             className="me-2" 
//             onClick={() => setShowFilters(!showFilters)}
//           >
//             <FaFilter className="me-1" /> Filters
//           </Button>
//         </div>
//       </div>

//       {/* Filters Panel */}
//       {showFilters && (
//         <div className="mb-3 p-3" style={{ backgroundColor: `${styles.colors.darkAlt}44`, borderRadius: '4px' }}>
//           <h6>Toggle Visibility:</h6>
//           <div className="d-flex flex-wrap gap-2 mt-2">
//             <Button 
//               variant="outline-secondary" 
//               size="sm"
//               onClick={() => toggleAllGroups(true)}
//             >
//               Show All
//             </Button>
//             <Button 
//               variant="outline-secondary" 
//               size="sm"
//               onClick={() => toggleAllGroups(false)}
//             >
//               Hide All
//             </Button>
//             {dxfParentFiles.map(file => (
//               <Button
//                 key={file.id} 
//                 variant={visibleGroups[file.id] ? "outline-success" : "outline-danger"}
//                 size="sm"
//                 onClick={() => toggleGroupVisibility(file.id)}
//               >
//                 {file.name.split('.')[0]}
//               </Button>
//             ))}
//             {spreadsheetFiles.length > 0 && (
//               <Button
//                 variant={visibleGroups['spreadsheets'] ? "outline-success" : "outline-danger"}
//                 size="sm"
//                 onClick={() => toggleGroupVisibility('spreadsheets')}
//               >
//                 Spreadsheets
//               </Button>
//             )}
//           </div>
//         </div>
//       )}

//       {/* DXF Parent Files and their children */}
//       {dxfParentFiles.map(parentFile => {
//         if (!visibleGroups[parentFile.id]) return null;
//         const parentName = parentFile.name.split('.')[0];
//         const childFiles = parentFileMap[parentFile.id] || [];
//         return (
//           <div key={parentFile.id} className="mb-4">
//             <h5 style={{ 
//               backgroundColor: styles.colors.darkAlt, 
//               padding: '10px 15px', 
//               borderRadius: '4px 4px 0 0', 
//               marginBottom: 0,
//               borderBottom: `1px solid ${styles.colors.border}`
//             }}>
//               {parentName}
//             </h5>
//             <Table 
//               striped 
//               bordered 
//               hover 
//               variant="dark" 
//               className="mb-0"
//               style={{ 
//                 borderCollapse: 'collapse',
//                 borderRadius: '0 0 4px 4px',
//                 overflow: 'hidden',
//                 border: `1px solid ${styles.colors.border}`
//               }}
//             >
//               <thead>
//                 <tr style={{ backgroundColor: `${styles.colors.darkAlt}88` }}>
//                   <th style={{ width: '40%' }}>Component</th>
//                   <th style={{ width: '25%' }}>Label</th>
//                   <th style={{ width: '10%' }}>Qty</th>
//                   <th style={{ width: '12%' }}>Price (₹)</th>
//                   <th style={{ width: '13%' }}>Total (₹)</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {/* Parent file row */}
//                 <tr key={parentFile.id}>
//                   <td style={{ whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: '500' }}>
//                     {parentFile.name}
//                   </td>
//                   <td>
//                     <Form.Control 
//                       size="sm" 
//                       type="text"
//                       placeholder="Add label"
//                       defaultValue={parentFile.label || ''}
//                       onBlur={(e) => handleLabelChange(parentFile.id, e.target.value)}
//                       style={{
//                         backgroundColor: styles.colors.darkAlt,
//                         color: styles.colors.text.light,
//                         border: `1px solid ${styles.colors.border}`
//                       }}
//                     />
//                   </td>
//                   <td>
//                     <Form.Control 
//                       size="sm" 
//                       type="number"
//                       min="1"
//                       value={parentFile.quantity || 1}
//                       onChange={(e) => handleQuantityChange(parentFile.id, e.target.value)}
//                       style={{
//                         backgroundColor: styles.colors.darkAlt,
//                         color: styles.colors.text.light,
//                         border: `1px solid ${styles.colors.border}`,
//                         width: '100%'
//                       }}
//                     />
//                   </td>
//                   <td>
//                     <Form.Control 
//                       size="sm" 
//                       type="number"
//                       min="0"
//                       step="0.01"
//                       value={parentFile.price === '' ? '' : (parseFloat(parentFile.price) || 0)}
//                       onChange={(e) => handlePriceChange(parentFile.id, e.target.value)}
//                       style={{
//                         backgroundColor: styles.colors.darkAlt,
//                         color: styles.colors.text.light,
//                         border: `1px solid ${styles.colors.border}`,
//                         width: '100%'
//                       }}
//                     />
//                   </td>
//                   <td style={{ minWidth: '80px', textAlign: 'right' }}>
//                     {((parentFile.quantity || 1) * (parseFloat(parentFile.price) || 0)).toFixed(2)}
//                   </td>
//                 </tr>
//                 {/* Child file rows */}
//                 {childFiles.map(childFile => {
//                   const quantity = childFile.quantity || 1;
//                   const price = parseFloat(childFile.price) || 0;
//                   const total = quantity * price;
//                   return (
//                     <tr 
//                       key={childFile.id}
//                       style={{ backgroundColor: 'rgba(40, 45, 50, 0.8)' }}
//                     >
//                       <td style={{ whiteSpace: 'normal', wordBreak: 'break-word', paddingLeft: '25px' }}>
//                         <span style={{ opacity: 0.8 }}>↳</span> {childFile.name}
//                       </td>
//                       <td>
//                         <Form.Control 
//                           size="sm" 
//                           type="text"
//                           placeholder="Add label"
//                           defaultValue={childFile.label || ''}
//                           onBlur={(e) => handleLabelChange(childFile.id, e.target.value)}
//                           style={{
//                             backgroundColor: styles.colors.darkAlt,
//                             color: styles.colors.text.light,
//                             border: `1px solid ${styles.colors.border}`
//                           }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control 
//                           size="sm" 
//                           type="number"
//                           min="1"
//                           value={quantity}
//                           onChange={(e) => handleQuantityChange(childFile.id, e.target.value)}
//                           style={{
//                             backgroundColor: styles.colors.darkAlt,
//                             color: styles.colors.text.light,
//                             border: `1px solid ${styles.colors.border}`,
//                             width: '100%'
//                           }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control 
//                           size="sm" 
//                           type="number"
//                           min="0"
//                           step="0.01"
//                           value={childFile.price === '' ? '' : price}
//                           onChange={(e) => handlePriceChange(childFile.id, e.target.value)}
//                           style={{
//                             backgroundColor: styles.colors.darkAlt,
//                             color: styles.colors.text.light,
//                             border: `1px solid ${styles.colors.border}`,
//                             width: '100%'
//                           }}
//                         />
//                       </td>
//                       <td style={{ minWidth: '80px', textAlign: 'right' }}>
//                         {total.toFixed(2)}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//               <tfoot>
//                 <tr style={{ backgroundColor: styles.colors.darkAlt }}>
//                   <td colSpan="4" className="text-end"><strong>Total</strong></td>
//                   <td style={{ textAlign: 'right' }}>
//                     <strong>{calculateGroupTotal(parentFile)}</strong>
//                   </td>
//                 </tr>
//               </tfoot>
//             </Table>
//           </div>
//         );
//       })}

//       {/* Spreadsheet Files */}
//       {spreadsheetFiles.length > 0 && visibleGroups['spreadsheets'] && (
//         <div className="mb-4">
//           <h5 style={{ 
//             backgroundColor: styles.colors.darkAlt, 
//             padding: '10px 15px', 
//             borderRadius: '4px 4px 0 0', 
//             marginBottom: 0,
//             borderBottom: `1px solid ${styles.colors.border}`
//           }}>
//             Spreadsheets
//           </h5>
//           <Table 
//             striped 
//             bordered 
//             hover 
//             variant="dark" 
//             className="mb-0"
//             style={{ 
//               borderCollapse: 'collapse',
//               borderRadius: '0 0 4px 4px',
//               overflow: 'hidden',
//               border: `1px solid ${styles.colors.border}`
//             }}
//           >
//             <thead>
//               <tr style={{ backgroundColor: `${styles.colors.darkAlt}88` }}>
//                 <th style={{ width: '40%' }}>Component</th>
//                 <th style={{ width: '25%' }}>Label</th>
//                 <th style={{ width: '10%' }}>Qty</th>
//                 <th style={{ width: '12%' }}>Price (₹)</th>
//                 <th style={{ width: '13%' }}>Total (₹)</th>
//               </tr>
//             </thead>
//             <tbody>
//               {spreadsheetFiles.map(file => {
//                 const quantity = file.quantity || 1;
//                 const price = parseFloat(file.price) || 0;
//                 const total = quantity * price;
//                 return (
//                   <tr key={file.id}>
//                     <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
//                       {file.name}
//                     </td>
//                     <td>
//                       <Form.Control 
//                         size="sm" 
//                         type="text"
//                         placeholder="Add label"
//                         defaultValue={file.label || ''}
//                         onBlur={(e) => handleLabelChange(file.id, e.target.value)}
//                         style={{
//                           backgroundColor: styles.colors.darkAlt,
//                           color: styles.colors.text.light,
//                           border: `1px solid ${styles.colors.border}`
//                         }}
//                       />
//                     </td>
//                     <td>
//                       <Form.Control 
//                         size="sm" 
//                         type="number"
//                         min="1"
//                         value={quantity}
//                         onChange={(e) => handleQuantityChange(file.id, e.target.value)}
//                         style={{
//                           backgroundColor: styles.colors.darkAlt,
//                           color: styles.colors.text.light,
//                           border: `1px solid ${styles.colors.border}`,
//                           width: '100%'
//                         }}
//                       />
//                     </td>
//                     <td>
//                       <Form.Control 
//                         size="sm" 
//                         type="number"
//                         min="0"
//                         step="0.01"
//                         value={file.price === '' ? '' : price}
//                         onChange={(e) => handlePriceChange(file.id, e.target.value)}
//                         style={{
//                           backgroundColor: styles.colors.darkAlt,
//                           color: styles.colors.text.light,
//                           border: `1px solid ${styles.colors.border}`,
//                           width: '100%'
//                         }}
//                       />
//                     </td>
//                     <td style={{ minWidth: '80px', textAlign: 'right' }}>
//                       {total.toFixed(2)}
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//             <tfoot>
//               <tr style={{ backgroundColor: styles.colors.darkAlt }}>
//                 <td colSpan="4" className="text-end"><strong>Total</strong></td>
//                 <td style={{ textAlign: 'right' }}>
//                   <strong>{calculateSpreadsheetTotal()}</strong>
//                 </td>
//               </tr>
//             </tfoot>
//           </Table>
//         </div>
//       )}

//       {/* Grand Total */}
//       <div 
//         className="mt-4 p-3" 
//         style={{ 
//           backgroundColor: styles.colors.darkAlt, 
//           borderRadius: '4px', 
//           borderLeft: `4px solid ${styles.colors.success}`
//         }}
//       >
//         <div className="d-flex justify-content-between align-items-center">
//           <h5 className="mb-0">Grand Total</h5>
//           <h5 className="mb-0">₹ {calculateGrandTotal()}</h5>
//         </div>
//       </div>
//     </div>
//   );
// }
// function BOMView({ prod, updateFile }) {
//   // Early return if no stage is selected
//   if (!prod.selectedStage) {
//     return <p className="text-muted">Select a Stage/Iteration to view BOM.</p>;
//   }

//   // Get files for the selected stage and update to latest versions
//   const stageFiles = prod.filesByStage[prod.selectedStage] || [];
//   const latestFiles = stageFiles.map(file => {
//     if (file.revisions && file.selected_revision_obj) {
//       return { ...file, ...file.selected_revision_obj };
//     }
//     return file;
//   });

//   // --------------------------
//   // DXF Files Processing
//   // --------------------------
//   // Filter DXF parent files (non-child files with extension 'dxf')
//   const dxfParentFiles = latestFiles.filter(file => {
//     const ext = file.name.split('.').pop().toLowerCase();
//     return !file.isChildFile && ext === 'dxf';
//   });

//   // Group child files by their DXF parent's id
//   const parentFileMap = {};
//   dxfParentFiles.forEach(parent => {
//     parentFileMap[parent.id] = [];
//   });
//   latestFiles.forEach(file => {
//     if (!file.isChildFile) return;
//     if (parentFileMap.hasOwnProperty(file.parentId)) {
//       parentFileMap[file.parentId].push(file);
//     }
//   });

//   // --------------------------
//   // Spreadsheet Files Processing
//   // --------------------------
//   // Filter spreadsheet files (extensions 'xls', 'xlsx', or 'csv')
//   const spreadsheetFiles = latestFiles.filter(file => {
//     const ext = file.name.split('.').pop().toLowerCase();
//     return ext === 'xls' || ext === 'xlsx' || ext === 'csv';
//   });

//   // --------------------------
//   // Handlers for field updates
//   // --------------------------
//   const handleLabelChange = (fileId, newLabel) => {
//     updateFile(fileId, { label: newLabel });
//   };

//   const handleQuantityChange = (fileId, newQuantity) => {
//     const quantity = parseInt(newQuantity, 10) || 1;
//     updateFile(fileId, { quantity });
//   };

//   const handlePriceChange = (fileId, newPrice) => {
//     const price = newPrice === '' ? '' : (parseFloat(newPrice) || 0);
//     updateFile(fileId, { price });
//   };

//   // --------------------------
//   // Calculation functions
//   // --------------------------
//   // Calculate total for a DXF parent and its children
//   const calculateGroupTotal = (parent) => {
//     let total = 0;
//     const parentQuantity = parent.quantity || 1;
//     const parentPrice = parseFloat(parent.price) || 0;
//     total += parentQuantity * parentPrice;
//     (parentFileMap[parent.id] || []).forEach(child => {
//       const childQuantity = child.quantity || 1;
//       const childPrice = parseFloat(child.price) || 0;
//       total += childQuantity * childPrice;
//     });
//     return total.toFixed(2);
//   };

//   // Calculate total for a single spreadsheet file
//   const calculateSpreadsheetTotal = (file) => {
//     const quantity = file.quantity || 1;
//     const price = parseFloat(file.price) || 0;
//     return (quantity * price).toFixed(2);
//   };

//   // Calculate the grand total from all DXF tables and all spreadsheet tables
//   const calculateGrandTotal = () => {
//     let total = 0;
//     // Sum DXF totals
//     dxfParentFiles.forEach(parent => {
//       const parentTotal = (parent.quantity || 1) * (parseFloat(parent.price) || 0);
//       let childrenTotal = 0;
//       (parentFileMap[parent.id] || []).forEach(child => {
//         childrenTotal += (child.quantity || 1) * (parseFloat(child.price) || 0);
//       });
//       total += parentTotal + childrenTotal;
//     });
//     // Sum spreadsheet totals
//     spreadsheetFiles.forEach(file => {
//       total += (file.quantity || 1) * (parseFloat(file.price) || 0);
//     });
//     return total.toFixed(2);
//   };

//   // --------------------------
//   // Rendering
//   // --------------------------
//   return (
//     <div className="p-3">
//       <h4>Bill of Materials: {prod.name} - {prod.selectedStage}</h4>

//       {/* DXF Files Tables */}
//       {dxfParentFiles.map(parent => {
//         // Parent table header shows the name without its extension
//         const parentName = parent.name.split('.')[0];
//         const childFiles = parentFileMap[parent.id] || [];
//         return (
//           <div key={parent.id} className="mb-4">
//             <h5 style={{ backgroundColor: '#1F2937', padding: '10px 15px', borderRadius: '4px 4px 0 0', marginBottom: 0, borderBottom: '1px solid #374151' }}>
//               {parentName}
//             </h5>
//             <Table striped bordered hover variant="dark" className="mb-0" style={{ borderCollapse: 'collapse', borderRadius: '0 0 4px 4px', overflow: 'hidden', border: '1px solid #374151' }}>
//               <thead>
//                 <tr style={{ backgroundColor: '#1F2937' }}>
//                   <th style={{ width: '40%' }}>Component</th>
//                   <th style={{ width: '25%' }}>Label</th>
//                   <th style={{ width: '10%' }}>Qty</th>
//                   <th style={{ width: '12%' }}>Price (₹)</th>
//                   <th style={{ width: '13%' }}>Total (₹)</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {/* Parent file row */}
//                 <tr key={parent.id}>
//                   <td style={{ whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: '500' }}>
//                     {parent.name}
//                   </td>
//                   <td>
//                     <Form.Control 
//                       size="sm" 
//                       type="text"
//                       placeholder="Add label"
//                       defaultValue={parent.label || ''}
//                       onBlur={(e) => handleLabelChange(parent.id, e.target.value)}
//                       style={{ backgroundColor: '#1F2937', color: '#F3F4F6', border: '1px solid #374151' }}
//                     />
//                   </td>
//                   <td>
//                     <Form.Control 
//                       size="sm" 
//                       type="number"
//                       min="1"
//                       value={parent.quantity || 1}
//                       onChange={(e) => handleQuantityChange(parent.id, e.target.value)}
//                       style={{ backgroundColor: '#1F2937', color: '#F3F4F6', border: '1px solid #374151', width: '100%' }}
//                     />
//                   </td>
//                   <td>
//                     <Form.Control 
//                       size="sm" 
//                       type="number"
//                       min="0"
//                       step="0.01"
//                       value={parent.price === '' ? '' : (parseFloat(parent.price) || 0)}
//                       onChange={(e) => handlePriceChange(parent.id, e.target.value)}
//                       style={{ backgroundColor: '#1F2937', color: '#F3F4F6', border: '1px solid #374151', width: '100%' }}
//                     />
//                   </td>
//                   <td style={{ minWidth: '80px', textAlign: 'right' }}>
//                     {((parent.quantity || 1) * (parseFloat(parent.price) || 0)).toFixed(2)}
//                   </td>
//                 </tr>
//                 {/* Child file rows */}
//                 {childFiles.map(child => {
//                   const quantity = child.quantity || 1;
//                   const price = parseFloat(child.price) || 0;
//                   const total = (quantity * price).toFixed(2);
//                   return (
//                     <tr key={child.id} style={{ backgroundColor: 'rgba(40, 45, 50, 0.8)' }}>
//                       <td style={{ whiteSpace: 'normal', wordBreak: 'break-word', paddingLeft: '25px' }}>
//                         <span style={{ opacity: 0.8 }}>↳</span> {child.name}
//                       </td>
//                       <td>
//                         <Form.Control 
//                           size="sm" 
//                           type="text"
//                           placeholder="Add label"
//                           defaultValue={child.label || ''}
//                           onBlur={(e) => handleLabelChange(child.id, e.target.value)}
//                           style={{ backgroundColor: '#1F2937', color: '#F3F4F6', border: '1px solid #374151' }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control 
//                           size="sm" 
//                           type="number"
//                           min="1"
//                           value={quantity}
//                           onChange={(e) => handleQuantityChange(child.id, e.target.value)}
//                           style={{ backgroundColor: '#1F2937', color: '#F3F4F6', border: '1px solid #374151', width: '100%' }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control 
//                           size="sm" 
//                           type="number"
//                           min="0"
//                           step="0.01"
//                           value={child.price === '' ? '' : price}
//                           onChange={(e) => handlePriceChange(child.id, e.target.value)}
//                           style={{ backgroundColor: '#1F2937', color: '#F3F4F6', border: '1px solid #374151', width: '100%' }}
//                         />
//                       </td>
//                       <td style={{ minWidth: '80px', textAlign: 'right' }}>
//                         {total}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//               <tfoot>
//                 <tr style={{ backgroundColor: '#1F2937' }}>
//                   <td colSpan="4" className="text-end"><strong>Total</strong></td>
//                   <td style={{ textAlign: 'right' }}>
//                     <strong>{calculateGroupTotal(parent)}</strong>
//                   </td>
//                 </tr>
//               </tfoot>
//             </Table>
//           </div>
//         );
//       })}

//       {/* Spreadsheets Tables: Each spreadsheet file renders its own table */}
//       {spreadsheetFiles.map(file => {
//         const quantity = file.quantity || 1;
//         const price = parseFloat(file.price) || 0;
//         const total = (quantity * price).toFixed(2);
//         return (
//           <div key={file.id} className="mb-4">
//             <h5 style={{ backgroundColor: '#1F2937', padding: '10px 15px', borderRadius: '4px 4px 0 0', marginBottom: 0, borderBottom: '1px solid #374151' }}>
//               {file.name}
//             </h5>
//             <Table striped bordered hover variant="dark" className="mb-0" style={{ borderCollapse: 'collapse', borderRadius: '0 0 4px 4px', overflow: 'hidden', border: '1px solid #374151' }}>
//               <thead>
//                 <tr style={{ backgroundColor: '#1F2937' }}>
//                   <th style={{ width: '40%' }}>Component</th>
//                   <th style={{ width: '25%' }}>Label</th>
//                   <th style={{ width: '10%' }}>Qty</th>
//                   <th style={{ width: '12%' }}>Price (₹)</th>
//                   <th style={{ width: '13%' }}>Total (₹)</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 <tr key={file.id}>
//                   <td style={{ whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: '500' }}>
//                     {file.name}
//                   </td>
//                   <td>
//                     <Form.Control 
//                       size="sm" 
//                       type="text"
//                       placeholder="Add label"
//                       defaultValue={file.label || ''}
//                       onBlur={(e) => handleLabelChange(file.id, e.target.value)}
//                       style={{ backgroundColor: '#1F2937', color: '#F3F4F6', border: '1px solid #374151' }}
//                     />
//                   </td>
//                   <td>
//                     <Form.Control 
//                       size="sm" 
//                       type="number"
//                       min="1"
//                       value={file.quantity || 1}
//                       onChange={(e) => handleQuantityChange(file.id, e.target.value)}
//                       style={{ backgroundColor: '#1F2937', color: '#F3F4F6', border: '1px solid #374151', width: '100%' }}
//                     />
//                   </td>
//                   <td>
//                     <Form.Control 
//                       size="sm" 
//                       type="number"
//                       min="0"
//                       step="0.01"
//                       value={file.price === '' ? '' : (parseFloat(file.price) || 0)}
//                       onChange={(e) => handlePriceChange(file.id, e.target.value)}
//                       style={{ backgroundColor: '#1F2937', color: '#F3F4F6', border: '1px solid #374151', width: '100%' }}
//                     />
//                   </td>
//                   <td style={{ minWidth: '80px', textAlign: 'right' }}>
//                     {total}
//                   </td>
//                 </tr>
//               </tbody>
//               <tfoot>
//                 <tr style={{ backgroundColor: '#1F2937' }}>
//                   <td colSpan="4" className="text-end"><strong>Total</strong></td>
//                   <td style={{ textAlign: 'right' }}>
//                     <strong>{total}</strong>
//                   </td>
//                 </tr>
//               </tfoot>
//             </Table>
//           </div>
//         );
//       })}

//       {/* Grand Total */}
//       <div className="mt-4 p-3" style={{ backgroundColor: '#1F2937', borderRadius: '4px', borderLeft: '4px solid #059669' }}>
//         <div className="d-flex justify-content-between align-items-center">
//           <h5 className="mb-0">Grand Total</h5>
//           <h5 className="mb-0">₹ {calculateGrandTotal()}</h5>
//         </div>
//       </div>
//     </div>
//   );
// }
//CHECKPOINT
// function BOMView({ prod, updateFile }) {
//   // Retrieve files for the selected stage; if no stage is selected, stageFiles will be an empty array
//   const stageFiles = prod.selectedStage ? (prod.filesByStage[prod.selectedStage] || []) : [];
//   // Update each file to its latest version if available
//   const latestFiles = stageFiles.map(file => {
//     if (file.revisions && file.selected_revision_obj) {
//       return { ...file, ...file.selected_revision_obj };
//     }
//     return file;
//   });

//   // --------------------------
//   // DXF Files Processing
//   // --------------------------
//   // Filter for DXF parent files (non-child files with extension "dxf")
//   const dxfParentFiles = latestFiles.filter(file => {
//     const ext = file.name.split('.').pop().toLowerCase();
//     return !file.isChildFile && ext === "dxf";
//   });
//   // Group child files by their DXF parent's id
//   const parentFileMap = {};
//   dxfParentFiles.forEach(parent => {
//     parentFileMap[parent.id] = [];
//   });
//   latestFiles.forEach(file => {
//     if (file.isChildFile && parentFileMap.hasOwnProperty(file.parentId)) {
//       parentFileMap[file.parentId].push(file);
//     }
//   });

//   // --------------------------
//   // Spreadsheet Files Processing
//   // --------------------------
//   // Filter for spreadsheet files (extensions "xls", "xlsx", or "csv")
//   const spreadsheetFiles = latestFiles.filter(file => {
//     const ext = file.name.split('.').pop().toLowerCase();
//     return ext === "xls" || ext === "xlsx" || ext === "csv";
//   });

//   // --------------------------
//   // Field Update Handlers
//   // --------------------------
//   const handleLabelChange = (fileId, newLabel) => {
//     updateFile(fileId, { label: newLabel });
//   };

//   const handleQuantityChange = (fileId, newQuantity) => {
//     const quantity = parseInt(newQuantity, 10) || 1;
//     updateFile(fileId, { quantity });
//   };

//   const handlePriceChange = (fileId, newPrice) => {
//     const price = newPrice === '' ? '' : (parseFloat(newPrice) || 0);
//     updateFile(fileId, { price });
//   };

//   // --------------------------
//   // Calculation Functions
//   // --------------------------
//   // Calculate total for a DXF parent and its children
//   const calculateGroupTotal = (parent) => {
//     let total = 0;
//     const parentQty = parent.quantity || 1;
//     const parentPrice = parseFloat(parent.price) || 0;
//     total += parentQty * parentPrice;
//     (parentFileMap[parent.id] || []).forEach(child => {
//       const childQty = child.quantity || 1;
//       const childPrice = parseFloat(child.price) || 0;
//       total += childQty * childPrice;
//     });
//     return total.toFixed(2);
//   };

//   // Calculate total for a single spreadsheet file
//   const calculateSpreadsheetTotal = (file) => {
//     const qty = file.quantity || 1;
//     const price = parseFloat(file.price) || 0;
//     return (qty * price).toFixed(2);
//   };

//   // Calculate the grand total across all DXF tables and spreadsheet tables
//   const calculateGrandTotal = () => {
//     let total = 0;
//     dxfParentFiles.forEach(parent => {
//       const parentTotal = (parent.quantity || 1) * (parseFloat(parent.price) || 0);
//       let childTotal = 0;
//       (parentFileMap[parent.id] || []).forEach(child => {
//         childTotal += (child.quantity || 1) * (parseFloat(child.price) || 0);
//       });
//       total += parentTotal + childTotal;
//     });
//     spreadsheetFiles.forEach(file => {
//       total += (file.quantity || 1) * (parseFloat(file.price) || 0);
//     });
//     return total.toFixed(2);
//   };

//   // --------------------------
//   // Rendering
//   // --------------------------
//   return (
//     <div className="p-3">
//       <h4>
//         Bill of Materials: {prod.name} - {prod.selectedStage || "No Stage Selected"}
//       </h4>
//       {/* If no stage is selected, show a message but still render BOM view structure */}
//       {!prod.selectedStage ? (
//         <p className="text-muted">Select a Stage/Iteration to view BOM.</p>
//       ) : (
//         <>
//           {/* DXF Files: Render each DXF parent and its children as a table */}
//           {dxfParentFiles.map(parent => {
//             const headerName = parent.name.split('.')[0]; // Remove extension for header
//             const children = parentFileMap[parent.id] || [];
//             return (
//               <div key={parent.id} className="mb-4">
//                 <h5
//                   style={{
//                     backgroundColor: "#1F2937",
//                     padding: "10px 15px",
//                     borderRadius: "4px 4px 0 0",
//                     marginBottom: 0,
//                     borderBottom: "1px solid #374151"
//                   }}
//                 >
//                   {headerName}
//                 </h5>
//                 <Table
//                   striped
//                   bordered
//                   hover
//                   variant="dark"
//                   className="mb-0"
//                   style={{
//                     borderCollapse: "collapse",
//                     borderRadius: "0 0 4px 4px",
//                     overflow: "hidden",
//                     border: "1px solid #374151"
//                   }}
//                 >
//                   <thead>
//                     <tr style={{ backgroundColor: "#1F2937" }}>
//                       <th style={{ width: "40%" }}>Component</th>
//                       <th style={{ width: "25%" }}>Label</th>
//                       <th style={{ width: "10%" }}>Qty</th>
//                       <th style={{ width: "12%" }}>Price (₹)</th>
//                       <th style={{ width: "13%" }}>Total (₹)</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {/* Parent file row */}
//                     <tr key={parent.id}>
//                       <td
//                         style={{
//                           whiteSpace: "normal",
//                           wordBreak: "break-word",
//                           fontWeight: "500"
//                         }}
//                       >
//                         {parent.name}
//                       </td>
//                       <td>
//                         <Form.Control
//                           size="sm"
//                           type="text"
//                           placeholder="Add label"
//                           defaultValue={parent.label || ""}
//                           onBlur={(e) =>
//                             handleLabelChange(parent.id, e.target.value)
//                           }
//                           style={{
//                             backgroundColor: "#1F2937",
//                             color: "#F3F4F6",
//                             border: "1px solid #374151"
//                           }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control
//                           size="sm"
//                           type="number"
//                           min="1"
//                           value={parent.quantity || 1}
//                           onChange={(e) =>
//                             handleQuantityChange(parent.id, e.target.value)
//                           }
//                           style={{
//                             backgroundColor: "#1F2937",
//                             color: "#F3F4F6",
//                             border: "1px solid #374151",
//                             width: "100%"
//                           }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control
//                           size="sm"
//                           type="number"
//                           min="0"
//                           step="0.01"
//                           value={
//                             parent.price === ""
//                               ? ""
//                               : (parseFloat(parent.price) || 0)
//                           }
//                           onChange={(e) =>
//                             handlePriceChange(parent.id, e.target.value)
//                           }
//                           style={{
//                             backgroundColor: "#1F2937",
//                             color: "#F3F4F6",
//                             border: "1px solid #374151",
//                             width: "100%"
//                           }}
//                         />
//                       </td>
//                       <td style={{ minWidth: "80px", textAlign: "right" }}>
//                         {((parent.quantity || 1) *
//                           (parseFloat(parent.price) || 0)).toFixed(2)}
//                       </td>
//                     </tr>
//                     {/* Render child files */}
//                     {children.map(child => {
//                       const qty = child.quantity || 1;
//                       const price = parseFloat(child.price) || 0;
//                       const total = (qty * price).toFixed(2);
//                       return (
//                         <tr
//                           key={child.id}
//                           style={{ backgroundColor: "rgba(40,45,50,0.8)" }}
//                         >
//                           <td
//                             style={{
//                               whiteSpace: "normal",
//                               wordBreak: "break-word",
//                               paddingLeft: "25px"
//                             }}
//                           >
//                             <span style={{ opacity: 0.8 }}>↳</span> {child.name}
//                           </td>
//                           <td>
//                             <Form.Control
//                               size="sm"
//                               type="text"
//                               placeholder="Add label"
//                               defaultValue={child.label || ""}
//                               onBlur={(e) =>
//                                 handleLabelChange(child.id, e.target.value)
//                               }
//                               style={{
//                                 backgroundColor: "#1F2937",
//                                 color: "#F3F4F6",
//                                 border: "1px solid #374151"
//                               }}
//                             />
//                           </td>
//                           <td>
//                             <Form.Control
//                               size="sm"
//                               type="number"
//                               min="1"
//                               value={qty}
//                               onChange={(e) =>
//                                 handleQuantityChange(child.id, e.target.value)
//                               }
//                               style={{
//                                 backgroundColor: "#1F2937",
//                                 color: "#F3F4F6",
//                                 border: "1px solid #374151",
//                                 width: "100%"
//                               }}
//                             />
//                           </td>
//                           <td>
//                             <Form.Control
//                               size="sm"
//                               type="number"
//                               min="0"
//                               step="0.01"
//                               value={
//                                 child.price === "" ? "" : price
//                               }
//                               onChange={(e) =>
//                                 handlePriceChange(child.id, e.target.value)
//                               }
//                               style={{
//                                 backgroundColor: "#1F2937",
//                                 color: "#F3F4F6",
//                                 border: "1px solid #374151",
//                                 width: "100%"
//                               }}
//                             />
//                           </td>
//                           <td style={{ minWidth: "80px", textAlign: "right" }}>
//                             {total}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                   <tfoot>
//                     <tr style={{ backgroundColor: "#1F2937" }}>
//                       <td colSpan="4" className="text-end">
//                         <strong>Total</strong>
//                       </td>
//                       <td style={{ textAlign: "right" }}>
//                         <strong>{calculateGroupTotal(parent)}</strong>
//                       </td>
//                     </tr>
//                   </tfoot>
//                 </Table>
//               </div>
//             );
//           })}

//           {/* Render each spreadsheet file as its own table */}
//           {spreadsheetFiles.map(file => {
//             const qty = file.quantity || 1;
//             const price = parseFloat(file.price) || 0;
//             const total = (qty * price).toFixed(2);
//             return (
//               <div key={file.id} className="mb-4">
//                 <h5
//                   style={{
//                     backgroundColor: "#1F2937",
//                     padding: "10px 15px",
//                     borderRadius: "4px 4px 0 0",
//                     marginBottom: 0,
//                     borderBottom: "1px solid #374151"
//                   }}
//                 >
//                   {file.name}
//                 </h5>
//                 <Table
//                   striped
//                   bordered
//                   hover
//                   variant="dark"
//                   className="mb-0"
//                   style={{
//                     borderCollapse: "collapse",
//                     borderRadius: "0 0 4px 4px",
//                     overflow: "hidden",
//                     border: "1px solid #374151"
//                   }}
//                 >
//                   <thead>
//                     <tr style={{ backgroundColor: "#1F2937" }}>
//                       <th style={{ width: "40%" }}>Component</th>
//                       <th style={{ width: "25%" }}>Label</th>
//                       <th style={{ width: "10%" }}>Qty</th>
//                       <th style={{ width: "12%" }}>Price (₹)</th>
//                       <th style={{ width: "13%" }}>Total (₹)</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     <tr key={file.id}>
//                       <td
//                         style={{
//                           whiteSpace: "normal",
//                           wordBreak: "break-word",
//                           fontWeight: "500"
//                         }}
//                       >
//                         {file.name}
//                       </td>
//                       <td>
//                         <Form.Control
//                           size="sm"
//                           type="text"
//                           placeholder="Add label"
//                           defaultValue={file.label || ""}
//                           onBlur={(e) =>
//                             handleLabelChange(file.id, e.target.value)
//                           }
//                           style={{
//                             backgroundColor: "#1F2937",
//                             color: "#F3F4F6",
//                             border: "1px solid #374151"
//                           }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control
//                           size="sm"
//                           type="number"
//                           min="1"
//                           value={file.quantity || 1}
//                           onChange={(e) =>
//                             handleQuantityChange(file.id, e.target.value)
//                           }
//                           style={{
//                             backgroundColor: "#1F2937",
//                             color: "#F3F4F6",
//                             border: "1px solid #374151",
//                             width: "100%"
//                           }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control
//                           size="sm"
//                           type="number"
//                           min="0"
//                           step="0.01"
//                           value={
//                             file.price === ""
//                               ? ""
//                               : (parseFloat(file.price) || 0)
//                           }
//                           onChange={(e) =>
//                             handlePriceChange(file.id, e.target.value)
//                           }
//                           style={{
//                             backgroundColor: "#1F2937",
//                             color: "#F3F4F6",
//                             border: "1px solid #374151",
//                             width: "100%"
//                           }}
//                         />
//                       </td>
//                       <td style={{ minWidth: "80px", textAlign: "right" }}>
//                         {total}
//                       </td>
//                     </tr>
//                   </tbody>
//                   <tfoot>
//                     <tr style={{ backgroundColor: "#1F2937" }}>
//                       <td colSpan="4" className="text-end">
//                         <strong>Total</strong>
//                       </td>
//                       <td style={{ textAlign: "right" }}>
//                         <strong>{total}</strong>
//                       </td>
//                     </tr>
//                   </tfoot>
//                 </Table>
//               </div>
//             );
//           })}

//           {/* Grand Total */}
//           <div
//             className="mt-4 p-3"
//             style={{
//               backgroundColor: "#1F2937",
//               borderRadius: "4px",
//               borderLeft: "4px solid #059669"
//             }}
//           >
//             <div className="d-flex justify-content-between align-items-center">
//               <h5 className="mb-0">Grand Total</h5>
//               <h5 className="mb-0">₹ {calculateGrandTotal()}</h5>
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }
// function BOMView({ prod, updateFile }) {
//   // Retrieve files for the selected stage; if no stage is selected, stageFiles will be an empty array
//   const stageFiles = prod.selectedStage ? (prod.filesByStage[prod.selectedStage] || []) : [];
//   // Update each file to its latest version if available
//   const latestFiles = stageFiles.map(file => {
//     if (file.revisions && file.selected_revision_obj) {
//       return { ...file, ...file.selected_revision_obj };
//     }
//     return file;
//   });

//   // --------------------------
//   // DXF Files Processing
//   // --------------------------
//   // Filter for DXF parent files (non-child files with extension "dxf")
//   const dxfParentFiles = latestFiles.filter(file => {
//     const ext = file.name.split('.').pop().toLowerCase();
//     return !file.isChildFile && ext === "dxf";
//   });
//   // Group child files by their DXF parent's id
//   const parentFileMap = {};
//   dxfParentFiles.forEach(parent => {
//     parentFileMap[parent.id] = [];
//   });
//   latestFiles.forEach(file => {
//     if (file.isChildFile && parentFileMap.hasOwnProperty(file.parentId)) {
//       parentFileMap[file.parentId].push(file);
//     }
//   });

//   // --------------------------
//   // Spreadsheet Files Processing
//   // --------------------------
//   // Filter for spreadsheet files (extensions "xls", "xlsx", or "csv")
//   const spreadsheetFiles = latestFiles.filter(file => {
//     const ext = file.name.split('.').pop().toLowerCase();
//     return ext === "xls" || ext === "xlsx" || ext === "csv";
//   });

//   // --------------------------
//   // Field Update Handlers for DXF rows
//   // --------------------------
//   const handleLabelChange = (fileId, newLabel) => {
//     updateFile(fileId, { label: newLabel });
//   };

//   const handleQuantityChange = (fileId, newQuantity) => {
//     const quantity = parseInt(newQuantity, 10) || 1;
//     updateFile(fileId, { quantity });
//   };

//   const handlePriceChange = (fileId, newPrice) => {
//     const price = newPrice === '' ? '' : (parseFloat(newPrice) || 0);
//     updateFile(fileId, { price });
//   };

//   // --------------------------
//   // Field Update Handler for Spreadsheet Rows
//   // --------------------------
//   // This handler expects updateFile to update a spreadsheet file’s row,
//   // passing the file id, the row id, and the field change.
//   const handleSpreadsheetRowChange = (fileId, rowId, field, value) => {
//     updateFile(fileId, { rowId, [field]: value });
//   };

//   // --------------------------
//   // Calculation Functions
//   // --------------------------
//   // Calculate total for a DXF parent and its children
//   const calculateGroupTotal = (parent) => {
//     let total = 0;
//     const parentQty = parent.quantity || 1;
//     const parentPrice = parseFloat(parent.price) || 0;
//     total += parentQty * parentPrice;
//     (parentFileMap[parent.id] || []).forEach(child => {
//       const childQty = child.quantity || 1;
//       const childPrice = parseFloat(child.price) || 0;
//       total += childQty * childPrice;
//     });
//     return total.toFixed(2);
//   };

//   // Calculate total for a single spreadsheet file based on its contents
//   const calculateSpreadsheetTotal = (file) => {
//     if (Array.isArray(file.contents)) {
//       const total = file.contents.reduce((sum, row) => {
//         const qty = row.quantity || 1;
//         const price = parseFloat(row.price) || 0;
//         return sum + qty * price;
//       }, 0);
//       return total.toFixed(2);
//     }
//     return "0.00";
//   };

//   // Calculate the grand total across all DXF tables and spreadsheet tables
//   const calculateGrandTotal = () => {
//     let total = 0;
//     dxfParentFiles.forEach(parent => {
//       const parentTotal = (parent.quantity || 1) * (parseFloat(parent.price) || 0);
//       let childTotal = 0;
//       (parentFileMap[parent.id] || []).forEach(child => {
//         childTotal += (child.quantity || 1) * (parseFloat(child.price) || 0);
//       });
//       total += parentTotal + childTotal;
//     });
//     spreadsheetFiles.forEach(file => {
//       total += Array.isArray(file.contents)
//         ? file.contents.reduce((sum, row) => {
//             const qty = row.quantity || 1;
//             const price = parseFloat(row.price) || 0;
//             return sum + qty * price;
//           }, 0)
//         : 0;
//     });
//     return total.toFixed(2);
//   };

//   // --------------------------
//   // Rendering
//   // --------------------------
//   return (
//     <div className="p-3">
//       <h4>
//         Bill of Materials: {prod.name} - {prod.selectedStage || "No Stage Selected"}
//       </h4>
//       {/* If no stage is selected, show a message but still render BOM view structure */}
//       {!prod.selectedStage ? (
//         <p className="text-muted">Select a Stage/Iteration to view BOM.</p>
//       ) : (
//         <>
//           {/* DXF Files: Render each DXF parent and its children as a table */}
//           {dxfParentFiles.map(parent => {
//             const headerName = parent.name.split('.')[0]; // Remove extension for header
//             const children = parentFileMap[parent.id] || [];
//             return (
//               <div key={parent.id} className="mb-4">
//                 <h5
//                   style={{
//                     backgroundColor: "#1F2937",
//                     padding: "10px 15px",
//                     borderRadius: "4px 4px 0 0",
//                     marginBottom: 0,
//                     borderBottom: "1px solid #374151"
//                   }}
//                 >
//                   {headerName}
//                 </h5>
//                 <Table
//                   striped
//                   bordered
//                   hover
//                   variant="dark"
//                   className="mb-0"
//                   style={{
//                     borderCollapse: "collapse",
//                     borderRadius: "0 0 4px 4px",
//                     overflow: "hidden",
//                     border: "1px solid #374151"
//                   }}
//                 >
//                   <thead>
//                     <tr style={{ backgroundColor: "#1F2937" }}>
//                       <th style={{ width: "40%" }}>Component</th>
//                       <th style={{ width: "25%" }}>Label</th>
//                       <th style={{ width: "10%" }}>Qty</th>
//                       <th style={{ width: "12%" }}>Price (₹)</th>
//                       <th style={{ width: "13%" }}>Total (₹)</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {/* Parent file row */}
//                     <tr key={parent.id}>
//                       <td
//                         style={{
//                           whiteSpace: "normal",
//                           wordBreak: "break-word",
//                           fontWeight: "500"
//                         }}
//                       >
//                         {parent.name}
//                       </td>
//                       <td>
//                         <Form.Control
//                           size="sm"
//                           type="text"
//                           placeholder="Add label"
//                           defaultValue={parent.label || ""}
//                           onBlur={(e) =>
//                             handleLabelChange(parent.id, e.target.value)
//                           }
//                           style={{
//                             backgroundColor: "#1F2937",
//                             color: "#F3F4F6",
//                             border: "1px solid #374151"
//                           }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control
//                           size="sm"
//                           type="number"
//                           min="1"
//                           value={parent.quantity || 1}
//                           onChange={(e) =>
//                             handleQuantityChange(parent.id, e.target.value)
//                           }
//                           style={{
//                             backgroundColor: "#1F2937",
//                             color: "#F3F4F6",
//                             border: "1px solid #374151",
//                             width: "100%"
//                           }}
//                         />
//                       </td>
//                       <td>
//                         <Form.Control
//                           size="sm"
//                           type="number"
//                           min="0"
//                           step="0.01"
//                           value={parent.price === "" ? "" : (parseFloat(parent.price) || 0)}
//                           onChange={(e) =>
//                             handlePriceChange(parent.id, e.target.value)
//                           }
//                           style={{
//                             backgroundColor: "#1F2937",
//                             color: "#F3F4F6",
//                             border: "1px solid #374151",
//                             width: "100%"
//                           }}
//                         />
//                       </td>
//                       <td style={{ minWidth: "80px", textAlign: "right" }}>
//                         {((parent.quantity || 1) * (parseFloat(parent.price) || 0)).toFixed(2)}
//                       </td>
//                     </tr>
//                     {/* Render child rows */}
//                     {children.map(child => {
//                       const qty = child.quantity || 1;
//                       const price = parseFloat(child.price) || 0;
//                       const total = (qty * price).toFixed(2);
//                       return (
//                         <tr key={child.id} style={{ backgroundColor: "rgba(40,45,50,0.8)" }}>
//                           <td style={{ whiteSpace: "normal", wordBreak: "break-word", paddingLeft: "25px" }}>
//                             <span style={{ opacity: 0.8 }}>↳</span> {child.name}
//                           </td>
//                           <td>
//                             <Form.Control
//                               size="sm"
//                               type="text"
//                               placeholder="Add label"
//                               defaultValue={child.label || ""}
//                               onBlur={(e) =>
//                                 handleLabelChange(child.id, e.target.value)
//                               }
//                               style={{
//                                 backgroundColor: "#1F2937",
//                                 color: "#F3F4F6",
//                                 border: "1px solid #374151"
//                               }}
//                             />
//                           </td>
//                           <td>
//                             <Form.Control
//                               size="sm"
//                               type="number"
//                               min="1"
//                               value={qty}
//                               onChange={(e) =>
//                                 handleQuantityChange(child.id, e.target.value)
//                               }
//                               style={{
//                                 backgroundColor: "#1F2937",
//                                 color: "#F3F4F6",
//                                 border: "1px solid #374151",
//                                 width: "100%"
//                               }}
//                             />
//                           </td>
//                           <td>
//                             <Form.Control
//                               size="sm"
//                               type="number"
//                               min="0"
//                               step="0.01"
//                               value={child.price === "" ? "" : price}
//                               onChange={(e) =>
//                                 handlePriceChange(child.id, e.target.value)
//                               }
//                               style={{
//                                 backgroundColor: "#1F2937",
//                                 color: "#F3F4F6",
//                                 border: "1px solid #374151",
//                                 width: "100%"
//                               }}
//                             />
//                           </td>
//                           <td style={{ minWidth: "80px", textAlign: "right" }}>
//                             {total}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                   <tfoot>
//                     <tr style={{ backgroundColor: "#1F2937" }}>
//                       <td colSpan="4" className="text-end"><strong>Total</strong></td>
//                       <td style={{ textAlign: "right" }}>
//                         <strong>{calculateGroupTotal(parent)}</strong>
//                       </td>
//                     </tr>
//                   </tfoot>
//                 </Table>
//               </div>
//             );
//           })}

//           {/* Render each spreadsheet file as its own table with spreadsheet contents */}
//           {spreadsheetFiles.map(file => {
//             // Assume each spreadsheet file object contains a property "contents" which is an array of rows.
//             // Each row should have: id, name, label, quantity, price.
//             const tableTotal = calculateSpreadsheetTotal(file);
//             return (
//               <div key={file.id} className="mb-4">
//                 <h5
//                   style={{
//                     backgroundColor: "#1F2937",
//                     padding: "10px 15px",
//                     borderRadius: "4px 4px 0 0",
//                     marginBottom: 0,
//                     borderBottom: "1px solid #374151"
//                   }}
//                 >
//                   {file.name}
//                 </h5>
//                 <Table
//                   striped
//                   bordered
//                   hover
//                   variant="dark"
//                   className="mb-0"
//                   style={{
//                     borderCollapse: "collapse",
//                     borderRadius: "0 0 4px 4px",
//                     overflow: "hidden",
//                     border: "1px solid #374151"
//                   }}
//                 >
//                   <thead>
//                     <tr style={{ backgroundColor: "#1F2937" }}>
//                       <th style={{ width: "40%" }}>Component</th>
//                       <th style={{ width: "25%" }}>Label</th>
//                       <th style={{ width: "10%" }}>Qty</th>
//                       <th style={{ width: "12%" }}>Price (₹)</th>
//                       <th style={{ width: "13%" }}>Total (₹)</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {Array.isArray(file.contents) && file.contents.map(row => {
//                       const qty = row.quantity || 1;
//                       const price = parseFloat(row.price) || 0;
//                       const total = (qty * price).toFixed(2);
//                       return (
//                         <tr key={row.id}>
//                           <td style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
//                             <Form.Control
//                               size="sm"
//                               type="text"
//                               value={row.name}
//                               onBlur={(e) => handleSpreadsheetRowChange(file.id, row.id, "name", e.target.value)}
//                               style={{
//                                 backgroundColor: "#1F2937",
//                                 color: "#F3F4F6",
//                                 border: "1px solid #374151"
//                               }}
//                             />
//                           </td>
//                           <td>
//                             <Form.Control
//                               size="sm"
//                               type="text"
//                               value={row.label || ""}
//                               onBlur={(e) => handleSpreadsheetRowChange(file.id, row.id, "label", e.target.value)}
//                               style={{
//                                 backgroundColor: "#1F2937",
//                                 color: "#F3F4F6",
//                                 border: "1px solid #374151"
//                               }}
//                             />
//                           </td>
//                           <td>
//                             <Form.Control
//                               size="sm"
//                               type="number"
//                               min="1"
//                               value={row.quantity || 1}
//                               onChange={(e) => handleSpreadsheetRowChange(file.id, row.id, "quantity", e.target.value)}
//                               style={{
//                                 backgroundColor: "#1F2937",
//                                 color: "#F3F4F6",
//                                 border: "1px solid #374151",
//                                 width: "100%"
//                               }}
//                             />
//                           </td>
//                           <td>
//                             <Form.Control
//                               size="sm"
//                               type="number"
//                               min="0"
//                               step="0.01"
//                               value={row.price === "" ? "" : (parseFloat(row.price) || 0)}
//                               onChange={(e) => handleSpreadsheetRowChange(file.id, row.id, "price", e.target.value)}
//                               style={{
//                                 backgroundColor: "#1F2937",
//                                 color: "#F3F4F6",
//                                 border: "1px solid #374151",
//                                 width: "100%"
//                               }}
//                             />
//                           </td>
//                           <td style={{ minWidth: "80px", textAlign: "right" }}>
//                             {total}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                   <tfoot>
//                     <tr style={{ backgroundColor: "#1F2937" }}>
//                       <td colSpan="4" className="text-end">
//                         <strong>Total</strong>
//                       </td>
//                       <td style={{ textAlign: "right" }}>
//                         <strong>{tableTotal}</strong>
//                       </td>
//                     </tr>
//                   </tfoot>
//                 </Table>
//               </div>
//             );
//           })}

//           {/* Grand Total */}
//           <div
//             className="mt-4 p-3"
//             style={{
//               backgroundColor: "#1F2937",
//               borderRadius: "4px",
//               borderLeft: "4px solid #059669"
//             }}
//           >
//             <div className="d-flex justify-content-between align-items-center">
//               <h5 className="mb-0">Grand Total</h5>
//               <h5 className="mb-0">₹ {calculateGrandTotal()}</h5>
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// const renderFileBrowser = () => {
//   // ADD THE MISSING PROD DEFINITION!
//   const prod = products[selectedProductIndex] || {};
  
//   // DEBUG CHECKS:
//   if (!prod.id) {
//     return (
//       <div style={{ color: 'red', padding: '20px' }}>
//         <strong>DEBUG: Product not loaded yet...</strong>
//         <br />selectedProductIndex: {selectedProductIndex}
//         <br />products.length: {products.length}
//         <br />Available products: {products.map(p => p.name).join(', ')}
//       </div>
//     );
//   }
  
//   if (!prod.filesByContainer) {
//     return (
//       <div style={{ color: 'orange', padding: '20px' }}>
//         <strong>DEBUG: Product exists but missing filesByContainer</strong>
//         <br />Product keys: {Object.keys(prod).join(', ')}
//         <br />Product: <pre>{JSON.stringify(prod, null, 2)}</pre>
//       </div>
//     );
//   }

//   return (
//     <>
//       {/* Top Row: Product dropdown, add product, and header icons */}
//       <div className="d-flex justify-content-between align-items-center mb-2">
  
//         {/* Left Side: Product Dropdown + Add Product */}
//         <div className="d-flex align-items-center gap-2">
//           <Form.Select
//             size="sm"
//             value={selectedProductIndex}
//             onChange={handleSelectProduct}
//             style={{
//               width: 'fit-content',
//               backgroundColor: styles.colors.dark,
//               color: styles.colors.text.light,
//               border: `1px solid ${styles.colors.border}`,
//               fontSize: '0.85rem',
//               backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`
//             }}
//             className="shadow-none"
//           >
//             {products.map((p, idx) => (
//               <option key={idx} value={idx}>
//                 {p.name.toUpperCase()}
//               </option>
//             ))}
//           </Form.Select>

             


//           <div
//             style={{
//               cursor: 'pointer',
//               color: styles.colors.text.light,
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               width: '24px',
//               height: '24px'
//             }}
//             //onClick={() => console.log('🔥 PLUS BUTTON CLICKED!')}
//             onClick={handleCreateProduct}
//           >
//             <FaPlus size={20} style={{ transform: 'scale(0.9)', pointerEvents: 'none' }} />
//           </div>
//         </div>

//         {/* Right Side: Icons */}
//         <div className="d-flex align-items-center gap-2">
          
//           <div style={{ cursor: 'pointer' }}
//           //onClick={() => console.log('🔥 ITERATION BUTTON CLICKED!')}
//           //onMouseDown={() => console.log('🔥 MOUSE DOWN!')}
//           onClick={handleAddIteration}
//           >
//             <FaDrumSteelpan size={20} color={styles.colors.iteration} style={{pointerEvents: 'none'}} />
//           </div>
//           <div style={{ cursor: 'pointer' }} onClick={handleAddStage}>
//             <FaToriiGate size={20} color={styles.colors.stage} style={{pointerEvents: 'none'}} />
//           </div>
//           <div
//             style={{
//               width: '24px',
//               height: '24px',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               background: 'transparent',
//               color: '#ffffff',
//               cursor: 'pointer',
//               borderRadius: '4px'
//             }}
//             onClick={handlePlusClick}
//           >
//             <FaUpload size={20} style={{pointerEvents: 'none'}} />
//           </div>
//           <div
//             style={{
//               width: '24px',
//               height: '24px',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               background: 'transparent',
//               color: '#ffffff',
//               cursor: 'pointer',
//               borderRadius: '4px'
//             }}
//             onClick={handleViewChange}
//           >
//             <FaEye size={20} />
//           </div>
//           <div
//             style={{
//               width: '24px',
//               height: '24px',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               background: 'transparent',
//               color: '#ffffff',
//               cursor: 'pointer',
//               borderRadius: '4px'
//             }}
//             onClick={handleShowBOM}
//           >
//             <FaTable size={20} />
//           </div>
//         </div>
//       </div>

//       {/* Render content based on viewMode */}
//       {viewMode === 'normal' ? (
//         renderFileList(prod)
//       ) : (
//         <BOMView prod={prod} updateFile={updateFile} />
//       )}

//       {/* Hidden file input for uploads */}
//       <input
//         type="file"
//         ref={hiddenFileInput}
//         onChange={handleFileChange}
//         style={{ display: 'none' }}
//       />
//     </>
//   );
// };

const renderFileBrowser = () => {
  // Get the base product and ensure it has required local properties
  const baseProduct = products[selectedProductIndex] || {};
  
  // CRITICAL: If product is missing local properties, initialize them in the products array
  if (baseProduct.id && !baseProduct.hasOwnProperty('filesByContainer')) {
    console.log('🔧 FIXING: Product missing local properties, initializing...');
    
    const fixedProducts = [...products];
    fixedProducts[selectedProductIndex] = {
      ...baseProduct,
      selectedContainer: baseProduct.selectedContainer || null,
      containerType: baseProduct.containerType || null,
      filesByContainer: baseProduct.filesByContainer || {}
    };
    
    setProducts(fixedProducts);
    
    // Return loading state to avoid using incomplete data
    return <div>Initializing product properties...</div>;
  }
  
  const prod = {
    ...baseProduct,
    selectedContainer: baseProduct.selectedContainer || null,
    containerType: baseProduct.containerType || null,
    filesByContainer: baseProduct.filesByContainer || {}
  };
  
  // DEBUG CHECK:
  if (!prod.id) {
    return (
      <div style={{ color: 'red', padding: '20px' }}>
        <strong>DEBUG: Product not loaded yet...</strong>
        <br />selectedProductIndex: {selectedProductIndex}
        <br />products.length: {products.length}
        <br />Available products: {products.map(p => p.name).join(', ')}
      </div>
    );
  }

  return (
    <>
      {/* Top Row: Product dropdown, add product, and header icons */}
      <div className="d-flex justify-content-between align-items-center mb-2">
  
        {/* Left Side: Product Dropdown + Add Product */}
        <div className="d-flex align-items-center gap-2">
          <Form.Select
            size="sm"
            value={selectedProductIndex}
            onChange={handleSelectProduct}
            style={{
              width: 'fit-content',
              backgroundColor: styles.colors.dark,
              color: styles.colors.text.light,
              border: `1px solid ${styles.colors.border}`,
              fontSize: '0.85rem',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`
            }}
            className="shadow-none"
          >
            {products.map((p, idx) => (
              <option key={idx} value={idx}>
                {p.name.toUpperCase()}
              </option>
            ))}
          </Form.Select>

             


          <div
            style={{
              cursor: 'pointer',
              color: styles.colors.text.light,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px'
            }}
            //onClick={() => console.log('🔥 PLUS BUTTON CLICKED!')}
            onClick={handleCreateProduct}
          >
            <FaPlus size={20} style={{ transform: 'scale(0.9)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Right Side: Icons */}
        <div className="d-flex align-items-center gap-2">
          
          <div style={{ cursor: 'pointer' }}
          //onClick={() => console.log('🔥 ITERATION BUTTON CLICKED!')}
          //onMouseDown={() => console.log('🔥 MOUSE DOWN!')}
          onClick={handleAddIteration}
          >
            <FaDrumSteelpan size={20} color={styles.colors.iteration} style={{pointerEvents: 'none'}} />
          </div>
          <div style={{ cursor: 'pointer' }} onClick={handleAddStage}>
            <FaToriiGate size={20} color={styles.colors.stage} style={{pointerEvents: 'none'}} />
          </div>
          <div
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              color: '#ffffff',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
            onClick={handlePlusClick}
          >
            <FaUpload size={20} style={{pointerEvents: 'none'}} />
          </div>
          <div
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              color: '#ffffff',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
            onClick={handleViewChange}
          >
            <FaEye size={20} />
          </div>
          <div
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              color: '#ffffff',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
            onClick={handleShowBOM}
          >
            <FaTable size={20} />
          </div>
        </div>
      </div>

      {/* Render content based on viewMode */}
      {viewMode === 'normal' ? (
        renderFileList(prod)
      ) : (
        <BOMView prod={prod} updateFile={updateFile} />
      )}

      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={hiddenFileInput}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  );
};

function BOMView({ prod, updateFile }) {
  // Retrieve files for the selected stage; if no stage is selected, stageFiles will be an empty array
  const stageFiles = prod.selectedStage ? (prod.filesByStage[prod.selectedStage] || []) : [];
  // Update each file to its latest version if available
  const latestFiles = stageFiles.map(file => {
    if (file.revisions && file.selected_revision_obj) {
      return { ...file, ...file.selected_revision_obj };
    }
    return file;
  });

  // --------------------------
  // DXF Files Processing
  // --------------------------
  // Filter for DXF parent files (non-child files with extension "dxf")
  const dxfParentFiles = latestFiles.filter(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    return !file.isChildFile && ext === "dxf";
  });
  // Group child files by their DXF parent's id
  const parentFileMap = {};
  dxfParentFiles.forEach(parent => {
    parentFileMap[parent.id] = [];
  });
  latestFiles.forEach(file => {
    if (file.isChildFile && parentFileMap.hasOwnProperty(file.parentId)) {
      parentFileMap[file.parentId].push(file);
    }
  });

  // --------------------------
  // Spreadsheet Files Processing
  // --------------------------
  // Filter for spreadsheet files (extensions "xls", "xlsx", or "csv")
  const spreadsheetFiles = latestFiles.filter(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    return ext === "xls" || ext === "xlsx" || ext === "csv";
  });

  // // --------------------------
  // // Parse Spreadsheet Files if Needed
  // // --------------------------
  // // If a spreadsheet file does not have a "contents" property and has a dataUrl,
  // // attempt to parse it using XLSX and update it.
  // useEffect(() => {
  //   spreadsheetFiles.forEach(file => {
  //     if (!file.contents && file.dataUrl) {
  //       try {
  //         // Parse the dataUrl using XLSX (expects type 'dataURL')
  //         const workbook = XLSX.read(file.dataUrl, { type: 'dataURL' });
  //         const sheetName = workbook.SheetNames[0];
  //         const worksheet = workbook.Sheets[sheetName];
  //         // Convert worksheet to an array of arrays (each row)
  //         const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  //         // Optionally, you can transform jsonData to objects with keys (if desired)
  //         // For now, we assume the first row contains headers:
  //         let contents = [];
  //         if (jsonData.length > 0) {
  //           const headers = jsonData[0];
  //           contents = jsonData.slice(1).map((row, idx) => {
  //             // Create an object mapping headers to row values
  //             const rowObj = { id: idx };
  //             headers.forEach((header, j) => {
  //               rowObj[header] = row[j];
  //             });
  //             // Ensure required fields exist (name, label, quantity, price)
  //             return {
  //               id: rowObj.id,
  //               name: rowObj.name || "",
  //               label: rowObj.label || "",
  //               quantity: rowObj.quantity || 1,
  //               price: rowObj.price || "",
  //               ...rowObj
  //             };
  //           });
  //         }
  //         // Call updateFile to update this file object with parsed contents
  //         updateFile(file.id, { contents });
  //       } catch (error) {
  //         console.error("Error parsing spreadsheet file", error);
  //       }
  //     }
  //   });
  // }, [spreadsheetFiles, updateFile]);
  // useEffect(() => {
  //   spreadsheetFiles.forEach(file => {
  //     if (!file.contents && file.dataUrl) {
  //       console.log("Attempting to parse spreadsheet:", file.name);
  //       try {
  //         // Parse the dataUrl using XLSX (expects type 'dataURL')
  //         const workbook = XLSX.read(file.dataUrl, { type: 'dataURL' });
  //         const sheetName = workbook.SheetNames[0];
  //         const worksheet = workbook.Sheets[sheetName];
  //         // Convert worksheet to an array of arrays
  //         const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  //         console.log("Raw parsed data:", jsonData);
  //         let contents = [];
  //         if (jsonData && jsonData.length > 1) {
  //           const headers = jsonData[0];
  //           contents = jsonData.slice(1).map((row, idx) => {
  //             const rowObj = { id: idx };
  //             headers.forEach((header, j) => {
  //               rowObj[header] = row[j];
  //             });
  //             // Ensure required fields exist and map them to the expected keys
  //             return {
  //               id: idx,
  //               name: rowObj.name || "",
  //               label: rowObj.label || "",
  //               quantity: rowObj.quantity || 1,
  //               price: rowObj.price || "",
  //               ...rowObj
  //             };
  //           });
  //         }
  //         console.log("Final parsed contents for", file.name, ":", contents);
  //         // Update the file object with the parsed contents
  //         updateFile(file.id, { contents });
  //       } catch (error) {
  //         console.error("Error parsing spreadsheet file", error);
  //       }
  //     }
  //   });
  // }, [spreadsheetFiles, updateFile]);
  useEffect(() => {
    spreadsheetFiles.forEach(file => {
      if (!file.contents && file.dataUrl) {
        console.log("Attempting to parse spreadsheet:", file.name);
        try {
          // For dataURLs that start with "data:"
          if (file.dataUrl.startsWith('data:')) {
            // Extract the base64 part
            const base64Content = file.dataUrl.split(',')[1];
            if (base64Content) {
              // Convert base64 to binary string
              const binaryString = atob(base64Content);
              // Create array buffer from binary string
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              // Create a workbook from the array buffer
              const workbook = XLSX.read(bytes.buffer, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              
              // Log what we find in the worksheet to debug
              console.log("Worksheet content:", worksheet);
              
              // Convert worksheet to JSON with headers
              const jsonData = XLSX.utils.sheet_to_json(worksheet);
              console.log("Parsed JSON data:", jsonData);
              
              if (jsonData && jsonData.length > 0) {
                // Map the data to the format expected by the component
                const contents = jsonData.map((row, idx) => ({
                  id: idx,
                  name: row.Component || row.Name || row.Item || Object.values(row)[0] || "",
                  label: row.Label || row.Description || "",
                  quantity: row.Quantity || row.Qty || row.Amount || 1,
                  price: row.Price || row.Cost || row.Value || "",
                  ...row // Keep all original fields too
                }));
                
                console.log("Mapped contents:", contents);
                // Update the file with parsed contents
                updateFile(file.id, { contents });
              }
            }
          } else {
            // Handle regular URL fetching if needed
            console.warn("Non-dataURL format detected:", file.name);
          }
        } catch (error) {
          console.error("Error parsing spreadsheet file", file.name, error);
        }
      }
    });
  }, [spreadsheetFiles, updateFile]);

  // --------------------------
  // Field Update Handlers for DXF rows
  // --------------------------
  const handleLabelChange = (fileId, newLabel) => {
    updateFile(fileId, { label: newLabel });
  };

  const handleQuantityChange = (fileId, newQuantity) => {
    const quantity = parseInt(newQuantity, 10) || 1;
    updateFile(fileId, { quantity });
  };

  const handlePriceChange = (fileId, newPrice) => {
    const price = newPrice === '' ? '' : (parseFloat(newPrice) || 0);
    updateFile(fileId, { price });
  };

  // --------------------------
  // Field Update Handler for Spreadsheet Rows
  // --------------------------
  const handleSpreadsheetRowChange = (fileId, rowId, field, value) => {
    updateFile(fileId, { rowId, [field]: value });
  };

  // --------------------------
  // Calculation Functions
  // --------------------------
  // Calculate total for a DXF parent and its children
  const calculateGroupTotal = (parent) => {
    let total = 0;
    const parentQty = parent.quantity || 1;
    const parentPrice = parseFloat(parent.price) || 0;
    total += parentQty * parentPrice;
    (parentFileMap[parent.id] || []).forEach(child => {
      const childQty = child.quantity || 1;
      const childPrice = parseFloat(child.price) || 0;
      total += childQty * childPrice;
    });
    return total.toFixed(2);
  };

  // Calculate total for a single spreadsheet file based on its contents
  const calculateSpreadsheetTotal = (file) => {
    if (Array.isArray(file.contents)) {
      const total = file.contents.reduce((sum, row) => {
        const qty = row.quantity || 1;
        const price = parseFloat(row.price) || 0;
        return sum + qty * price;
      }, 0);
      return total.toFixed(2);
    }
    return "0.00";
  };

  // Calculate the grand total across all DXF and spreadsheet tables
  const calculateGrandTotal = () => {
    let total = 0;
    dxfParentFiles.forEach(parent => {
      const parentTotal = (parent.quantity || 1) * (parseFloat(parent.price) || 0);
      let childTotal = 0;
      (parentFileMap[parent.id] || []).forEach(child => {
        childTotal += (child.quantity || 1) * (parseFloat(child.price) || 0);
      });
      total += parentTotal + childTotal;
    });
    spreadsheetFiles.forEach(file => {
      total += (Array.isArray(file.contents)
        ? file.contents.reduce((sum, row) => {
            const qty = row.quantity || 1;
            const price = parseFloat(row.price) || 0;
            return sum + qty * price;
          }, 0)
        : 0);
    });
    return total.toFixed(2);
  };

  // --------------------------
  // Rendering
  // --------------------------
  return (
    <div className="p-3">
      <h4>
      Bill of Materials: {prod.name.toUpperCase()} - {prod.selectedStage ? prod.selectedStage.toUpperCase() : "No Stage Selected"}
      </h4>
      {!prod.selectedStage ? (
        <p className="text-muted">Select a Stage/Iteration to view BOM.</p>
      ) : (
        <>
          {/* DXF Files: Render each DXF parent and its children as a table */}
          {dxfParentFiles.map(parent => {
            const headerName = parent.name.split('.')[0];
            const children = parentFileMap[parent.id] || [];
            return (
              <div key={parent.id} className="mb-4">
                <h5
                  style={{
                    backgroundColor: "#1F2937",
                    padding: "10px 15px",
                    borderRadius: "4px 4px 0 0",
                    marginBottom: 0,
                    borderBottom: "1px solid #374151"
                  }}
                >
                  {headerName}
                </h5>
                <Table
                  striped
                  bordered
                  hover
                  variant="dark"
                  className="mb-0"
                  style={{
                    borderCollapse: "collapse",
                    borderRadius: "0 0 4px 4px",
                    overflow: "hidden",
                    border: "1px solid #374151"
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#1F2937" }}>
                      <th style={{ width: "40%" }}>Component</th>
                      <th style={{ width: "25%" }}>Label</th>
                      <th style={{ width: "10%" }}>Qty</th>
                      <th style={{ width: "12%" }}>Price (₹)</th>
                      <th style={{ width: "13%" }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Parent row */}
                    <tr key={parent.id}>
                      <td
                        style={{
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          fontWeight: "500"
                        }}
                      >
                        {parent.name}
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Add label"
                          defaultValue={parent.label || ""}
                          onBlur={(e) =>
                            handleLabelChange(parent.id, e.target.value)
                          }
                          style={{
                            backgroundColor: "#1F2937",
                            color: "#F3F4F6",
                            border: "1px solid #374151"
                          }}
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="number"
                          min="1"
                          value={parent.quantity || 1}
                          onChange={(e) =>
                            handleQuantityChange(parent.id, e.target.value)
                          }
                          style={{
                            backgroundColor: "#1F2937",
                            color: "#F3F4F6",
                            border: "1px solid #374151",
                            width: "100%"
                          }}
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="number"
                          min="0"
                          step="0.01"
                          value={parent.price === "" ? "" : (parseFloat(parent.price) || 0)}
                          onChange={(e) =>
                            handlePriceChange(parent.id, e.target.value)
                          }
                          style={{
                            backgroundColor: "#1F2937",
                            color: "#F3F4F6",
                            border: "1px solid #374151",
                            width: "100%"
                          }}
                        />
                      </td>
                      <td style={{ minWidth: "80px", textAlign: "right" }}>
                        {((parent.quantity || 1) * (parseFloat(parent.price) || 0)).toFixed(2)}
                      </td>
                    </tr>
                    {/* Render child rows */}
                    {children.map(child => {
                      const qty = child.quantity || 1;
                      const price = parseFloat(child.price) || 0;
                      const total = (qty * price).toFixed(2);
                      return (
                        <tr key={child.id} style={{ backgroundColor: "rgba(40,45,50,0.8)" }}>
                          <td style={{ whiteSpace: "normal", wordBreak: "break-word", paddingLeft: "25px" }}>
                            <span style={{ opacity: 0.8 }}>↳</span> {child.name}
                          </td>
                          <td>
                            <Form.Control
                              size="sm"
                              type="text"
                              placeholder="Add label"
                              defaultValue={child.label || ""}
                              onBlur={(e) =>
                                handleLabelChange(child.id, e.target.value)
                              }
                              style={{
                                backgroundColor: "#1F2937",
                                color: "#F3F4F6",
                                border: "1px solid #374151"
                              }}
                            />
                          </td>
                          <td>
                            <Form.Control
                              size="sm"
                              type="number"
                              min="1"
                              value={qty}
                              onChange={(e) =>
                                handleQuantityChange(child.id, e.target.value)
                              }
                              style={{
                                backgroundColor: "#1F2937",
                                color: "#F3F4F6",
                                border: "1px solid #374151",
                                width: "100%"
                              }}
                            />
                          </td>
                          <td>
                            <Form.Control
                              size="sm"
                              type="number"
                              min="0"
                              step="0.01"
                              value={child.price === "" ? "" : price}
                              onChange={(e) =>
                                handlePriceChange(child.id, e.target.value)
                              }
                              style={{
                                backgroundColor: "#1F2937",
                                color: "#F3F4F6",
                                border: "1px solid #374151",
                                width: "100%"
                              }}
                            />
                          </td>
                          <td style={{ minWidth: "80px", textAlign: "right" }}>
                            {total}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: "#1F2937" }}>
                      <td colSpan="4" className="text-end"><strong>Total</strong></td>
                      <td style={{ textAlign: "right" }}>
                        <strong>{calculateGroupTotal(parent)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </Table>
              </div>
            );
          })}

          {/* Render each spreadsheet file as its own table using its contents */}
          {spreadsheetFiles.map(file => {
            const tableTotal = calculateSpreadsheetTotal(file);
            return (
              <div key={file.id} className="mb-4">
                <h5
                  style={{
                    backgroundColor: "#1F2937",
                    padding: "10px 15px",
                    borderRadius: "4px 4px 0 0",
                    marginBottom: 0,
                    borderBottom: "1px solid #374151"
                  }}
                >
                  {file.name}
                </h5>
                <Table
                  striped
                  bordered
                  hover
                  variant="dark"
                  className="mb-0"
                  style={{
                    borderCollapse: "collapse",
                    borderRadius: "0 0 4px 4px",
                    overflow: "hidden",
                    border: "1px solid #374151"
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#1F2937" }}>
                      <th style={{ width: "40%" }}>Component</th>
                      <th style={{ width: "25%" }}>Label</th>
                      <th style={{ width: "10%" }}>Qty</th>
                      <th style={{ width: "12%" }}>Price (₹)</th>
                      <th style={{ width: "13%" }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(file.contents) && file.contents.map(row => {
                      const qty = row.quantity || 1;
                      const price = parseFloat(row.price) || 0;
                      const total = (qty * price).toFixed(2);
                      return (
                        <tr key={row.id}>
                          <td style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                            <Form.Control
                              size="sm"
                              type="text"
                              value={row.name}
                              onBlur={(e) =>
                                handleSpreadsheetRowChange(file.id, row.id, "name", e.target.value)
                              }
                              style={{
                                backgroundColor: "#1F2937",
                                color: "#F3F4F6",
                                border: "1px solid #374151"
                              }}
                            />
                          </td>
                          <td>
                            <Form.Control
                              size="sm"
                              type="text"
                              value={row.label || ""}
                              onBlur={(e) =>
                                handleSpreadsheetRowChange(file.id, row.id, "label", e.target.value)
                              }
                              style={{
                                backgroundColor: "#1F2937",
                                color: "#F3F4F6",
                                border: "1px solid #374151"
                              }}
                            />
                          </td>
                          <td>
                            <Form.Control
                              size="sm"
                              type="number"
                              min="1"
                              value={row.quantity || 1}
                              onChange={(e) =>
                                handleSpreadsheetRowChange(file.id, row.id, "quantity", e.target.value)
                              }
                              style={{
                                backgroundColor: "#1F2937",
                                color: "#F3F4F6",
                                border: "1px solid #374151",
                                width: "100%"
                              }}
                            />
                          </td>
                          <td>
                            <Form.Control
                              size="sm"
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.price === "" ? "" : (parseFloat(row.price) || 0)}
                              onChange={(e) =>
                                handleSpreadsheetRowChange(file.id, row.id, "price", e.target.value)
                              }
                              style={{
                                backgroundColor: "#1F2937",
                                color: "#F3F4F6",
                                border: "1px solid #374151",
                                width: "100%"
                              }}
                            />
                          </td>
                          <td style={{ minWidth: "80px", textAlign: "right" }}>
                            {total}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: "#1F2937" }}>
                      <td colSpan="4" className="text-end"><strong>Total</strong></td>
                      <td style={{ textAlign: "right" }}>
                        <strong>{tableTotal}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </Table>
              </div>
            );
          })}

          {/* Grand Total */}
          <div
            className="mt-4 p-3"
            style={{
              backgroundColor: "#1F2937",
              borderRadius: "4px",
              borderLeft: "4px solid #059669"
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Grand Total</h5>
              <h5 className="mb-0">₹ {calculateGrandTotal()}</h5>
            </div>
          </div>
        </>
      )}
    </div>
  );
}



// Keep your existing useEffect for styles
useEffect(() => {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = `
    * {
      max-width: 100% !important;
      overflow-x: hidden !important;
      box-sizing: border-box !important;
      font-family: ${styles.fonts.family} !important;
    }
    
    body, html {
      overflow-x: hidden !important;
      width: 100% !important;
      max-width: 100vw !important;
      background-color: ${styles.colors.dark} !important;
      color: ${styles.colors.text.light} !important;
    }
    
    /* Container styles */
    .container-fluid {
      padding-left: 0 !important;
      padding-right: 0 !important;
      width: 100% !important;
      max-width: 100vw !important;
    }
    
    /* Table styles */
    .table {
      font-size: ${styles.fonts.size.sm} !important;
      cursor: pointer !important;
      margin-bottom: ${styles.spacing.md} !important;
      background-color: ${styles.colors.dark} !important;
      color: ${styles.colors.text.light} !important;
    }
    
    .table th {
      border-bottom: 1px solid ${styles.colors.border} !important;
      padding: ${styles.spacing.sm} ${styles.spacing.md} !important;
      background-color: ${styles.colors.dark} !important;
      border-color: ${styles.colors.border} !important;
    }
    
    .table td {
      padding: ${styles.spacing.sm} ${styles.spacing.md} !important;
      vertical-align: middle !important;
      background-color: ${styles.colors.dark} !important;
      border-color: ${styles.colors.border} !important;
    }
    
    /* Form control styles */
    .form-control, .form-select {
      background-color: ${styles.colors.darkAlt} !important;
      color: ${styles.colors.text.light} !important;
      border: 1px solid ${styles.colors.border} !important;
      font-size: ${styles.fonts.size.sm} !important;
      border-radius: ${styles.borderRadius.sm} !important;
    }
    
    /* Button styles */
    .btn {
      font-size: ${styles.fonts.size.sm} !important;
      padding: ${styles.spacing.xs} ${styles.spacing.md} !important;
      border-radius: ${styles.borderRadius.sm} !important;
    }
    
    /* Badge styles */
    .badge {
      font-size: ${styles.fonts.size.xs} !important;
      font-weight: ${styles.fonts.weight.normal} !important;
      padding: ${styles.spacing.xs} ${styles.spacing.sm} !important;
      vertical-align: middle !important;
    }
    
    /* Other elements */
    iframe {
      width: 100% !important;
      max-width: 100% !important;
    }
    
    .selected-file-row {
      background-color: ${styles.colors.primary}26 !important; /* Adding 26 hex = 15% opacity */
    }
    
    /* Context menu styling */
    .context-menu-item:hover {
      background-color: ${styles.colors.darkAlt} !important;
    }
    
    /* Toast styling */
    .toast {
      background-color: ${styles.colors.dark} !important;
      border: 1px solid ${styles.colors.border} !important;
      border-radius: ${styles.borderRadius.sm} !important;
    }
    
    /* Modal styling */
    .modal-content {
      background-color: ${styles.colors.dark} !important;
      border: 1px solid ${styles.colors.border} !important;
    }
    
    /* Bootstrap class overrides */
    .bg-dark {
      background-color: ${styles.colors.dark} !important;
    }
    
    .bg-warning {
      background-color: ${styles.colors.warning} !important;
    }
    
    .bg-success {
      background-color: ${styles.colors.success} !important;
    }
    
    .bg-danger {
      background-color: ${styles.colors.danger} !important;
    }
    
    .text-light {
      color: ${styles.colors.text.light} !important;
    }
    
    .text-muted {
      color: ${styles.colors.text.muted} !important;
    }
    
    .btn-primary {
      background-color: ${styles.colors.primary} !important;
      border-color: ${styles.colors.primary} !important;
    }
    
    .btn-secondary {
      background-color: ${styles.colors.darkAlt} !important;
      border-color: ${styles.colors.border} !important;
    }
    
    .btn-success {
      background-color: ${styles.colors.success} !important;
      border-color: ${styles.colors.success} !important;
    }
    
    .btn-warning {
      background-color: ${styles.colors.warning} !important;
      border-color: ${styles.colors.warning} !important;
    }
    
    .btn-danger {
      background-color: ${styles.colors.danger} !important;
      border-color: ${styles.colors.danger} !important;
    }
    
    /* Table theme overrides */
    .table-dark {
      background-color: ${styles.colors.dark} !important;
      color: ${styles.colors.text.light} !important;
    }
    
    /* Fix for file row selection highlight */
    tr.selected-file-row td {
      background-color: ${styles.colors.primary}26 !important;
    }
    
    /* Remove scroll buttons from ribbon icons */
    select.form-select {
      appearance: none !important;
      -webkit-appearance: none !important;
      -moz-appearance: none !important;
      background-image: none !important;
    }
    
    /* Prevent scroll buttons from appearing on hover */
    select.form-select:hover, 
    select.form-select:focus {
      appearance: none !important;
      -webkit-appearance: none !important;
      -moz-appearance: none !important;
      //background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23aaaaaa' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e") !important;
    }

    /* Custom dropdown arrow that's more subtle */
    .form-select {
     // background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23606060' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e") !important;
      background-position: right 0.5rem center !important;
      background-size: 12px !important;
      background-repeat: no-repeat !important;
    }
    
    /* Make dropdown arrow visible for product selector */
    .form-select.shadow-none {
      //background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23aaaaaa' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e") !important;
      background-position: right 0.5rem center !important;
      background-size: 12px !important;
      background-repeat: no-repeat !important;
      padding-right: 2rem !important;
    }
    
    /* Stronger override for select elements */
    select.form-select, 
    select.form-select:hover, 
    select.form-select:focus, 
    select.form-select:active {
      appearance: none !important;
      -webkit-appearance: none !important;
      -moz-appearance: none !important;
      background-image: none !important;
    }

    /* Target the specific select elements in the table */
    .table td select.form-select {
      appearance: none !important;
      -webkit-appearance: none !important;
      -moz-appearance: none !important;
      background-image: none !important;
      padding-right: 0.5rem !important;
    }

    /* Catch all to ensure no select shows default browser styling */
    select {
      appearance: none !important;
      -webkit-appearance: none !important;
      -moz-appearance: none !important;
      background-image: none !important;
    }

    /* Handle hover state for icons in the ribbon bar */
    .form-select:hover,
    .form-select:active,
    .form-select:focus,
    div.form-select,
    div:hover .form-select,
    select:hover,
    .table tr:hover .form-select,
    .table tr:hover td .form-select {
      appearance: none !important;
      -webkit-appearance: none !important;
      -moz-appearance: none !important;
      background-image: none !important;
    }

    /* Ensure absolutely no dropdown arrows appear */
    // .form-select {
    //   background: none !important;
    // }
  `;
  document.head.appendChild(styleTag);
  
  return () => {
    document.head.removeChild(styleTag);
  };
}, []);

// Update main container return
return (
  <Container
    fluid
    style={{
      height: '100vh',
      overflow: 'hidden',
      maxWidth: '100vw',
      width: '100%',
      padding: 0,
      margin: 0,
      boxSizing: 'border-box'
    }}
    className="bg-dark text-light p-0"
  >
    {/* Center-aligned Toast message at top-center */}
    <ToastContainer position="top-center" className="p-3" style={{ zIndex: 9999 }}>
      <Toast
        bg="dark"
        onClose={() => setToastMsg('')}
        show={!!toastMsg}
        delay={3000}
        autohide
      >
        <Toast.Body
          className="text-light"
          style={{ textAlign: 'center', fontSize: '0.85rem' }}
        >
          {toastMsg}
        </Toast.Body>
      </Toast>
    </ToastContainer>

    <Row className="g-0 m-0" style={{ height: '100%', maxWidth: '100%' }}>
      {/* Left Ribbon => pH at top, stage/iteration icons (icon + badge) below */}
      <Col
        xs="auto"
        style={{
          width: '50px',
          background: styles.colors.dark,
          padding: 0,
          borderRight: `1px solid ${styles.colors.border}`
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '0.6rem'
          }}
        >
          {/* pH logo */}
          <div
            style={{
              cursor: 'pointer',
              fontWeight: '500',
              color: styles.colors.text.light,
              marginBottom: '20px',
              fontSize: '0.9rem'
            }}
            onClick={() => console.log('pH logo clicked')}
          >
            pH
          </div>

{/* Stage/iteration icons with icon+badge (using FaSpinner for I and FaToriiGate for S) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%'
              }}
            >
              {/* Render Stages */}
              {prod.stages &&
                prod.stages.map((stage, idx) => {
                  const isSelected = prod.selectedContainer?.id === stage.id && prod.containerType === 'stage';
                  const bgColor = isSelected ? `${styles.colors.primary}64` : 'transparent';

                  return (
                    <div
                      key={`stage-${stage.id}`}
                      onClick={() => handleContainerClick(stage, 'stage')}
                      onContextMenu={(e) => handleContainerRightClick(e, stage, 'stage')}
                      style={{
                        cursor: 'pointer',
                        width: '32px',
                        height: '32px',
                        position: 'relative',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        fontSize: '0.85rem',
                        background: bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FaToriiGate size={20} color={styles.colors.stage} />
                      <span
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: styles.colors.dark,
                          color: '#fff',
                          borderRadius: '50%',
                          padding: '0 4px',
                          fontSize: '10px',
                          minWidth: '16px',
                          textAlign: 'center'
                        }}
                      >
                        {stage.stage_number}
                      </span>
                    </div>
                  );
                })}

              {/* Render Iterations */}
              {prod.iterations &&
                prod.iterations.map((iteration, idx) => {
                  const isSelected = prod.selectedContainer?.id === iteration.id && prod.containerType === 'iteration';
                  const bgColor = isSelected ? `${styles.colors.primary}64` : 'transparent';

                  return (
                    <div
                      key={`iteration-${iteration.id}`}
                      onClick={() => handleContainerClick(iteration, 'iteration')}
                      onContextMenu={(e) => handleContainerRightClick(e, iteration, 'iteration')}
                      style={{
                        cursor: 'pointer',
                        width: '32px',
                        height: '32px',
                        position: 'relative',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        fontSize: '0.85rem',
                        background: bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FaDrumSteelpan size={20} color={styles.colors.iteration} />
                      <span
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: styles.colors.dark,
                          color: '#fff',
                          borderRadius: '50%',
                          padding: '0 4px',
                          fontSize: '10px',
                          minWidth: '16px',
                          textAlign: 'center'
                        }}
                      >
                        {iteration.iteration_number}
                      </span>
                    </div>
                  );
                })}
            </div>
        </div>
      </Col>

      {/* Main Content Area - UPDATED: Conditionally render based on viewMode */}
      <Col
        className="p-0 m-0"
        style={{
          height: '100%',
          overflow: 'hidden',
          maxWidth: 'calc(100vw - 50px)'
        }}
      >
        {viewMode === 'normal' ? (
          <ResizableColumn
            leftContent={renderFileBrowser()}
            rightContent={renderPreview(selectedFileObj)}
          />
        ) : (
          <div className="p-2" style={{ height: '100%', overflow: 'auto' }}>
            {renderFileBrowser()}
          </div>
        )}
      </Col>
    </Row>

    {/* Hidden file input for uploads */}
    <input
      type="file"
      ref={hiddenFileInput}
      onChange={handleFileChange}
      style={{ display: 'none' }}
    />
  </Container>
);
// Add these functions to your component
// function handleViewChange() {
//   setViewMode(viewMode === 'normal' ? 'bom' : 'normal');
// }

function handleShowBOM() {
  setViewMode('bom');
}

}
