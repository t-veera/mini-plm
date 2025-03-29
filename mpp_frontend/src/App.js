import React, { useState, useRef, useEffect, Suspense } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
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
  FaDrumSteelpan
} from 'react-icons/fa';

// React Three Fiber / Three.js
import { Canvas, useLoader } from '@react-three/fiber';
import { STLLoader } from 'three-stdlib';
import { OrbitControls, GridHelper } from '@react-three/drei';
import * as THREE from 'three';

// For Excel/CSV
import * as XLSX from 'xlsx';

// Code Syntax Highlighting
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Markdown
import ReactMarkdown from 'react-markdown';

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
        fontFamily:
          'system-ui, -apple-system, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'
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
  /* New Code for Markdown*/
//   function MarkdownPreview({ fileUrl }) {
//   const [markdownContent, setMarkdownContent] = useState('');
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     async function fetchMarkdown() {
//       try {
//         console.log("Fetching markdown from URL:", fileUrl);
        
//         // If it's a data URL, extract the content directly
//         if (fileUrl && fileUrl.startsWith('data:')) {
//           try {
//             const base64Content = fileUrl.split(',')[1];
//             const decodedContent = atob(base64Content);
//             setMarkdownContent(decodedContent);
//             return;
//           } catch (dataUrlError) {
//             console.error("Error processing markdown dataUrl:", dataUrlError);
//             // Continue with regular fetch if data URL processing fails
//           }
//         }
        
//         // Regular fetch for server URLs
//         const res = await fetch(fileUrl);
//         if (!res.ok) {
//           throw new Error(`Failed to fetch markdown file: ${res.status} ${res.statusText}`);
//         }
//         const text = await res.text();
//         setMarkdownContent(text);
//       } catch (err) {
//         console.error('Error fetching markdown file:', err);
//         setError(err.message || 'Error loading markdown');
//       }
//     }
    
//     if (fileUrl) {
//       fetchMarkdown();
//     }
//   }, [fileUrl]);

//   if (error) {
//     return (
//       <div style={{ minHeight: '600px', border: '1px solid #888', padding: '1rem' }}>
//         <p className="text-danger">Error loading markdown: {error}</p>
//         <p className="text-muted">Attempted to load from: {fileUrl}</p>
//       </div>
//     );
//   }

//   return (
//     <div style={{ minHeight: '600px', border: '1px solid #888', overflow: 'auto', padding: '1rem' }}>
//       {markdownContent ? (
//         <ReactMarkdown>{markdownContent}</ReactMarkdown>
//       ) : (
//         <p className="text-muted">Loading markdown...</p>
//       )}
//     </div>
//   );
// }
  
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
    /* 1) Load from localStorage on mount (persist products) with data validation */
    const [products, setProducts] = useState(() => {
      try {
        const stored = localStorage.getItem('phasorProducts');
        if (stored) {
          const parsed = JSON.parse(stored);
          
          // Simple validation
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Remove all quantities and dataURLs from existing files to reduce storage size
            const cleanedProducts = parsed.map(product => {
              const updatedProduct = {...product};
              if (updatedProduct.filesByStage) {
                Object.keys(updatedProduct.filesByStage).forEach(stage => {
                  if (Array.isArray(updatedProduct.filesByStage[stage])) {
                    updatedProduct.filesByStage[stage] = updatedProduct.filesByStage[stage].map(file => {
                      const updatedFile = {...file};
                      //delete updatedFile.quantity;
                      
                      // Remove dataURL to save space
                      delete updatedFile.dataUrl;
                      
                      // Also clean revisions if they exist
                      if (updatedFile.revisions && Array.isArray(updatedFile.revisions)) {
                        updatedFile.revisions = updatedFile.revisions.map(rev => {
                          const updatedRev = {...rev};
                          delete updatedRev.quantity;
                          // Remove dataURL from revisions too
                          delete updatedRev.dataUrl;
                          return updatedRev;
                        });
                      }
                      
                      // Clean selected_revision_obj if it exists
                      if (updatedFile.selected_revision_obj) {
                        const updatedRevObj = {...updatedFile.selected_revision_obj};
                        delete updatedRevObj.quantity;
                        // Remove dataURL from selected revision
                        delete updatedRevObj.dataUrl;
                        updatedFile.selected_revision_obj = updatedRevObj;
                      }
                      
                      return updatedFile;
                    });
                  }
                });
              }
              return updatedProduct;
            });
            return cleanedProducts;
          }
        }
      } catch (error) {
        console.error("Error loading from localStorage:", error);
        localStorage.removeItem('phasorProducts'); // Clear corrupted data
      }
      
      // default
      return [
        {
          name: 'Sample Product',
          stageIcons: [],
          selectedStage: null,
          filesByStage: {}
        }
      ];
    });
  
    const [selectedProductIndex, setSelectedProductIndex] = useState(() => {
      const idx = localStorage.getItem('phasorSelectedProductIndex');
      return idx ? parseInt(idx, 10) : 0;
    });
  
    useEffect(() => {
      // Create a deep copy of products without dataURLs to save in localStorage
      const productsForStorage = products.map(product => {
        const productCopy = {...product};
        
        if (productCopy.filesByStage) {
          productCopy.filesByStage = {...productCopy.filesByStage};
          
          Object.keys(productCopy.filesByStage).forEach(stage => {
            if (Array.isArray(productCopy.filesByStage[stage])) {
              productCopy.filesByStage[stage] = productCopy.filesByStage[stage].map(file => {
                const fileCopy = {...file};
                
                // Remove dataURL to save space
                delete fileCopy.dataUrl;
                
                // Clean revisions if they exist
                if (fileCopy.revisions && Array.isArray(fileCopy.revisions)) {
                  fileCopy.revisions = fileCopy.revisions.map(rev => {
                    const revCopy = {...rev};
                    delete revCopy.dataUrl;
                    return revCopy;
                  });
                }
                
                // Clean selected_revision_obj if it exists
                if (fileCopy.selected_revision_obj) {
                  const revObjCopy = {...fileCopy.selected_revision_obj};
                  delete revObjCopy.dataUrl;
                  fileCopy.selected_revision_obj = revObjCopy;
                }
                
                return fileCopy;
              });
            }
          });
        }
        
        return productCopy;
      });
      
      try {
        localStorage.setItem('phasorProducts', JSON.stringify(productsForStorage));
      } catch (error) {
        console.error("Error saving to localStorage:", error);
        // If we still have quota issues, clear localStorage and try again with just the structure
        if (error.name === 'QuotaExceededError' || error.code === 22) {
          localStorage.clear();
          try {
            // Save just the basic structure without file details as a fallback
            const minimalData = products.map(product => ({
              name: product.name,
              stageIcons: product.stageIcons,
              selectedStage: product.selectedStage,
              filesByStage: {} // Empty file data to ensure we don't exceed quota
            }));
            localStorage.setItem('phasorProducts', JSON.stringify(minimalData));
          } catch (fallbackError) {
            console.error("Failed to save even minimal data:", fallbackError);
          }
        }
      }
    }, [products]);
  
    useEffect(() => {
      localStorage.setItem('phasorSelectedProductIndex', selectedProductIndex.toString());
    }, [selectedProductIndex]);
  
    /* Toast + Loading */
    const [toastMsg, setToastMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
  
    /* The currently selected file => preview in the right column */
    const [selectedFileObj, setSelectedFileObj] = useState(null);
  
    /* State for context menu */
    const [contextMenu, setContextMenu] = useState({
      visible: false,
      x: 0,
      y: 0,
      fileObj: null
    });
    
    /* Child file modal state */
    const [showChildFileModal, setShowChildFileModal] = useState(false);
    const [parentFileForChild, setParentFileForChild] = useState(null);
    
    /* Refs for file inputs */
    const hiddenFileInput = useRef(null);
    const revisionFileInput = useRef(null);
    const contextMenuFileInput = useRef(null);
    const childFileInput = useRef(null);
  
    /* Modal states */
    const [showQuantityModal, setShowQuantityModal] = useState(false);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [showChangeDescriptionModal, setShowChangeDescriptionModal] = useState(false);
    const [currentFileForModal, setCurrentFileForModal] = useState(null);
    const [tempChangeDescription, setTempChangeDescription] = useState('');
  
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
  function handleCreateProduct() {
    const prodName = prompt('Enter new product name:');
    if (!prodName) return;
    
    // Create a complete new product with properly initialized properties
    const newProd = {
      name: prodName,
      stageIcons: [],
      selectedStage: null,
      filesByStage: {}
    };
    
    // Create a new array to trigger React update
    const updatedProducts = [...products, newProd];
    setProducts(updatedProducts);
    setSelectedProductIndex(products.length); // auto-select new product
    setSelectedFileObj(null);
  }

  /* SWITCH PRODUCT */
  function handleSelectProduct(e) {
    const index = parseInt(e.target.value, 10);
    setSelectedProductIndex(index);
    setSelectedFileObj(null); // clear preview
  }

  /* ADD STAGE => S1 => Amber (${styles.colors.warning}) */
  // function handleAddStage() {
  //   // Create deep copies to ensure proper React state updates
  //   const updatedProducts = [...products];
  //   const updatedProduct = {...updatedProducts[selectedProductIndex]};
  //   updatedProducts[selectedProductIndex] = updatedProduct;
    
  //   const sCount = (updatedProduct.stageIcons || [])
  //     .filter(icon => icon.type === 'S')
  //     .length;
    
  //   const newLabel = `S${sCount + 1}`;
  //   const color = styles.colors.stage; // Amber
  //   const newIcon = { type: 'S', label: newLabel, color };

  //   // Create new arrays/objects to ensure React detects the changes
  //   updatedProduct.stageIcons = [...(updatedProduct.stageIcons || []), newIcon];
  //   updatedProduct.filesByStage = {...updatedProduct.filesByStage};
  //   updatedProduct.filesByStage[newLabel] = [];
  //   updatedProduct.selectedStage = newLabel; // auto-select
    
  //   setProducts(updatedProducts);
  //   setSelectedFileObj(null);
  // }

  // /* ADD ITERATION => i1 => #4FC3F7 */
  // function handleAddIteration() {
  //   // Create deep copies to ensure proper React state updates
  //   const updatedProducts = [...products];
  //   const updatedProduct = {...updatedProducts[selectedProductIndex]};
  //   updatedProducts[selectedProductIndex] = updatedProduct;
    
  //   const iCount = (updatedProduct.stageIcons || [])
  //     .filter(icon => icon.type === 'I')
  //     .length;
      
  //   const newLabel = `i${iCount + 1}`;
  //   const color = styles.colors.iteration;
  //   const newIcon = { type: 'I', label: newLabel, color };

  //   // Create new arrays/objects to ensure React detects the changes
  //   updatedProduct.stageIcons = [...(updatedProduct.stageIcons || []), newIcon];
  //   updatedProduct.filesByStage = {...updatedProduct.filesByStage};
  //   updatedProduct.filesByStage[newLabel] = [];
  //   updatedProduct.selectedStage = newLabel; // auto-select
    
  //   setProducts(updatedProducts);
  //   setSelectedFileObj(null);
  // }
  // function handleAddStage() {
  //   // Create deep copies to ensure proper React state updates
  //   const updatedProducts = [...products];
  //   const updatedProduct = { ...updatedProducts[selectedProductIndex] };
  //   updatedProducts[selectedProductIndex] = updatedProduct;
  
  //   // Count existing stage icons (type 'S')
  //   const sCount = (updatedProduct.stageIcons || [])
  //     .filter(icon => icon.type === 'S').length;
  //   const newNumber = sCount + 1; // numeric part
  //   const newLabel = `S${newNumber}`; // full label for file mapping, etc.
  //   const color = styles.colors.stage; // e.g., Amber
  //   // Create a new icon object that stores both the full label and numeric value
  //   const newIcon = { type: 'S', label: newLabel, number: newNumber, color };
  
  //   // Update the product with the new stage icon
  //   updatedProduct.stageIcons = [...(updatedProduct.stageIcons || []), newIcon];
  //   updatedProduct.filesByStage = { ...updatedProduct.filesByStage };
  //   updatedProduct.filesByStage[newLabel] = [];
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
  //   const iCount = (updatedProduct.stageIcons || [])
  //     .filter(icon => icon.type === 'I').length;
  //   const newNumber = iCount + 1; // numeric part
  //   const newLabel = `i${newNumber}`; // full label for file mapping, etc.
  //   const color = styles.colors.iteration;
  //   // Create a new icon object that stores both the full label and numeric value
  //   const newIcon = { type: 'I', label: newLabel, number: newNumber, color };
  
  //   // Update the product with the new iteration icon
  //   updatedProduct.stageIcons = [...(updatedProduct.stageIcons || []), newIcon];
  //   updatedProduct.filesByStage = { ...updatedProduct.filesByStage };
  //   updatedProduct.filesByStage[newLabel] = [];
  //   updatedProduct.selectedStage = newLabel; // auto-select the new iteration
  
  //   setProducts(updatedProducts);
  //   setSelectedFileObj(null);
  // }
  

  // /* STAGE ICON LEFT-CLICK => SELECT THAT STAGE */
  // function handleStageIconClick(label) {
  //   const updatedProducts = [...products];
  //   const updatedProduct = {...updatedProducts[selectedProductIndex]};
  //   updatedProducts[selectedProductIndex] = updatedProduct;
    
  //   updatedProduct.selectedStage = label;
    
  //   setProducts(updatedProducts);
  //   setSelectedFileObj(null);
  // }

  // function handleAddStage() {
  //   // Create deep copies to ensure proper React state updates
  //   const updatedProducts = [...products];
  //   const updatedProduct = { ...updatedProducts[selectedProductIndex] };
  //   updatedProducts[selectedProductIndex] = updatedProduct;
  
  //   // Count existing stage icons (type 'S')
  //   const sCount = (updatedProduct.stageIcons || [])
  //     .filter(icon => icon.type === 'S').length;
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
  //   const iCount = (updatedProduct.stageIcons || [])
  //     .filter(icon => icon.type === 'I').length;
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
  
  // /* STAGE ICON LEFT-CLICK => SELECT THAT STAGE */
  // function handleStageIconClick(label) {
  //   const updatedProducts = [...products];
  //   const updatedProduct = { ...updatedProducts[selectedProductIndex] };
  //   updatedProducts[selectedProductIndex] = updatedProduct;
    
  //   updatedProduct.selectedStage = label;
    
  //   setProducts(updatedProducts);
  //   setSelectedFileObj(null);
  // }
  function handleAddStage() {
    // Create deep copies to ensure proper React state updates
    const updatedProducts = [...products];
    const updatedProduct = { ...updatedProducts[selectedProductIndex] };
    updatedProducts[selectedProductIndex] = updatedProduct;
  
    // Count existing stage icons (type 'S')
    const sCount = (updatedProduct.stageIcons || []).filter(icon => icon.type === 'S').length;
    const newNumber = sCount + 1; // numeric part
    const newLabel = `S${newNumber}`; // full label for file mapping, etc.
    const color = styles.colors.stage; // e.g., Amber
  
    // Create a new icon object that stores both the full label and numeric value
    const newIcon = { type: 'S', label: newLabel, number: newNumber, color };
  
    // Update the product with the new stage icon and initialize its file group
    updatedProduct.stageIcons = [...(updatedProduct.stageIcons || []), newIcon];
    updatedProduct.filesByStage = { ...updatedProduct.filesByStage, [newLabel]: [] };
    updatedProduct.selectedStage = newLabel; // auto-select the new stage
  
    setProducts(updatedProducts);
    setSelectedFileObj(null);
  }
  
  function handleAddIteration() {
    // Create deep copies to ensure proper React state updates
    const updatedProducts = [...products];
    const updatedProduct = { ...updatedProducts[selectedProductIndex] };
    updatedProducts[selectedProductIndex] = updatedProduct;
  
    // Count existing iteration icons (type 'I')
    const iCount = (updatedProduct.stageIcons || []).filter(icon => icon.type === 'I').length;
    const newNumber = iCount + 1; // numeric part
    const newLabel = `i${newNumber}`; // full label for file mapping, etc.
    const color = styles.colors.iteration;
  
    // Create a new icon object that stores both the full label and numeric value
    const newIcon = { type: 'I', label: newLabel, number: newNumber, color };
  
    // Update the product with the new iteration icon and initialize its file group
    updatedProduct.stageIcons = [...(updatedProduct.stageIcons || []), newIcon];
    updatedProduct.filesByStage = { ...updatedProduct.filesByStage, [newLabel]: [] };
    updatedProduct.selectedStage = newLabel; // auto-select the new iteration
  
    setProducts(updatedProducts);
    setSelectedFileObj(null);
  }
  
  /* STAGE ICON LEFT-CLICK => SELECT THAT STAGE */
  function handleStageIconClick(label) {
    const updatedProducts = [...products];
    const updatedProduct = { ...updatedProducts[selectedProductIndex] };
    updatedProducts[selectedProductIndex] = updatedProduct;
  
    updatedProduct.selectedStage = label;
  
    setProducts(updatedProducts);
    setSelectedFileObj(null);
  }
  
  
  /* STAGE ICON RIGHT-CLICK => DELETE IF EMPTY */
  function handleStageIconRightClick(e, label) {
    e.preventDefault(); // Prevent default context menu
    
    const updatedProducts = [...products];
    const updatedProduct = { ...updatedProducts[selectedProductIndex] };
    updatedProducts[selectedProductIndex] = updatedProduct;
  
    // Check if this stage/iteration has files
    const fileList = updatedProduct.filesByStage[label] || [];
    if (fileList.length > 0) {
      // has files => show alert
      setToastMsg('Cannot delete a stage/iteration with files!');
      return;
    }
  
    // Confirm deletion
    const confirmDel = window.confirm(`Delete ${label}? It's empty and will be removed.`);
    if (!confirmDel) return;
  
    // Remove the icon from stageIcons
    updatedProduct.stageIcons = updatedProduct.stageIcons.filter(icon => icon.label !== label);
    
    // Remove its file group
    updatedProduct.filesByStage = { ...updatedProduct.filesByStage };
    delete updatedProduct.filesByStage[label];
  
    // If the user is currently selected that stage, reset selectedStage
    if (updatedProduct.selectedStage === label) {
      updatedProduct.selectedStage = null;
    }
  
    setProducts(updatedProducts);
  }
  
  /* STAGE ICON RIGHT-CLICK => DELETE IF EMPTY */
  function handleStageIconRightClick(e, label) {
    e.preventDefault(); // no default context menu
    
    // Create deep copies for React state updates
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;

    // Check if this stage/iteration has files
    const fileList = updatedProduct.filesByStage[label] || [];
    if (fileList.length > 0) {
      // has files => do nothing or show alert
      setToastMsg('Cannot delete a stage/iteration with files!');
      return;
    }

    // If empty => ask user
    const confirmDel = window.confirm(`Delete ${label}? It's empty and will be removed.`);
    if (!confirmDel) return;

    // remove from stageIcons
    updatedProduct.stageIcons = updatedProduct.stageIcons.filter(icon => icon.label !== label);
    
    // remove from filesByStage
    updatedProduct.filesByStage = {...updatedProduct.filesByStage};
    delete updatedProduct.filesByStage[label];

    // If the user is currently selected that stage, reset selectedStage
    if (updatedProduct.selectedStage === label) {
      updatedProduct.selectedStage = null;
    }

    setProducts(updatedProducts);
  }

  /* UPLOAD => check stage is selected, else show toast */
  function handlePlusClick() {
    const prod = products[selectedProductIndex];
    if (!prod.selectedStage) {
      setToastMsg('Please select a Stage/Iteration first!');
      return;
    }
    hiddenFileInput.current.click();
  }

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
  }

  /* Handle move option */
function handleMoveOption() {
  if (contextMenu.fileObj) {
    // Store the file to be moved
    const fileToMove = contextMenu.fileObj;
    hideContextMenu();
    
    // Ask which stage to move to
    const targetStage = prompt('Enter stage to move file to (e.g., S1, i2):');
    if (!targetStage) return;
    
    // Check if target stage exists
    const prod = products[selectedProductIndex];
    if (!prod.filesByStage.hasOwnProperty(targetStage)) {
      setToastMsg(`Stage ${targetStage} does not exist!`);
      return;
    }
    
    // Create proper deep copies
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    const currentStage = updatedProduct.selectedStage;
    updatedProduct.filesByStage = {...updatedProduct.filesByStage};
    
    // Copy array references
    updatedProduct.filesByStage[currentStage] = [...updatedProduct.filesByStage[currentStage]];
    if (!updatedProduct.filesByStage[targetStage]) {
      updatedProduct.filesByStage[targetStage] = [];
    } else {
      updatedProduct.filesByStage[targetStage] = [...updatedProduct.filesByStage[targetStage]];
    }
    
    // Find file and its child files (if any)
    const filesToMove = [];
    
    // If this is a parent file, also move its children
    if (!fileToMove.isChildFile) {
      // Get the file index
      const fileIndex = updatedProduct.filesByStage[currentStage].findIndex(
        f => f.id === fileToMove.id
      );
      
      if (fileIndex === -1) {
        setToastMsg('File not found.');
        return;
      }
      
      // Copy the file
      const fileCopy = {...updatedProduct.filesByStage[currentStage][fileIndex]};
      filesToMove.push(fileCopy);
      
      // Find any child files
      const childFiles = updatedProduct.filesByStage[currentStage].filter(
        f => f.parentId === fileToMove.id
      );
      
      // Copy the child files
      filesToMove.push(...childFiles.map(f => ({...f})));
      
      // Remove the files from current stage (in reverse to not mess up indices)
      const fileIdsToRemove = [fileToMove.id, ...childFiles.map(f => f.id)];
      updatedProduct.filesByStage[currentStage] = updatedProduct.filesByStage[currentStage].filter(
        f => !fileIdsToRemove.includes(f.id)
      );
    } else {
      // For child files, just move the single file
      const fileIndex = updatedProduct.filesByStage[currentStage].findIndex(
        f => f.id === fileToMove.id
      );
      
      if (fileIndex === -1) {
        setToastMsg('File not found.');
        return;
      }
      
      // Copy the file
      const fileCopy = {...updatedProduct.filesByStage[currentStage][fileIndex]};
      filesToMove.push(fileCopy);
      
      // Remove from current stage
      updatedProduct.filesByStage[currentStage] = updatedProduct.filesByStage[currentStage].filter(
        f => f.id !== fileToMove.id
      );
      
      // Also update parent's childFiles array if necessary
      const parentFile = updatedProduct.filesByStage[currentStage].find(
        f => f.id === fileToMove.parentId
      );
      
      if (parentFile) {
        const updatedParentFile = {...parentFile};
        updatedParentFile.childFiles = updatedParentFile.childFiles.filter(
          id => id !== fileToMove.id
        );
        
        // Replace parent file in the stage
        const parentIndex = updatedProduct.filesByStage[currentStage].findIndex(
          f => f.id === fileToMove.parentId
        );
        
        if (parentIndex !== -1) {
          updatedProduct.filesByStage[currentStage][parentIndex] = updatedParentFile;
        }
      }
    }
    
    // Add files to target stage
    updatedProduct.filesByStage[targetStage].push(...filesToMove);
    
    // Update state
    setProducts(updatedProducts);
    
    // Clear selected file if it was moved
    if (selectedFileObj && selectedFileObj.id === fileToMove.id) {
      setSelectedFileObj(null);
    }
    
    setToastMsg(`File moved to ${targetStage}`);
  }
  hideContextMenu();
}

/* Handle remove option */
function handleRemoveOption() {
  if (contextMenu.fileObj) {
    // Confirm deletion
    const confirmMessage = contextMenu.fileObj.isChildFile
      ? `Remove this child file?`
      : `Remove this file and all its child files?`;
    
    if (!window.confirm(confirmMessage)) {
      hideContextMenu();
      return;
    }
    
    // Create proper deep copies
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    const stage = updatedProduct.selectedStage;
    updatedProduct.filesByStage = {...updatedProduct.filesByStage};
    updatedProduct.filesByStage[stage] = [...updatedProduct.filesByStage[stage]];
    
    // If this is a parent file, remove it and its child files
    if (!contextMenu.fileObj.isChildFile) {
      // Get child file IDs
      const childFileIds = updatedProduct.filesByStage[stage]
        .filter(f => f.parentId === contextMenu.fileObj.id)
        .map(f => f.id);
      
      // Filter out parent and child files
      updatedProduct.filesByStage[stage] = updatedProduct.filesByStage[stage].filter(
        f => f.id !== contextMenu.fileObj.id && !childFileIds.includes(f.id)
      );
      
      setToastMsg(`File and ${childFileIds.length} child files removed`);
    } else {
      // For a child file, just remove it
      updatedProduct.filesByStage[stage] = updatedProduct.filesByStage[stage].filter(
        f => f.id !== contextMenu.fileObj.id
      );
      
      // Also update parent's childFiles array
      const parentFile = updatedProduct.filesByStage[stage].find(
        f => f.id === contextMenu.fileObj.parentId
      );
      
      if (parentFile) {
        const updatedParentFile = {...parentFile};
        updatedParentFile.childFiles = updatedParentFile.childFiles.filter(
          id => id !== contextMenu.fileObj.id
        );
        
        // Replace parent file in the stage
        const parentIndex = updatedProduct.filesByStage[stage].findIndex(
          f => f.id === contextMenu.fileObj.parentId
        );
        
        if (parentIndex !== -1) {
          updatedProduct.filesByStage[stage][parentIndex] = updatedParentFile;
        }
      }
      
      setToastMsg(`Child file removed`);
    }
    
    // Update state
    setProducts(updatedProducts);
    
    // Clear selected file if it was removed
    if (selectedFileObj && selectedFileObj.id === contextMenu.fileObj.id) {
      setSelectedFileObj(null);
    }
  }
  hideContextMenu();
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
  function handleStatusChange(fileObj, newStatus) {
    // Create proper deep copies
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    const stage = updatedProduct.selectedStage;
    updatedProduct.filesByStage = {...updatedProduct.filesByStage};
    updatedProduct.filesByStage[stage] = [...updatedProduct.filesByStage[stage]];
    
    // Find the file
    const fileIndex = updatedProduct.filesByStage[stage].findIndex(f => f.id === fileObj.id);
    if (fileIndex === -1) return;
    
    // Update the file with new status
    const updatedFile = {...updatedProduct.filesByStage[stage][fileIndex]};
    updatedFile.status = newStatus;
    updatedProduct.filesByStage[stage][fileIndex] = updatedFile;
    
    // If this is a parent file, update its selected_revision_obj as well
    if (updatedFile.revisions && updatedFile.selected_revision_obj) {
      updatedFile.revisions = [...updatedFile.revisions]; // Create a new array
      const revIndex = updatedFile.revisions.findIndex(
        rev => rev.rev_number === updatedFile.current_revision
      );
      if (revIndex !== -1) {
        updatedFile.revisions[revIndex] = {
          ...updatedFile.revisions[revIndex],
          status: newStatus
        };
        updatedFile.selected_revision_obj = {
          ...updatedFile.selected_revision_obj,
          status: newStatus
        };
      }
    }
    
    // Update state
    setProducts(updatedProducts);
    
    // If this is the selected file, update it
    if (selectedFileObj && selectedFileObj.id === fileObj.id) {
      setSelectedFileObj(updatedFile);
    }
    
    setToastMsg(`Status updated to ${newStatus}`);
  }

  /* Handle adding child file */
  function handleAddChildClick(e, fileObj) {
    e.stopPropagation(); // Don't select the parent file
    e.preventDefault(); // Prevent any default behavior
    
    // Only parent files can have children (not child files themselves)
    if (fileObj.parentId) {
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
      // Clear the input field to make sure it works next time
      e.target.value = '';
      return;
    }

    const prod = products[selectedProductIndex];
    if (!prod.selectedStage) {
      setToastMsg('No stage selected yet.');
      e.target.value = '';
      return;
    }

    setIsLoading(true);
    setToastMsg('');

    try {
      // Create a dataURL for preview
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Create proper deep copies to ensure state updates correctly
      const updatedProducts = [...products];
      const updatedProduct = {...updatedProducts[selectedProductIndex]};
      updatedProducts[selectedProductIndex] = updatedProduct;
      
      const stage = updatedProduct.selectedStage;
      
      // Ensure filesByStage exists and create a new object reference
      updatedProduct.filesByStage = {...updatedProduct.filesByStage};
      
      // Ensure the stage array exists and create a new array reference
      if (!updatedProduct.filesByStage[stage]) {
        updatedProduct.filesByStage[stage] = [];
      } else {
        updatedProduct.filesByStage[stage] = [...updatedProduct.filesByStage[stage]];
      }

      // Find the parent file
      const parentFileIndex = updatedProduct.filesByStage[stage].findIndex(
        f => f.id === parentFileForChild.id
      );

      if (parentFileIndex === -1) {
        setToastMsg('Parent file not found');
        setIsLoading(false);
        e.target.value = '';
        return;
      }

      // Create the child file object
      const childFileObj = {
        id: Date.now(), // Add unique ID for React keys
        name: file.name,
        upload_date: new Date().toISOString(),
        size: file.size,
        type: file.type,
        dataUrl: dataUrl, // Store the data URL for preview
        parentId: parentFileForChild.id, // Link to parent
        parentRevision: parentFileForChild.current_revision || 1, // Store which revision of parent this belongs to
        isChildFile: true,
        status: 'In-Work', // Default status
        price: '', // Empty price by default
        current_revision: 1, // Initialize current revision
        changeDescription: '', // Initialize change description
        revisions: [] // Initialize revisions array
      };
      
      // Initialize the revisions array with the first revision
      childFileObj.revisions = [{
        ...childFileObj,
        rev_number: 1
      }];
      
      // Set selected_revision_obj to first revision
      childFileObj.selected_revision_obj = childFileObj.revisions[0];
      
      // Add child file to the stage
      updatedProduct.filesByStage[stage].push(childFileObj);

      // Update parent file to track this child
      const updatedParentFile = {...updatedProduct.filesByStage[stage][parentFileIndex]};
      
      // Ensure childFiles array exists
      if (!updatedParentFile.childFiles) {
        updatedParentFile.childFiles = [];
      } else {
        updatedParentFile.childFiles = [...updatedParentFile.childFiles];
      }
      
      // Add child file reference to parent
      updatedParentFile.childFiles.push(childFileObj.id);
      
      // Update parent file in the stage
      updatedProduct.filesByStage[stage][parentFileIndex] = updatedParentFile;

      // Update state with completely new references
      setProducts(updatedProducts);
      
      // Select this file for preview
      setSelectedFileObj(childFileObj);
      
      // Show change description modal for the child file
      setTimeout(() => {
        setCurrentFileForModal(childFileObj);
        setTempChangeDescription('');
        setShowChangeDescriptionModal(true);
        console.log("Opening change description modal for new child file");
      }, 100);
      
      setToastMsg(`Child file "${file.name}" added to "${parentFileForChild.name}"`);
      
      // If API is available, also upload to server
      try {
        const formData = new FormData();
        formData.append('uploaded_file', file);
        formData.append('parent_id', parentFileForChild.id);
        formData.append('parent_revision', parentFileForChild.current_revision || 1);
        
        const response = await axios.post(
          'http://127.0.0.1:8000/api/files/child/',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        
        if (response.status === 201) {
          console.log('Child file uploaded to server successfully');
        }
      } catch (apiError) {
        console.warn('API upload failed, but file preview will still work:', apiError);
        // We continue anyway since we have the dataURL for preview
      }
    } catch (err) {
      console.error('Error uploading child file:', err);
      setToastMsg('Error uploading child file.');
    } finally {
      setIsLoading(false);
      // Reset the file input and parent file
      e.target.value = '';
      setParentFileForChild(null);
    }
  }

  /* Handle child file revision change */
  function handleChildRevisionChange(childFileObj, revisionNumber) {
    // Find the revision object
    const revision = childFileObj.revisions.find(rev => rev.rev_number === revisionNumber);
    if (!revision) return;
    
    // Create proper deep copies
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    // Get the stage and make a copy of its files array
    const stage = updatedProduct.selectedStage;
    updatedProduct.filesByStage = {...updatedProduct.filesByStage};
    updatedProduct.filesByStage[stage] = [...updatedProduct.filesByStage[stage]];
    
    // Find the child file
    const childFileIndex = updatedProduct.filesByStage[stage].findIndex(f => f.id === childFileObj.id);
    if (childFileIndex === -1) return;
    
    // Make a copy of the child file
    const updatedChildFile = {...updatedProduct.filesByStage[stage][childFileIndex]};
    updatedProduct.filesByStage[stage][childFileIndex] = updatedChildFile;
    
    // Set the current revision
    updatedChildFile.current_revision = revisionNumber;
    updatedChildFile.selected_revision_obj = revision;
    
    // Update state
    setProducts(updatedProducts);
    
    // If this is the selected file, update it
    if (selectedFileObj && selectedFileObj.id === childFileObj.id) {
      setSelectedFileObj(updatedChildFile);
    }
  }
  /* FILE SELECT (UPLOAD) - Fixed version that properly handles all file types */
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) {
      e.target.value = '';
      return;
    }

    const prod = products[selectedProductIndex];
    if (!prod.selectedStage) {
      setToastMsg('No stage selected yet.');
      e.target.value = '';
      return;
    }

    setIsLoading(true);
    setToastMsg('');

    try {
      // Create a dataURL for preview
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          reject(error);
        };
        reader.readAsDataURL(file);
      });

      // Create proper deep copies to ensure state updates correctly
      const updatedProducts = [...products];
      const updatedProduct = {...updatedProducts[selectedProductIndex]};
      updatedProducts[selectedProductIndex] = updatedProduct;
      
      const stage = updatedProduct.selectedStage;
      
      // Ensure filesByStage exists and create a new object reference
      updatedProduct.filesByStage = {...updatedProduct.filesByStage};
      
      // Ensure the stage array exists and create a new array reference
      if (!updatedProduct.filesByStage[stage]) {
        updatedProduct.filesByStage[stage] = [];
      } else {
        updatedProduct.filesByStage[stage] = [...updatedProduct.filesByStage[stage]];
      }

      // Check if a file with the same name already exists
      const existingFileIndex = updatedProduct.filesByStage[stage].findIndex(
        f => f.name === file.name && !f.isChildFile
      );

      // Create the new file object
      const newFileObj = {
        id: Date.now(), // Add unique ID for React keys
        name: file.name,
        upload_date: new Date().toISOString(),
        size: file.size,
        type: file.type,
        dataUrl: dataUrl, // Store the data URL for preview
        childFiles: [], // Initialize empty array to track child files
        status: 'In-Work', // Default status
        price: '', // Empty price by default
        quantity: 1, 
        current_revision: 1 // Initialize with revision 1
      };

      let fileToSelect; // This will be the file we select for preview

      if (existingFileIndex !== -1) {
        // A file with the same name exists - handle as a revision
        const existingFile = {...updatedProduct.filesByStage[stage][existingFileIndex]};
        
        // Initialize revisions array if it doesn't exist
        if (!existingFile.revisions) {
          existingFile.revisions = [];
          // First revision is the current file
          existingFile.revisions.push({
            id: existingFile.id,
            name: existingFile.name,
            upload_date: existingFile.upload_date,
            size: existingFile.size,
            type: existingFile.type,
            dataUrl: existingFile.dataUrl,
            rev_number: 1,
            childFiles: existingFile.childFiles || [], // Store child files in revision
            status: existingFile.status || 'In-Work',
            price: existingFile.price || ''
          });
        }
        
        // Add new revision
        const newRevision = {
          ...newFileObj,
          rev_number: existingFile.revisions.length + 1,
          childFiles: [], // Initialize empty child files array for new revision
          status: 'In-Work', // Reset status for new revision
          price: existingFile.price || '' // Inherit price
        };
        
        existingFile.revisions.push(newRevision);
        
        // Update current file to new revision (always show latest revision)
        existingFile.dataUrl = newFileObj.dataUrl;
        existingFile.upload_date = newFileObj.upload_date;
        existingFile.size = newFileObj.size;
        existingFile.current_revision = newRevision.rev_number; // Set to latest revision number
        existingFile.childFiles = newRevision.childFiles; // Reset child files for the new revision
        existingFile.status = 'In-Work'; // Reset status for new revision
        
        // Important: Set the selected_revision_obj to the new revision
        existingFile.selected_revision_obj = newRevision;
        
        // Replace file in array
        updatedProduct.filesByStage[stage][existingFileIndex] = existingFile;
        
        fileToSelect = existingFile;
        
        setToastMsg(`New revision (Rev ${newRevision.rev_number}) created!`);
      } else {
        // New file - add to list
        newFileObj.current_revision = 1;
        
        // Initialize revisions array with the first revision
        newFileObj.revisions = [{
          ...newFileObj,
          rev_number: 1
        }];
        
        // Set selected_revision_obj to first revision
        newFileObj.selected_revision_obj = newFileObj.revisions[0];
        
        updatedProduct.filesByStage[stage].push(newFileObj);
        
        fileToSelect = newFileObj;
        
        setToastMsg('File uploaded successfully!');
      }
      
      // Update state with completely new references
      setProducts(updatedProducts);
      
      // Select this file for preview after state update
      setSelectedFileObj(fileToSelect);
      
      // Show change description modal with a slight delay to ensure state updates
      setTimeout(() => {
        setCurrentFileForModal(fileToSelect);
        setTempChangeDescription('');
        setShowChangeDescriptionModal(true);
        console.log("Opening change description modal for new file upload");
      }, 100);
      
      // If API is available, also upload to server
      try {
        const formData = new FormData();
        formData.append('uploaded_file', file);
        
        const response = await axios.post(
          'http://127.0.0.1:8000/api/files/',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        
        if (response.status === 201) {
          console.log('File uploaded to server successfully');
        }
      } catch (apiError) {
        console.warn('API upload failed, but file preview will still work:', apiError);
        // We continue anyway since we have the dataURL for preview
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setToastMsg('Error uploading file: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
      // Reset the file input
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
    if (!prod.selectedStage) {
      setToastMsg('No stage selected yet.');
      e.target.value = '';
      return;
    }

    setIsLoading(true);
    setToastMsg('');

    try {
      // Create a dataURL for preview
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          reject(error);
        };
        reader.readAsDataURL(file);
      });

      // Create proper deep copies to ensure state updates correctly
      const updatedProducts = [...products];
      const updatedProduct = {...updatedProducts[selectedProductIndex]};
      updatedProducts[selectedProductIndex] = updatedProduct;
      
      const stage = updatedProduct.selectedStage;
      
      // Ensure filesByStage exists and create a new object reference
      updatedProduct.filesByStage = {...updatedProduct.filesByStage};
      
      // Ensure the stage array exists and create a new array reference
      if (!updatedProduct.filesByStage[stage]) {
        updatedProduct.filesByStage[stage] = [];
      } else {
        updatedProduct.filesByStage[stage] = [...updatedProduct.filesByStage[stage]];
      }

      // Find the existing file
      const existingFileIndex = updatedProduct.filesByStage[stage].findIndex(
        f => f.id === currentFileForModal.id
      );

      if (existingFileIndex === -1) {
        setToastMsg('File not found in current stage');
        setIsLoading(false);
        e.target.value = '';
        return;
      }

      // Get the existing file
      const existingFile = {...updatedProduct.filesByStage[stage][existingFileIndex]};
      
      // Check if it's a child file or parent file
      if (existingFile.isChildFile) {
        // Handle child file revision
        
        // Initialize revisions array if it doesn't exist
        if (!existingFile.revisions) {
          existingFile.revisions = [];
          // First revision is the current file
          existingFile.revisions.push({
            id: existingFile.id,
            name: existingFile.name,
            upload_date: existingFile.upload_date,
            size: existingFile.size,
            type: existingFile.type,
            dataUrl: existingFile.dataUrl,
            rev_number: 1,
            status: existingFile.status || 'In-Work',
            price: existingFile.price || '',
            parentId: existingFile.parentId,
            parentRevision: existingFile.parentRevision,
            isChildFile: true
          });
        }
        
        // Create new revision object
        const newRevision = {
          id: Date.now(),
          name: existingFile.name,
          upload_date: new Date().toISOString(),
          size: file.size,
          type: file.type,
          dataUrl: dataUrl,
          rev_number: existingFile.revisions.length + 1,
          status: 'In-Work', // Reset status for new revision
          price: existingFile.price || '', // Inherit price
          parentId: existingFile.parentId,
          parentRevision: existingFile.parentRevision,
          isChildFile: true,
          changeDescription: '' // Initialize empty change description
        };
        
        // Add to revisions array
        existingFile.revisions.push(newRevision);
        
        // Update current file
        existingFile.dataUrl = dataUrl;
        existingFile.upload_date = new Date().toISOString();
        existingFile.size = file.size;
        existingFile.current_revision = newRevision.rev_number;
        existingFile.selected_revision_obj = newRevision;
        existingFile.status = 'In-Work'; // Reset status for new revision
        
        // Update file in stage
        updatedProduct.filesByStage[stage][existingFileIndex] = existingFile;
        
        // Select updated file for preview
        setSelectedFileObj(existingFile);
        
        // Show change description modal with a slight delay to ensure state updates
        setTimeout(() => {
          setCurrentFileForModal(existingFile);
          setTempChangeDescription('');
          setShowChangeDescriptionModal(true);
          console.log("Opening change description modal for child file revision");
        }, 100);
        
        setToastMsg(`New revision (Rev ${newRevision.rev_number}) created for child file ${existingFile.name}!`);
      } else {
        // Handle parent file revision
        
        // Initialize revisions array if it doesn't exist
        if (!existingFile.revisions) {
          existingFile.revisions = [];
          // First revision is the current file
          existingFile.revisions.push({
            id: existingFile.id,
            name: existingFile.name,
            upload_date: existingFile.upload_date,
            size: existingFile.size,
            type: existingFile.type,
            dataUrl: existingFile.dataUrl,
            rev_number: 1,
            childFiles: existingFile.childFiles || [],
            status: existingFile.status || 'In-Work',
            price: existingFile.price || ''
          });
        }
        
        // Create new file object but use the original filename
        const newFileObj = {
          id: Date.now(),
          name: existingFile.name, // Keep original name
          upload_date: new Date().toISOString(),
          size: file.size,
          type: file.type,
          dataUrl: dataUrl,
          childFiles: [], // New empty child files array for new revision
          status: 'In-Work', // Reset status for new revision
          price: existingFile.price || '' // Inherit price
        };
        
        // Add new revision
        const newRevision = {
          ...newFileObj,
          rev_number: existingFile.revisions.length + 1
        };
        
        existingFile.revisions.push(newRevision);
        
        // Update current file to new revision (always show latest revision)
        existingFile.dataUrl = newFileObj.dataUrl;
        existingFile.upload_date = newFileObj.upload_date;
        existingFile.size = newFileObj.size;
        existingFile.current_revision = newRevision.rev_number; // Set to latest revision number
        existingFile.childFiles = []; // Reset child files for the new revision
        existingFile.status = 'In-Work'; // Reset status for new revision
        
        // Important: Set the selected_revision_obj to the new revision
        existingFile.selected_revision_obj = newRevision;
        
        // Replace file in array
        updatedProduct.filesByStage[stage][existingFileIndex] = existingFile;
        
        // Select this file for preview
        setSelectedFileObj(existingFile);
        
        // Show change description modal with a slight delay to ensure state updates
        setTimeout(() => {
          setCurrentFileForModal(existingFile);
          setTempChangeDescription('');
          setShowChangeDescriptionModal(true);
          console.log("Opening change description modal for parent file revision");
        }, 100);
        
        setToastMsg(`New revision (Rev ${newRevision.rev_number}) created for ${existingFile.name}!`);
      }
      
      // Update state with completely new references
      setProducts(updatedProducts);
      
      // If API is available, also upload to server
      try {
        const formData = new FormData();
        formData.append('uploaded_file', file);
        formData.append('original_name', currentFileForModal.name); // Pass original name
        formData.append('is_child_file', currentFileForModal.isChildFile ? 'true' : 'false');
        if (currentFileForModal.isChildFile) {
          formData.append('parent_id', currentFileForModal.parentId);
          formData.append('parent_revision', currentFileForModal.parentRevision);
        }
        
        const response = await axios.post(
          'http://127.0.0.1:8000/api/files/revision/',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        
        if (response.status === 201) {
          console.log('Revision uploaded to server successfully');
        }
      } catch (apiError) {
        console.warn('API upload failed, but file preview will still work:', apiError);
        // We continue anyway since we have the dataURL for preview
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setToastMsg('Error uploading revision: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
      // Reset the file input and current file
      e.target.value = '';
      setCurrentFileForModal(null);
    }
  }
  /* Handle quantity update */
  function handleQuantityUpdate(quantity) {
    if (!currentFileForModal) return;
    
    // Create proper deep copies
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    const stage = updatedProduct.selectedStage;
    updatedProduct.filesByStage = {...updatedProduct.filesByStage};
    updatedProduct.filesByStage[stage] = [...updatedProduct.filesByStage[stage]];
    
    // Find the file
    const fileIndex = updatedProduct.filesByStage[stage].findIndex(f => f.id === currentFileForModal.id);
    if (fileIndex === -1) return;
    
    // Update the file with quantity
    const updatedFile = {...updatedProduct.filesByStage[stage][fileIndex]};
    updatedFile.quantity = quantity;
    
    // Update the current revision's quantity as well if it exists
    if (updatedFile.revisions && updatedFile.current_revision) {
      updatedFile.revisions = [...updatedFile.revisions]; // Create new array
      const revIndex = updatedFile.revisions.findIndex(
        rev => rev.rev_number === updatedFile.current_revision
      );
      if (revIndex !== -1) {
        updatedFile.revisions[revIndex] = {
          ...updatedFile.revisions[revIndex],
          quantity: quantity
        };
      }
    }
    
    // Update selected_revision_obj if it exists
    if (updatedFile.selected_revision_obj) {
      updatedFile.selected_revision_obj = {
        ...updatedFile.selected_revision_obj,
        quantity: quantity
      };
    }
    
    updatedProduct.filesByStage[stage][fileIndex] = updatedFile;
    
    // Update state
    setProducts(updatedProducts);
    
    // If this is the selected file, update it
    if (selectedFileObj && selectedFileObj.id === currentFileForModal.id) {
      setSelectedFileObj(updatedFile);
    }
    
    setToastMsg(`Quantity updated for ${updatedFile.name}`);
    setShowQuantityModal(false);
    setCurrentFileForModal(null);
  }

  /* Handle change description update */
  function handleChangeDescriptionUpdate(description) {
    if (!currentFileForModal) {
      console.error("No file selected for change description update");
      setShowChangeDescriptionModal(false);
      return;
    }
    
    // Create proper deep copies
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    const stage = updatedProduct.selectedStage;
    updatedProduct.filesByStage = {...updatedProduct.filesByStage};
    updatedProduct.filesByStage[stage] = [...updatedProduct.filesByStage[stage]];
    
    // Find the file
    const fileIndex = updatedProduct.filesByStage[stage].findIndex(f => f.id === currentFileForModal.id);
    if (fileIndex === -1) {
      console.error("File not found in current stage:", currentFileForModal.id);
      setShowChangeDescriptionModal(false);
      setCurrentFileForModal(null);
      return;
    }
    
    // Update the file with change description
    const updatedFile = {...updatedProduct.filesByStage[stage][fileIndex]};
    updatedFile.changeDescription = description;
    
    // Update the current revision's change description as well if it exists
    if (updatedFile.revisions && updatedFile.current_revision) {
      updatedFile.revisions = [...updatedFile.revisions]; // Create new array
      const revIndex = updatedFile.revisions.findIndex(
        rev => rev.rev_number === updatedFile.current_revision
      );
      if (revIndex !== -1) {
        updatedFile.revisions[revIndex] = {
          ...updatedFile.revisions[revIndex],
          changeDescription: description
        };
      }
    }
    
    // Update selected_revision_obj if it exists
    if (updatedFile.selected_revision_obj) {
      updatedFile.selected_revision_obj = {
        ...updatedFile.selected_revision_obj,
        changeDescription: description
      };
    }
    
    updatedProduct.filesByStage[stage][fileIndex] = updatedFile;
    
    // Update state
    setProducts(updatedProducts);
    
    // If this is the selected file, update it
    if (selectedFileObj && selectedFileObj.id === currentFileForModal.id) {
      setSelectedFileObj(updatedFile);
    }
    
    setToastMsg(`Change description updated for ${updatedFile.name}`);
    setShowChangeDescriptionModal(false);
    setCurrentFileForModal(null);
  }

  /* Handle price update */
  function handlePriceUpdate(price) {
    if (!currentFileForModal) return;
    
    // Create proper deep copies
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    const stage = updatedProduct.selectedStage;
    updatedProduct.filesByStage = {...updatedProduct.filesByStage};
    updatedProduct.filesByStage[stage] = [...updatedProduct.filesByStage[stage]];
    
    // Find the file
    const fileIndex = updatedProduct.filesByStage[stage].findIndex(f => f.id === currentFileForModal.id);
    if (fileIndex === -1) return;
    
    // Update the file with price
    const updatedFile = {...updatedProduct.filesByStage[stage][fileIndex]};
    updatedFile.price = price;
    
    // Update the current revision's price as well if it exists
    if (updatedFile.revisions && updatedFile.current_revision) {
      updatedFile.revisions = [...updatedFile.revisions]; // Create new array
      const revIndex = updatedFile.revisions.findIndex(
        rev => rev.rev_number === updatedFile.current_revision
      );
      if (revIndex !== -1) {
        updatedFile.revisions[revIndex] = {
          ...updatedFile.revisions[revIndex],
          price: price
        };
      }
    }
    
    // Update selected_revision_obj if it exists
    if (updatedFile.selected_revision_obj) {
      updatedFile.selected_revision_obj = {
        ...updatedFile.selected_revision_obj,
        price: price
      };
    }
    
    updatedProduct.filesByStage[stage][fileIndex] = updatedFile;
    
    // Update state
    setProducts(updatedProducts);
    
    // If this is the selected file, update it
    if (selectedFileObj && selectedFileObj.id === currentFileForModal.id) {
      setSelectedFileObj(updatedFile);
    }
    
    setToastMsg(`Price updated for ${updatedFile.name}`);
    setShowPriceModal(false);
    setCurrentFileForModal(null);
  }
  /* Handle revision change */
  function handleRevisionChange(fileObj, revisionNumber) {
    // Find the revision object
    const revision = fileObj.revisions.find(rev => rev.rev_number === revisionNumber);
    if (!revision) return;
    
    // Create proper deep copies
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    // Get the stage and make a copy of its files array
    const stage = updatedProduct.selectedStage;
    updatedProduct.filesByStage = {...updatedProduct.filesByStage};
    updatedProduct.filesByStage[stage] = [...updatedProduct.filesByStage[stage]];
    
    // Find the file
    const fileIndex = updatedProduct.filesByStage[stage].findIndex(f => f.id === fileObj.id);
    if (fileIndex === -1) return;
    
    // Make a copy of the file
    const updatedFile = {...updatedProduct.filesByStage[stage][fileIndex]};
    updatedProduct.filesByStage[stage][fileIndex] = updatedFile;
    
    // Set the current revision
    updatedFile.current_revision = revisionNumber;
    updatedFile.selected_revision_obj = revision;
    
    // Update state with the selected file object
    setProducts(updatedProducts);
    setSelectedFileObj(updatedFile);
  }
  /* RENDER PREVIEW => checks extension, shows stl, code, markdown, CSV, Excel, etc. */
  function renderPreview(fileObj) {
    if (!fileObj) {
      return <p className="text-muted">No file selected</p>;
    }
  
    // Determine which revision to show
    const selectedRevision = fileObj.selected_revision_obj || fileObj;
    
    // If dataUrl is not available (because we don't store it in localStorage),
    // construct a URL to fetch from the server based on the file name
    const serverUrl = `http://127.0.0.1:8000/media/${encodeURIComponent(fileObj.name)}`;
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
              if (fileObj.isChildFile) {
                handleChildRevisionChange(fileObj, revNum);
              } else {
                handleRevisionChange(fileObj, revNum);
              }
            }}
          >
            {fileObj.revisions && fileObj.revisions.length > 0 ? (
              fileObj.revisions.map((rev) => (
                <option key={rev.rev_number} value={rev.rev_number}>
                  v {rev.rev_number}.0
                </option>
              ))
            ) : (
              <option value={1}>v 1.0</option>
            )}
          </Form.Select>
          {selectedRevision.changeDescription && (
            <span className="ms-3 text-light" style={{ fontSize: '0.9rem', borderRadius: '8px', backgroundColor: `${styles.colors.primary}26`, padding: '5px 10px' }}>
              {selectedRevision.changeDescription}
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
    const fileUrl = dataUrl || `http://127.0.0.1:8000/media/${encodeURIComponent(fileObj.name)}`;
  
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
      //return previewContainer(<MarkdownPreview fileUrl={fileUrl} />);
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
      return previewContainer(
        <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', padding: '1rem' }}>
          <p className="text-muted">No preview available for {fileObj.name}</p>
          <p>File type: {fileObj.type || "Unknown"}</p>
          <p>Size: {(fileObj.size / 1024).toFixed(2)} KB</p>
          <p>Upload date: {new Date(fileObj.upload_date).toLocaleDateString()}</p>
        </div>
      );
    }
  }
  /* RENDER FILE LIST => always show headings for Name/Date, even if empty */
function renderFileList(prod) {
    if (!prod.selectedStage) {
      return <p className="text-muted" style={{ fontSize: '0.85rem' }}>Select a Stage/Iteration on the left to see or upload files.</p>;
    }
    const stageFiles = prod.filesByStage[prod.selectedStage] || [];
    
    // Get parent files (files without parentId)
    const parentFiles = stageFiles.filter(file => !file.isChildFile);
  
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
                <td colSpan="4" className="text-muted">
                  No files in {prod.selectedStage} yet.
                </td>
              </tr>
            ) : (
              // Map through parent files first
              parentFiles.map((fileObj, i) => {
                const ext = fileObj.name.split('.').pop().toLowerCase();
                const icon = iconMap[ext] || iconMap.default;
                const hasRevisions = fileObj.revisions && fileObj.revisions.length > 0;
                
                // Find child files that belong to this parent's current revision
                const currentRevision = fileObj.current_revision || 1;
                const childFiles = stageFiles.filter(
                  file => file.parentId === fileObj.id && file.parentRevision === currentRevision
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
                        {new Date(fileObj.upload_date).toLocaleDateString()}
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
                              <option key={rev.rev_number} value={rev.rev_number}>
                                v {rev.rev_number}.0
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
                            {new Date(childFile.upload_date).toLocaleDateString()}
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
                                  <option key={rev.rev_number} value={rev.rev_number}>
                                    v {rev.rev_number}.0
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
               {/* Add Move option */}
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
    {/* Add Remove option with red background */}
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
  const prod = products[selectedProductIndex];

  // // Render product dropdown, add buttons, file table, etc.


// const renderFileBrowser = () => {
//   const currentProduct = products[selectedProductIndex] || {};
//   const iterationCount = (currentProduct.stageIcons || []).filter(icon => icon.type === 'I').length;
//   const stageCount = (currentProduct.stageIcons || []).filter(icon => icon.type === 'S').length;

//   return (
//     <>
//       {/* Top Row: Product dropdown, add product, old icons (iteration, stage, file upload) and new view mode icons */}
//       <div className="d-flex justify-content-between align-items-center mb-2">
//         {/* Left Side: Product Dropdown + Add Product */}
//         <div className="d-flex align-items-center gap-2">
//           <Form.Select
//             size="sm"
//             value={selectedProductIndex}
//             onChange={handleSelectProduct}
//             style={{
//               width: '150px',
//               backgroundColor: `${styles.colors.dark}`,
//               color: `${styles.colors.text.light}`,
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
//           {/* Plus sign for adding a new product */}
//           <div
//             style={{
//               cursor: 'pointer',
//               color: `${styles.colors.text.light}`,
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               width: '24px',
//               height: '24px'
//             }}
//             onClick={handleCreateProduct}
//           >
//             <FaPlus size={20} style={{ transform: 'scale(0.9)' }} />
//           </div>
//         </div>

//         {/* Right Side: Old Icons (Iteration, Stage, File Upload) + New View Mode Icons */}
//         <div className="d-flex align-items-center gap-2">
//           {/* Iteration Icon with Badge (using FaSpinner) */}
//           <div style={{ position: 'relative', cursor: 'pointer' }} onClick={handleAddIteration}>
//             <FaSpinner size={20} color={styles.colors.iteration} />
//             <span
//               style={{
//                 position: 'absolute',
//                 top: '-4px',
//                 right: '-4px',
//                 background: styles.colors.iteration,
//                 color: '#fff',
//                 borderRadius: '50%',
//                 padding: '0 4px',
//                 fontSize: '10px'
//               }}
//             >
//               {iterationCount}
//             </span>
//           </div>

//           {/* Stage Icon with Badge (using FaToriiGate) */}
//           <div style={{ position: 'relative', cursor: 'pointer' }} onClick={handleAddStage}>
//             <FaToriiGate size={20} color={styles.colors.stage} />
//             <span
//               style={{
//                 position: 'absolute',
//                 top: '-4px',
//                 right: '-4px',
//                 background: styles.colors.stage,
//                 color: '#fff',
//                 borderRadius: '50%',
//                 padding: '0 4px',
//                 fontSize: '10px'
//               }}
//             >
//               {stageCount}
//             </span>
//           </div>

//           {/* File Upload Icon - border removed, color set to white */}
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
//             <FaUpload size={20} />
//           </div>

//           {/* New View Mode Icons */}
//           {/* Preview Icon (FaEye) */}
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
//             //onClick={handleViewChange}
//           >
//             <FaEye size={20} />
//           </div>

//           {/* BOM Icon (FaTable) */}
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
//            // onClick={handleShowBOM}
//           >
//             <FaTable size={20} />
//           </div>

//           {/* Chart Icon (FaChartLine) */}
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
//            // onClick={handleShowChart}
//           >
//             <FaChartLine size={20} />
//           </div>
//         </div>
//       </div>

//       {/* Render the file list/table */}
//       {renderFileList(prod)}
//     </>
//   );
// };
// const renderFileBrowser = () => {
//   const currentProduct = products[selectedProductIndex] || {};
//   // These counts are computed but not used here—they may be used in your left-side ribbon component.
//   const iterationCount = (currentProduct.stageIcons || []).filter(icon => icon.type === 'I').length;
//   const stageCount = (currentProduct.stageIcons || []).filter(icon => icon.type === 'S').length;

//   return (
//     <>
//       {/* Top Row: Product dropdown, add product, and header icons (all icons only, no badges) */}
//       <div className="d-flex justify-content-between align-items-center mb-2">
//         {/* Left Side: Product Dropdown + Add Product */}
//         <div className="d-flex align-items-center gap-2">
//           <Form.Select
//             size="sm"
//             value={selectedProductIndex}
//             onChange={handleSelectProduct}
//             style={{
//               width: '150px',
//               backgroundColor: `${styles.colors.dark}`,
//               color: `${styles.colors.text.light}`,
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
//           {/* Plus sign for adding a new product */}
//           <div
//             style={{
//               cursor: 'pointer',
//               color: `${styles.colors.text.light}`,
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               width: '24px',
//               height: '24px'
//             }}
//             onClick={handleCreateProduct}
//           >
//             <FaPlus size={20} style={{ transform: 'scale(0.9)' }} />
//           </div>
//         </div>

//         {/* Right Side: Old Icons (Iteration, Stage, File Upload) and New View Mode Icons (plain icons, no badges) */}
//         <div className="d-flex align-items-center gap-2">
//           {/* Iteration Icon (plain icon only) */}
//           <div
//             style={{
//               cursor: 'pointer'
//             }}
//             onClick={handleAddIteration}
//           >
//             <FaSpinner size={20} color={styles.colors.iteration} />
//           </div>

//           {/* Stage Icon (plain icon only) */}
//           <div
//             style={{
//               cursor: 'pointer'
//             }}
//             onClick={handleAddStage}
//           >
//             <FaToriiGate size={20} color={styles.colors.stage} />
//           </div>

//           {/* File Upload Icon - border removed, color set to white */}
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
//             <FaUpload size={20} />
//           </div>

//           {/* New View Mode Icons */}
//           {/* Preview Icon (FaEye) */}
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

//           {/* BOM Icon (FaTable) */}
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

//           {/* Chart Icon (FaChartLine) */}
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
//             onClick={handleShowChart}
//           >
//             <FaChartLine size={20} />
//           </div>
//         </div>
//       </div>

//       {/* Render the file list/table */}
//       {renderFileList(prod)}
//     </>
//   );
// };
// const renderFileBrowser = () => {
//   // We no longer need to compute counts here since the header shows only plain icons.
//   return (
//     <>
//       {/* Top Row: Product dropdown, add product, and header icons (plain icons, no badges) */}
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
//           {/* Plus sign for adding a new product */}
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
//             onClick={handleCreateProduct}
//           >
//             <FaPlus size={20} style={{ transform: 'scale(0.9)' }} />
//           </div>
//         </div>

//         {/* Right Side: Old Icons (Iteration, Stage, File Upload) and New View Mode Icons (plain icons, no badges) */}
//         <div className="d-flex align-items-center gap-2">
//           {/* Iteration Icon (plain icon only) */}
//           <div style={{ cursor: 'pointer' }} onClick={handleAddIteration}>
//             <FaSpinner size={20} color={styles.colors.iteration} />
//           </div>

//           {/* Stage Icon (plain icon only) */}
//           <div style={{ cursor: 'pointer' }} onClick={handleAddStage}>
//             <FaToriiGate size={20} color={styles.colors.stage} />
//           </div>

//           {/* File Upload Icon - border removed, color set to white */}
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
//             <FaUpload size={20} />
//           </div>

//           {/* New View Mode Icons */}
//           {/* Preview Icon (FaEye) */}
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
//            // onClick={handleViewChange}
//           >
//             <FaEye size={20} />
//           </div>

//           {/* BOM Icon (FaTable) */}
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
//            // onClick={handleShowBOM}
//           >
//             <FaTable size={20} />
//           </div>

//           {/* Chart Icon (FaChartLine) */}
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
//            // onClick={handleShowChart}
//           >
//             <FaChartLine size={20} />
//           </div>
//         </div>
//       </div>

//       {/* Render the file list/table */}
//       {renderFileList(prod)}
//     </>
//   );
// };

const renderFileBrowser = () => {
  const currentProduct = products[selectedProductIndex] || {};
  // These counts are computed but not used here—they may be used in your left-side ribbon component.
  const iterationCount = (currentProduct.stageIcons || []).filter(icon => icon.type === 'I').length;
  const stageCount = (currentProduct.stageIcons || []).filter(icon => icon.type === 'S').length;

  return (
    <>
      {/* Top Row: Product dropdown, add product, and header icons (plain icons, no badges) */}
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
          {/* Plus sign for adding a new product */}
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
            onClick={handleCreateProduct}
          >
            <FaPlus size={20} style={{ transform: 'scale(0.9)' }} />
          </div>
        </div>

        {/* Right Side: Old Icons (Iteration, Stage, File Upload) and New View Mode Icons (plain icons, no badges) */}
        <div className="d-flex align-items-center gap-2">
          {/* Iteration Icon (plain icon only) */}
          <div style={{ cursor: 'pointer' }} onClick={handleAddIteration}>
            <FaDrumSteelpan size={20} color={styles.colors.iteration} />
          </div>

          {/* Stage Icon (plain icon only) */}
          <div style={{ cursor: 'pointer' }} onClick={handleAddStage}>
            <FaToriiGate size={20} color={styles.colors.stage} />
          </div>

          {/* File Upload Icon - border removed, color set to white */}
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
            <FaUpload size={20} />
          </div>

          {/* New View Mode Icons */}
          {/* Preview Icon (FaEye) */}
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
           // onClick={handleViewChange}
          >
            <FaEye size={20} />
          </div>

          {/* BOM Icon (FaTable) */}
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
           // onClick={handleShowBOM}
          >
            <FaTable size={20} />
          </div>

          {/* Chart Icon (FaChartLine) */}
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
           // onClick={handleShowChart}
          >
            <FaChartLine size={20} />
          </div>
        </div>
      </div>

      {/* Render the file list/table */}
      {renderFileList(prod)}

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

//   return (
//     <Container
//       fluid
//       style={{
//         height: '100vh',
//         overflow: 'hidden',
//         maxWidth: '100vw',
//         width: '100%',
//         padding: 0,
//         margin: 0,
//         boxSizing: 'border-box'
//       }}
//       className="bg-dark text-light p-0"
//     >
//       {/* Center-aligned Toast message at top-center */}
//       <ToastContainer position="top-center" className="p-3" style={{ zIndex: 9999 }}>
//         <Toast
//           bg="dark"
//           onClose={() => setToastMsg('')}
//           show={!!toastMsg}
//           delay={3000}
//           autohide
//         >
//           <Toast.Body className="text-light" style={{ textAlign: 'center', fontSize: '0.85rem' }}>
//             {toastMsg}
//           </Toast.Body>
//         </Toast>
//       </ToastContainer>

//       <Row className="g-0 m-0" style={{ height: '100%', maxWidth: '100%' }}>
//         {/* Left Ribbon => pH at top, stage icons below */}
// <Col xs="auto" style={{ width: '50px', background: styles.colors.dark, padding: 0, borderRight: `1px solid ${styles.colors.border}` }}>
//   <div
//     style={{
//       height: '100%',
//       width: '100%',
//       display: 'flex',
//       flexDirection: 'column',
//       alignItems: 'center',
//       paddingTop: '0.6rem'
//     }}
//   >
//     {/* pH logo */}
//     <div
//       style={{
//         cursor: 'pointer',
//         fontWeight: '500', // Medium weight instead of bold
//         color: styles.colors.text.light, // Remove quotes and ${} syntax
//         marginBottom: '20px',
//         fontSize: '0.9rem'
//       }}
//       onClick={() => console.log('pH logo clicked')}
//     >
//       pH
//     </div>

//     {/* Stage/iteration icons with right-click delete if empty */}
//     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
//       {prod.stageIcons && prod.stageIcons.map((iconObj, idx) => {
//         const isSelected = prod.selectedStage === iconObj.label;
//         const bgColor = isSelected ? iconObj.color : 'transparent';
//         const textColor = isSelected ? styles.colors.dark : styles.colors.text.light; // Remove quotes and ${} syntax
//         const borderColor = isSelected ? 'none' : `1px solid ${styles.colors.border}`;

//         return (
//           <div
//             key={idx}
//             onClick={() => {
//               handleStageIconClick(iconObj.label);
//             }}
//             onContextMenu={e => handleStageIconRightClick(e, iconObj.label)}
//             style={{
//               cursor: 'pointer',
//               width: '32px',
//               height: '32px',
//               lineHeight: '30px',
//               textAlign: 'center',
//               borderRadius: '4px',
//               marginBottom: '8px',
//               fontWeight: '400', // Medium weight instead of bold
//               fontSize: '0.85rem',
//               background: bgColor,
//               color: textColor,
//               border: borderColor,
              
//             }}
//           >
//             {iconObj.label}
//           </div>
//         );
//       })}
//     </div>
//   </div>
// </Col>

//         {/* Main Content Area with Resizable Columns */}
//         <Col className="p-0 m-0" style={{ height: '100%', overflow: 'hidden', maxWidth: 'calc(100vw - 50px)'  }}>
//           <ResizableColumn 
//             leftContent={renderFileBrowser()}
//             rightContent={renderPreview(selectedFileObj)}
//           />
//         </Col>
//       </Row>
//     </Container>
//   );
// return (
//   <Container
//     fluid
//     style={{
//       height: '100vh',
//       overflow: 'hidden',
//       maxWidth: '100vw',
//       width: '100%',
//       padding: 0,
//       margin: 0,
//       boxSizing: 'border-box'
//     }}
//     className="bg-dark text-light p-0"
//   >
//     {/* Center-aligned Toast message at top-center */}
//     <ToastContainer position="top-center" className="p-3" style={{ zIndex: 9999 }}>
//       <Toast
//         bg="dark"
//         onClose={() => setToastMsg('')}
//         show={!!toastMsg}
//         delay={3000}
//         autohide
//       >
//         <Toast.Body
//           className="text-light"
//           style={{ textAlign: 'center', fontSize: '0.85rem' }}
//         >
//           {toastMsg}
//         </Toast.Body>
//       </Toast>
//     </ToastContainer>

//     <Row className="g-0 m-0" style={{ height: '100%', maxWidth: '100%' }}>
//       {/* Left Ribbon => pH at top, stage/iteration icons (icon + badge) below */}
//       <Col
//         xs="auto"
//         style={{
//           width: '50px',
//           background: styles.colors.dark,
//           padding: 0,
//           borderRight: `1px solid ${styles.colors.border}`
//         }}
//       >
//         <div
//           style={{
//             height: '100%',
//             width: '100%',
//             display: 'flex',
//             flexDirection: 'column',
//             alignItems: 'center',
//             paddingTop: '0.6rem'
//           }}
//         >
//           {/* pH logo */}
//           <div
//             style={{
//               cursor: 'pointer',
//               fontWeight: '500',
//               color: styles.colors.text.light,
//               marginBottom: '20px',
//               fontSize: '0.9rem'
//             }}
//             onClick={() => console.log('pH logo clicked')}
//           >
//             pH
//           </div>

//           {/* Stage/iteration icons with icon+badge (using FaSpinner for I and FaToriiGate for S) */}
//           <div
//             style={{
//               display: 'flex',
//               flexDirection: 'column',
//               alignItems: 'center',
//               width: '100%'
//             }}
//           >
//             {prod.stageIcons &&
//               prod.stageIcons.map((iconObj, idx) => {
//                 const isSelected = prod.selectedStage === iconObj.label;
//                 const bgColor = isSelected ? iconObj.color : 'transparent';
//                 const borderColor = isSelected ? 'none' : `1px solid ${styles.colors.border}`;

//                 return (
//                   <div
//                     key={idx}
//                     onClick={() => handleStageIconClick(iconObj.label)}
//                     onContextMenu={(e) => handleStageIconRightClick(e, iconObj.label)}
//                     style={{
//                       cursor: 'pointer',
//                       width: '32px',
//                       height: '32px',
//                       position: 'relative',
//                       borderRadius: '4px',
//                       marginBottom: '8px',
//                       fontSize: '0.85rem',
//                       background: bgColor,
//                       border: borderColor,
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'center'
//                     }}
//                   >
//                     {iconObj.type === 'I' ? (
//                       <FaSpinner size={20} color={styles.colors.iteration} />
//                     ) : (
//                       <FaToriiGate size={20} color={styles.colors.stage} />
//                     )}
//                     <span
//                       style={{
//                         position: 'absolute',
//                         top: '-4px',
//                         right: '-4px',
//                         background: isSelected
//                           ? iconObj.color
//                           : iconObj.type === 'I'
//                           ? styles.colors.iteration
//                           : styles.colors.stage,
//                         color: '#fff',
//                         borderRadius: '50%',
//                         padding: '0 4px',
//                         fontSize: '10px'
//                       }}
//                     >
//                       {iconObj.number}
//                     </span>
//                   </div>
//                 );
//               })}
//           </div>
//         </div>
//       </Col>

//       {/* Main Content Area with Resizable Columns */}
//       <Col
//         className="p-0 m-0"
//         style={{
//           height: '100%',
//           overflow: 'hidden',
//           maxWidth: 'calc(100vw - 50px)'
//         }}
//       >
//         <ResizableColumn
//           leftContent={renderFileBrowser()}
//           rightContent={renderPreview(selectedFileObj)}
//         />
//       </Col>
//     </Row>
//   </Container>
// );

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
            {prod.stageIcons &&
              prod.stageIcons.map((iconObj, idx) => {
                const isSelected = prod.selectedStage === iconObj.label;
                //const bgColor = isSelected ? iconObj.color : 'transparent';
                const bgColor = isSelected ? `${styles.colors.primary}64` : 'transparent';
                const borderColor = isSelected ? 'none' : `1px solid ${styles.colors.border}`;

                return (
                  <div
                    key={idx}
                    onClick={() => handleStageIconClick(iconObj.label)}
                    onContextMenu={(e) => handleStageIconRightClick(e, iconObj.label)}
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
                    {iconObj.type === 'I' ? (
                      <FaDrumSteelpan size={20} color={styles.colors.iteration} />
                    ) : (
                      <FaToriiGate size={20} color={styles.colors.stage} />
                    )}
                    <span
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: isSelected
                          ? styles.colors.dark 
                          : iconObj.type === 'I'
                          ? styles.colors.dark      
                          : styles.colors.dark,
                        color: '#fff',
                        borderRadius: '50%',
                        padding: '0 4px',
                        fontSize: '16px'
                      }}
                    >
                      {iconObj.number}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </Col>

      {/* Main Content Area with Resizable Columns */}
      <Col
        className="p-0 m-0"
        style={{
          height: '100%',
          overflow: 'hidden',
          maxWidth: 'calc(100vw - 50px)'
        }}
      >
        <ResizableColumn
          leftContent={renderFileBrowser()}
          rightContent={renderPreview(selectedFileObj)}
        />
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


}