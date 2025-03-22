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
  FaUpload
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

/* ---------------- FILE ICON MAP ---------------- */
const iconMap = {
  pdf: <FaRegFilePdf style={{ marginRight: '4px', color: '#ff3d3d', fontSize: '1.5rem' }} />,
  png: <FaImage style={{ marginRight: '4px', color: '#63E6BE', fontSize: '1.5rem' }} />,
  jpg: <FaImage style={{ marginRight: '4px', color: '#63E6BE', fontSize: '1.5rem' }} />,
  jpeg: <FaImage style={{ marginRight: '4px', color: '#63E6BE', fontSize: '1.5rem' }} />,
  gif: <FaImage style={{ marginRight: '4px', color: '#63E6BE', fontSize: '1.5rem' }} />,
  stl: <FaCube style={{ marginRight: '4px', color: '#FFD43B', fontSize: '1.5rem' }} />,
  js: <FaJs style={{ marginRight: '4px', color: '#e665a4', fontSize: '1.5rem' }} />,
  py: <FaPython style={{ marginRight: '4px', color: '#B197FC', fontSize: '1.5rem' }} />,
  cpp: <FaCodepen style={{ marginRight: '4px', color: '#ff813d', fontSize: '1.5rem' }} />,
  md: <FaMarkdown style={{ marginRight: '4px', color: '#74C0FC', fontSize: '1.5rem' }} />,
  ino: <FaCode style={{ marginRight: '4px', color: '#FF6B6B', fontSize: '1.5rem' }} />,
  default: <FaFileAlt style={{ marginRight: '4px', color: '#74C0FC', fontSize: '1.5rem' }} />
};

// Status options for files
const FILE_STATUSES = ['In-Work', 'Review', 'Released'];

/* ---------------- STL VIEWER (with grid) ---------------- */
function StlViewer({ fileUrl }) {
  const geometry = useLoader(STLLoader, fileUrl);

  // Center geometry & compute bounding box for scaling
  geometry.center();
  geometry.computeBoundingBox();
  const size = geometry.boundingBox?.getSize(new THREE.Vector3()).length() || 1;
  const scaleFactor = 10 / size;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[scaleFactor, scaleFactor, scaleFactor]}
      castShadow
      receiveShadow
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color="#ccc" roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

/* ---------------- CODE PREVIEW ---------------- */
function CodePreview({ fileUrl, extension }) {
  const [codeContent, setCodeContent] = useState('');

  useEffect(() => {
    async function fetchCode() {
      try {
        const res = await fetch(fileUrl);
        const text = await res.text();
        setCodeContent(text);
      } catch (err) {
        console.error('Error fetching code file:', err);
      }
    }
    fetchCode();
  }, [fileUrl]);

  let language = 'javascript';
  if (extension === '.py') language = 'python';
  else if (extension === '.cpp') language = 'cpp';
  else if (extension === '.java') language = 'java';
  else if (extension === '.ts') language = 'typescript';
  else if (extension === '.ino') language = 'cpp'; // treat .ino as c++

  return (
    <div style={{ minHeight: '600px', border: '1px solid #888', overflow: 'auto' }}>
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

  useEffect(() => {
    async function fetchMarkdown() {
      try {
        const res = await fetch(fileUrl);
        const text = await res.text();
        setMarkdownContent(text);
      } catch (err) {
        console.error('Error fetching markdown file:', err);
      }
    }
    fetchMarkdown();
  }, [fileUrl]);

  return (
    <div style={{ minHeight: '600px', border: '1px solid #888', overflow: 'auto', padding: '1rem' }}>
      <ReactMarkdown>{markdownContent}</ReactMarkdown>
    </div>
  );
}

/* ---------------- CSV PREVIEW ---------------- */
function CsvPreview({ fileUrl }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function fetchCsv() {
      try {
        const res = await fetch(fileUrl);
        const text = await res.text();
        // naive parse: split lines by \n, columns by ,
        const lines = text.split('\n').map(line => line.split(','));
        setRows(lines);
      } catch (err) {
        console.error('Error fetching CSV file:', err);
      }
    }
    fetchCsv();
  }, [fileUrl]);

  return (
    <div style={{ minHeight: '600px', border: '1px solid #888', overflow: 'auto' }}>
      {rows.length === 0 ? (
        <p className="text-muted p-2">No data in CSV</p>
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

  useEffect(() => {
    async function fetchExcel() {
      try {
        const res = await fetch(fileUrl);
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setRows(jsonData);
      } catch (err) {
        console.error('Error fetching Excel file:', err);
      }
    }
    fetchExcel();
  }, [fileUrl]);

  return (
    <div style={{ minHeight: '600px', border: '1px solid #888', overflow: 'auto' }}>
      {rows.length === 0 ? (
        <p className="text-muted p-2">No data in Excel</p>
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
  const [leftWidth, setLeftWidth] = useState(500); // Increased default width
  const [isResizing, setIsResizing] = useState(false);
  const minWidth = 200; // Minimum width for left column
  const maxWidth = window.innerWidth - 300; // Maximum width (leave space for right column)

  // Handle mouse down on the resizer
  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  // Handle mouse move to resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

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
    <div className="d-flex flex-grow-1" style={{ height: '100%', overflow: 'hidden', padding: 0, margin: 0 }}>
      {/* Left Column */}
      <div style={{ 
        width: `${leftWidth}px`, 
        flexShrink: 0, 
        height: '100%', 
        overflowY: 'auto',
        padding: '0.75rem',
        borderRight: '1px solid #444'
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
          background: isResizing ? '#4FC3F7' : 'transparent',
          transition: isResizing ? 'none' : 'background 0.2s'
        }}></div>
      </div>
      
      {/* Right Column */}
      <div style={{ 
        flexGrow: 1, 
        height: '100%', 
        overflowY: 'auto',
        padding: '0.75rem'
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
          // Remove all quantities from existing files
          const cleanedProducts = parsed.map(product => {
            const updatedProduct = {...product};
            if (updatedProduct.filesByStage) {
              Object.keys(updatedProduct.filesByStage).forEach(stage => {
                if (Array.isArray(updatedProduct.filesByStage[stage])) {
                  updatedProduct.filesByStage[stage] = updatedProduct.filesByStage[stage].map(file => {
                    const updatedFile = {...file};
                    delete updatedFile.quantity;
                    
                    // Also clean revisions if they exist
                    if (updatedFile.revisions && Array.isArray(updatedFile.revisions)) {
                      updatedFile.revisions = updatedFile.revisions.map(rev => {
                        const updatedRev = {...rev};
                        delete updatedRev.quantity;
                        return updatedRev;
                      });
                    }
                    
                    // Clean selected_revision_obj if it exists
                    if (updatedFile.selected_revision_obj) {
                      const updatedRevObj = {...updatedFile.selected_revision_obj};
                      delete updatedRevObj.quantity;
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
    localStorage.setItem('phasorProducts', JSON.stringify(products));
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
  const [currentFileForModal, setCurrentFileForModal] = useState(null);

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

  /* ADD STAGE => S1 => Amber (#FFC107) */
  function handleAddStage() {
    // Create deep copies to ensure proper React state updates
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    const sCount = (updatedProduct.stageIcons || [])
      .filter(icon => icon.type === 'S')
      .length;
    
    const newLabel = `S${sCount + 1}`;
    const color = '#FFC107'; // Amber
    const newIcon = { type: 'S', label: newLabel, color };

    // Create new arrays/objects to ensure React detects the changes
    updatedProduct.stageIcons = [...(updatedProduct.stageIcons || []), newIcon];
    updatedProduct.filesByStage = {...updatedProduct.filesByStage};
    updatedProduct.filesByStage[newLabel] = [];
    updatedProduct.selectedStage = newLabel; // auto-select
    
    setProducts(updatedProducts);
    setSelectedFileObj(null);
  }

  /* ADD ITERATION => i1 => #4FC3F7 */
  function handleAddIteration() {
    // Create deep copies to ensure proper React state updates
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    const iCount = (updatedProduct.stageIcons || [])
      .filter(icon => icon.type === 'I')
      .length;
      
    const newLabel = `i${iCount + 1}`;
    const color = '#4FC3F7';
    const newIcon = { type: 'I', label: newLabel, color };

    // Create new arrays/objects to ensure React detects the changes
    updatedProduct.stageIcons = [...(updatedProduct.stageIcons || []), newIcon];
    updatedProduct.filesByStage = {...updatedProduct.filesByStage};
    updatedProduct.filesByStage[newLabel] = [];
    updatedProduct.selectedStage = newLabel; // auto-select
    
    setProducts(updatedProducts);
    setSelectedFileObj(null);
  }

  /* STAGE ICON LEFT-CLICK => SELECT THAT STAGE */
  function handleStageIconClick(label) {
    const updatedProducts = [...products];
    const updatedProduct = {...updatedProducts[selectedProductIndex]};
    updatedProducts[selectedProductIndex] = updatedProduct;
    
    updatedProduct.selectedStage = label;
    
    setProducts(updatedProducts);
    setSelectedFileObj(null);
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
    
    // Only parent files can have children (not child files themselves)
    if (fileObj.parentId) {
      setToastMsg('Child files cannot have their own children');
      return;
    }

    setParentFileForChild(fileObj);
    childFileInput.current.click();
  }

  /* Handle child file upload */
  async function handleChildFileChange(e) {
    const file = e.target.files[0];
    if (!file || !parentFileForChild) return;

    const prod = products[selectedProductIndex];
    if (!prod.selectedStage) {
      setToastMsg('No stage selected yet.');
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
        revisions: [] // Initialize revisions array
      };
      
      // Add child file to the stage
      updatedProduct.filesByStage[stage].push(childFileObj);

      // Update parent file to track this child
      const updatedParentFile = {...updatedProduct.filesByStage[stage][parentFileIndex]};
      
      // Ensure childFiles array exists
      if (!updatedParentFile.childFiles) {
        updatedParentFile.childFiles = [];
      }
      
      // Add child file reference to parent
      updatedParentFile.childFiles.push(childFileObj.id);
      
      // Update parent file in the stage
      updatedProduct.filesByStage[stage][parentFileIndex] = updatedParentFile;

      // Update state with completely new references
      setProducts(updatedProducts);
      
      // Select this file for preview
      setSelectedFileObj(childFileObj);
      
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

  /* FILE SELECT (UPLOAD) - Fixed version that works with React state updates */
  /* FILE SELECT (UPLOAD) - With revision handling */
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const prod = products[selectedProductIndex];
    if (!prod.selectedStage) {
      setToastMsg('No stage selected yet.');
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
        price: '' // Empty price by default
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
        existingFile.childFiles = []; // Reset child files for the new revision
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
        updatedProduct.filesByStage[stage].push(newFileObj);
        
        fileToSelect = newFileObj;
        
        setToastMsg('File uploaded successfully!');
      }
      
      // Update state with completely new references
      setProducts(updatedProducts);
      
      // Select this file for preview after state update
      setSelectedFileObj(fileToSelect);
      
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
      setToastMsg('Error uploading file.');
    } finally {
      setIsLoading(false);
      // Reset the file input
      e.target.value = '';
    }
  }

  /* Handle context menu upload */
  async function handleContextMenuFileChange(e) {
    const file = e.target.files[0];
    if (!file || !currentFileForModal) return;

    const prod = products[selectedProductIndex];
    if (!prod.selectedStage) {
      setToastMsg('No stage selected yet.');
      return;
    }

    setIsLoading(true);
    setToastMsg('');

    try {
      // Check file extension to ensure it's the same format
      const origExt = currentFileForModal.name.split('.').pop().toLowerCase();
      const newExt = file.name.split('.').pop().toLowerCase();
      
      if (origExt !== newExt) {
        setToastMsg(`File format must match: .${origExt}`);
        setIsLoading(false);
        e.target.value = '';
        return;
      }

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

      // Find the existing file
      const existingFileIndex = updatedProduct.filesByStage[stage].findIndex(
        f => f.id === currentFileForModal.id
      );

      if (existingFileIndex !== -1) {
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
            isChildFile: true
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
          
          setToastMsg(`New revision (Rev ${newRevision.rev_number}) created for ${existingFile.name}!`);
        }
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
      setToastMsg('Error uploading file.');
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
  /* RENDER PREVIEW => with revision dropdown */
  function renderPreview(fileObj) {
    if (!fileObj) {
      return <p className="text-muted">No file selected</p>;
    }
  
    // Determine which revision to show
    const selectedRevision = fileObj.selected_revision_obj || fileObj;
    const dataUrl = selectedRevision.dataUrl || fileObj.dataUrl;
    const fileToDisplay = selectedRevision;

     // Display current revision number
    const currentRevisionNumber = fileObj.current_revision || 1;
    
    // If the file has revisions, show a revision selector
    const revisionSelector = fileObj.revisions && fileObj.revisions.length > 0 ? (
      <div className="mb-3 d-flex align-items-center">
        <label className="me-2" style={{ minWidth: '100px', fontSize: '0.9rem' }}>Revision:</label>
        <td>
  <Form.Select 
    size="sm"
    style={{ 
      width: '90px',
      backgroundColor: '#212529',
      color: '#fff',
      border: '1px solid #444',
      fontSize: '0.8rem',
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`
    }}
    value={fileObj.status || 'In-Work'}
    onClick={e => e.stopPropagation()}
    onChange={e => {
      e.stopPropagation();
      const newStatus = e.target.value;
      handleStatusChange(fileObj, newStatus);
    }}
  >
    {FILE_STATUSES.map((status) => (
      <option key={status} value={status}>
        {status}
      </option>
    ))}
  </Form.Select>
</td>
      </div>
    ) : null;
  
    // Container for file preview with revision selector - removed file info section
    const previewContainer = (previewContent) => (
      <div>
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
        <div style={{ minHeight: '600px', border: '1px solid #888', overflow: 'auto' }}>
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
        <div style={{ minHeight: '600px', border: '1px solid #888', overflow: 'auto' }}>
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
    // STL (3D)
    else if (nameLower.endsWith('.stl')) {
      return previewContainer(
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '600px',
            border: '1px solid #888',
            overflow: 'hidden'
          }}
        >
          <Canvas
            shadows
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: '#222'
            }}
            camera={{ position: [0, 10, 15], fov: 40 }}
          >
            {/* gridHelper for more contrast */}
            <gridHelper args={[50, 50, 'white', 'gray']} />
            <directionalLight
              castShadow
              position={[10, 15, 10]}
              intensity={1}
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <ambientLight intensity={0.3} />
  
            <OrbitControls />
  
            <Suspense fallback={null}>
              <StlViewer fileUrl={fileUrl} />
            </Suspense>
          </Canvas>
        </div>
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
    // Fallback
    else {
      return previewContainer(
        <div style={{ minHeight: '600px', border: '1px solid #888', padding: '1rem' }}>
          <p className="text-muted">No preview available</p>
        </div>
      );
    }
  }
  
/* RENDER FILE LIST => always show headings for Name/Date, even if empty */
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
            <tr style={{ borderBottom: '1px solid #555' }}>
              <th>Name</th>
              <th>Date</th>
              <th>Rev</th>
              <th>Status</th>
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
                      className={selectedFileObj && selectedFileObj.id === fileObj.id ? 'bg-secondary' : ''}
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
                            style={{ cursor: 'pointer', color: '#FF4081' }}
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
                            backgroundColor: '#212529',
                            color: '#fff',
                            border: '1px solid #444',
                            fontSize: '0.8rem',
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`
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
                                Rev {rev.rev_number}
                              </option>
                            ))
                          ) : (
                            <option value={1}>Rev 1</option>
                          )}
                        </Form.Select>
                      </td>
                      <td>
                        <Form.Select 
                          size="sm"
                          style={{ 
                            width: '90px',
                            backgroundColor: '#212529',
                            color: '#fff',
                            border: '1px solid #444',
                            fontSize: '0.8rem',
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`
                          }}
                          value={fileObj.status || 'In-Work'}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            e.stopPropagation();
                            const newStatus = e.target.value;
                            handleStatusChange(fileObj, newStatus);
                          }}
                        >
                          {FILE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Form.Select>
                      </td>
                    </tr>
                    
                    {/* Child Files Rows */}
                    {childFiles.map(childFile => {
                      const hasChildRevisions = childFile.revisions && childFile.revisions.length > 0;
                      
                      return (
                        <tr 
                          key={childFile.id}
                          onClick={() => setSelectedFileObj(childFile)}
                          className={selectedFileObj && selectedFileObj.id === childFile.id ? 'bg-secondary' : ''}
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
                                backgroundColor: '#212529',
                                color: '#fff',
                                border: '1px solid #444',
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
                                    Rev {rev.rev_number}
                                  </option>
                                ))
                              ) : (
                                <option value={1}>Rev 1</option>
                              )}
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Select 
                              size="sm"
                              style={{ 
                                width: '90px',
                                backgroundColor: '#212529',
                                color: '#fff',
                                border: '1px solid #444',
                                fontSize: '0.8rem',
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`
                              }}
                              value={childFile.status || 'In-Work'}
                              onClick={e => e.stopPropagation()}
                              onChange={e => {
                                e.stopPropagation();
                                const newStatus = e.target.value;
                                handleStatusChange(childFile, newStatus);
                              }}
                            >
                              {FILE_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
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
              backgroundColor: '#212529',
              border: '1px solid #444',
              borderRadius: '4px',
              padding: '0.5rem 0',
              zIndex: 1000,
              minWidth: '150px',
              fontSize: '0.85rem'
            }}
          >
            <div 
              style={{
                padding: '0.375rem 1rem',
                cursor: 'pointer',
                color: '#fff',
                fontWeight: 'normal'
              }}
              className="context-menu-item"
              onClick={handleContextMenuUpload}
              onMouseOver={(e) => e.target.style.backgroundColor = '#343a40'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Upload Revision
            </div>
            <div 
              style={{
                padding: '0.375rem 1rem',
                cursor: 'pointer',
                color: '#fff',
                fontWeight: 'normal'
              }}
              className="context-menu-item"
              onClick={handleQuantityOption}
              onMouseOver={(e) => e.target.style.backgroundColor = '#343a40'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Set Quantity
            </div>
            <div 
              style={{
                padding: '0.375rem 1rem',
                cursor: 'pointer',
                color: '#fff',
                fontWeight: 'normal'
              }}
              className="context-menu-item"
              onClick={handlePriceOption}
              onMouseOver={(e) => e.target.style.backgroundColor = '#343a40'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Set Price
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
                backgroundColor: '#212529',
                border: '1px solid #444',
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
                      backgroundColor: '#343a40',
                      color: '#fff',
                      border: '1px solid #444',
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
                backgroundColor: '#212529',
                border: '1px solid #444',
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
                      backgroundColor: '#343a40',
                      color: '#fff',
                      border: '1px solid #444',
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
      </>
    );
  }

  const prod = products[selectedProductIndex];

  // Render product dropdown, add buttons, file table, etc.
  const renderFileBrowser = () => (
    <>
      {/* Product dropdown + add product */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <Form.Select
            size="sm"
            value={selectedProductIndex}
            onChange={handleSelectProduct}
            style={{
              width: '150px',
              backgroundColor: '#212529',
              color: '#fff',
              border: '1px solid #444',
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
          {/* plus sign => same style as file list plus */}
          <div
            style={{
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px'
            }}
            onClick={handleCreateProduct}
          >
            <FaPlus size={14} style={{ transform: 'scale(0.9)' }} />
          </div>
        </div>

        <div className="d-flex gap-2">
          {/* Iteration => #4FC3F7, outlined */}
          <div
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #4FC3F7',
              background: 'transparent',
              color: '#4FC3F7',
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
            onClick={handleAddIteration}
          >
            i
          </div>

          {/* Stage => #FFC107, outlined */}
          <div
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #FFC107',
              background: 'transparent',
              color: '#FFC107',
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
            onClick={handleAddStage}
          >
            S
          </div>

          {/* Upload icon instead of F */}
          <div
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #FF4081',
              background: 'transparent',
              color: '#FF4081',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
            onClick={handlePlusClick}
          >
            <FaUpload size={12} />
          </div>
          {isLoading && (
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
              style={{ marginLeft: '5px' }}
            />
          )}
          <input
            type="file"
            ref={hiddenFileInput}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Render the table with headings always visible */}
      {renderFileList(prod)}
    </>
  );

  return (
    <Container
      fluid
      style={{ height: '100vh', overflow: 'hidden' }}
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
          <Toast.Body className="text-light" style={{ textAlign: 'center', fontSize: '0.85rem' }}>
            {toastMsg}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <Row className="g-0 m-0" style={{ height: '100%' }}>
        {/* Left Ribbon => pH at top, stage icons below */}
        <Col xs="auto" style={{ width: '50px', background: '#222', padding: 0 }}>
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
                fontWeight: 'bold',
                color: '#fff',
                marginBottom: '20px',
                fontSize: '0.9rem'
              }}
              onClick={() => console.log('pH logo clicked')}
            >
              pH
            </div>

            {/* Stage/iteration icons with right-click delete if empty */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              {prod.stageIcons && prod.stageIcons.map((iconObj, idx) => {
                const isSelected = prod.selectedStage === iconObj.label;
                const bgColor = isSelected ? iconObj.color : 'transparent';
                const textColor = isSelected ? '#000' : '#fff';
                const borderColor = isSelected ? iconObj.color : 'transparent';

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      handleStageIconClick(iconObj.label);
                    }}
                    onContextMenu={e => handleStageIconRightClick(e, iconObj.label)}
                    style={{
                      cursor: 'pointer',
                      width: '30px',
                      height: '30px',
                      lineHeight: '30px',
                      textAlign: 'center',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      background: bgColor,
                      color: textColor,
                      border: `1px solid ${borderColor}`
                    }}
                  >
                    {iconObj.label}
                  </div>
                );
              })}
            </div>
          </div>
        </Col>

        {/* Main Content Area with Resizable Columns */}
        <Col className="p-0 m-0" style={{ height: '100%', overflow: 'hidden' }}>
          <ResizableColumn 
            leftContent={renderFileBrowser()}
            rightContent={renderPreview(selectedFileObj)}
          />
        </Col>
      </Row>
    </Container>
  );
}