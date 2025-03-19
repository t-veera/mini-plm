// App.js
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
  FaPlus
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
  pdf: <FaRegFilePdf style={{ marginRight: '6px', color: '#ff3d3d' }} />,
  png: <FaImage style={{ marginRight: '6px', color: '#63E6BE' }} />,
  jpg: <FaImage style={{ marginRight: '6px', color: '#63E6BE' }} />,
  jpeg: <FaImage style={{ marginRight: '6px', color: '#63E6BE' }} />,
  gif: <FaImage style={{ marginRight: '6px', color: '#63E6BE' }} />,
  stl: <FaCube style={{ marginRight: '6px', color: '#FFD43B' }} />,
  js: <FaJs style={{ marginRight: '6px', color: '#e665a4' }} />,
  py: <FaPython style={{ marginRight: '6px', color: '#B197FC' }} />,
  cpp: <FaCodepen style={{ marginRight: '6px', color: '#ff813d' }} />,
  md: <FaMarkdown style={{ marginRight: '6px', color: '#74C0FC' }} />,
  ino: <FaCode style={{ marginRight: '6px', color: '#FF6B6B' }} />,
  default: <FaFileAlt style={{ marginRight: '6px', color: '#74C0FC' }} />
};

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

/* ---------------- MAIN APP ---------------- */
export default function App() {
  /* 1) Load from localStorage on mount (persist products) */
  const [products, setProducts] = useState(() => {
    const stored = localStorage.getItem('phasorProducts');
    if (stored) {
      return JSON.parse(stored);
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

  /* Hidden file input ref */
  const hiddenFileInput = useRef(null);

  /* CREATE NEW PRODUCT */
  function handleCreateProduct() {
    const prodName = prompt('Enter new product name:');
    if (!prodName) return;
    const newProd = {
      name: prodName,
      stageIcons: [],
      selectedStage: null,
      filesByStage: {}
    };
    setProducts(prev => [...prev, newProd]);
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
    const prod = products[selectedProductIndex];
    const sCount = prod.stageIcons.filter(icon => icon.type === 'S').length;
    const newLabel = `S${sCount + 1}`;
    const color = '#FFC107'; // Amber
    const newIcon = { type: 'S', label: newLabel, color };

    const updatedIcons = [...prod.stageIcons, newIcon];
    const updatedFiles = { ...prod.filesByStage, [newLabel]: [] };
    const updatedProd = {
      ...prod,
      stageIcons: updatedIcons,
      filesByStage: updatedFiles,
      selectedStage: newLabel // auto-select
    };
    const newProducts = [...products];
    newProducts[selectedProductIndex] = updatedProd;
    setProducts(newProducts);
    setSelectedFileObj(null);
  }

  /* ADD ITERATION => i1 => #4FC3F7 */
  function handleAddIteration() {
    const prod = products[selectedProductIndex];
    const iCount = prod.stageIcons.filter(icon => icon.type === 'I').length;
    const newLabel = `i${iCount + 1}`;
    const color = '#4FC3F7';
    const newIcon = { type: 'I', label: newLabel, color };

    const updatedIcons = [...prod.stageIcons, newIcon];
    const updatedFiles = { ...prod.filesByStage, [newLabel]: [] };
    const updatedProd = {
      ...prod,
      stageIcons: updatedIcons,
      filesByStage: updatedFiles,
      selectedStage: newLabel
    };
    const newProducts = [...products];
    newProducts[selectedProductIndex] = updatedProd;
    setProducts(newProducts);
    setSelectedFileObj(null);
  }

  /* STAGE ICON LEFT-CLICK => SELECT THAT STAGE
     STAGE ICON RIGHT-CLICK => DELETE IF EMPTY
  */
  function handleStageIconClick(label) {
    const newProducts = [...products];
    const prod = { ...newProducts[selectedProductIndex] };
    prod.selectedStage = label;
    newProducts[selectedProductIndex] = prod;
    setProducts(newProducts);
    setSelectedFileObj(null);
  }

  function handleStageIconRightClick(e, label) {
    e.preventDefault(); // no default context menu
    const newProducts = [...products];
    const prod = { ...newProducts[selectedProductIndex] };

    // Check if this stage/iteration has files
    const fileList = prod.filesByStage[label] || [];
    if (fileList.length > 0) {
      // has files => do nothing or show alert
      setToastMsg('Cannot delete a stage/iteration with files!');
      return;
    }

    // If empty => ask user
    const confirmDel = window.confirm(`Delete ${label}? It's empty and will be removed.`);
    if (!confirmDel) return;

    // remove from stageIcons
    const updatedIcons = prod.stageIcons.filter(icon => icon.label !== label);
    // remove from filesByStage
    const updatedFiles = { ...prod.filesByStage };
    delete updatedFiles[label];

    // If the user is currently selected that stage, reset selectedStage
    if (prod.selectedStage === label) {
      prod.selectedStage = null;
    }

    prod.stageIcons = updatedIcons;
    prod.filesByStage = updatedFiles;

    newProducts[selectedProductIndex] = prod;
    setProducts(newProducts);
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

  /* FILE SELECT => physically upload => store in filesByStage */
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

    const formData = new FormData();
    formData.append('uploaded_file', file);

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/files/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      if (response.status === 201) {
        setToastMsg('File uploaded successfully!');

        const newFileObj = {
          name: file.name,
          upload_date: new Date().toISOString()
        };
        const stage = prod.selectedStage;
        const updatedFiles = { ...prod.filesByStage };
        updatedFiles[stage] = [...(updatedFiles[stage] || []), newFileObj];

        const updatedProd = {
          ...prod,
          filesByStage: updatedFiles
        };
        const newProducts = [...products];
        newProducts[selectedProductIndex] = updatedProd;
        setProducts(newProducts);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setToastMsg('Error uploading file.');
    } finally {
      setIsLoading(false);
    }
  }

  /* -------------- CSV & EXCEL PREVIEW -------------- */
  function CsvPreview({ fileUrl }) {
    const [rows, setRows] = useState([]);

    useEffect(() => {
      async function fetchCsv() {
        try {
          const res = await fetch(fileUrl);
          const text = await res.text();
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

  /* RENDER PREVIEW => checks extension, shows stl, code, markdown, CSV, Excel, etc. */
  function renderPreview(fileObj) {
    if (!fileObj) {
      return <p className="text-muted">No file selected</p>;
    }

    const nameLower = fileObj.name.toLowerCase();
    const fileUrl = `http://127.0.0.1:8000/media/${encodeURIComponent(fileObj.name)}`;

    // Images
    if (
      nameLower.endsWith('.png') ||
      nameLower.endsWith('.jpg') ||
      nameLower.endsWith('.jpeg') ||
      nameLower.endsWith('.gif')
    ) {
      return (
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
      return (
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
      return (
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
      return <CodePreview fileUrl={fileUrl} extension={ext} />;
    }
    // Markdown
    else if (nameLower.endsWith('.md') || nameLower.endsWith('.markdown')) {
      return <MarkdownPreview fileUrl={fileUrl} />;
    }
    // CSV
    else if (nameLower.endsWith('.csv')) {
      return <CsvPreview fileUrl={fileUrl} />;
    }
    // Excel
    else if (nameLower.endsWith('.xls') || nameLower.endsWith('.xlsx')) {
      return <ExcelPreview fileUrl={fileUrl} />;
    }
    // Fallback
    else {
      return (
        <div style={{ minHeight: '600px', border: '1px solid #888', padding: '1rem' }}>
          <p className="text-muted">No preview available</p>
        </div>
      );
    }
  }

  /* RENDER FILE LIST => always show headings for Name/Date, even if empty */
  function renderFileList(prod) {
    if (!prod.selectedStage) {
      return <p className="text-muted">Select a Stage/Iteration on the left to see or upload files.</p>;
    }
    const stageFiles = prod.filesByStage[prod.selectedStage] || [];

    return (
      <Table
        hover
        borderless
        className="table-dark table-sm"
        style={{ cursor: 'pointer' }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid #555' }}>
            <th>Name</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {stageFiles.length === 0 ? (
            <tr>
              <td colSpan="2" className="text-muted">
                No files in {prod.selectedStage} yet.
              </td>
            </tr>
          ) : (
            stageFiles.map((fileObj, i) => {
              const ext = fileObj.name.split('.').pop().toLowerCase();
              const icon = iconMap[ext] || iconMap.default;
              return (
                <tr key={i} onClick={() => setSelectedFileObj(fileObj)}>
                  <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {icon}
                    {fileObj.name}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(fileObj.upload_date).toLocaleDateString()}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>
    );
  }

  const prod = products[selectedProductIndex];

  return (
    <Container
      fluid
      style={{ height: '100vh', overflow: 'hidden' }}
      className="bg-dark text-light"
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
          <Toast.Body className="text-light" style={{ textAlign: 'center' }}>
            {toastMsg}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <Row style={{ height: '100%' }}>
        {/* Left Ribbon => pH at top, stage icons below */}
        <Col xs="auto" style={{ width: '60px', background: '#222' }}>
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: '0.6rem'
            }}
          >
            {/* pH logo */}
            <div
              style={{
                cursor: 'pointer',
                fontWeight: 'bold',
                color: '#fff',
                marginBottom: '20px'
              }}
              onClick={() => console.log('pH logo clicked')}
            >
              pH
            </div>

            {/* Stage/iteration icons with right-click delete if empty */}
            {prod.stageIcons.map((iconObj, idx) => {
              const isSelected = prod.selectedStage === iconObj.label;
              const bgColor = isSelected ? iconObj.color : '#fff';
              const textColor = '#000';

              return (
                <div
                  key={idx}
                  onClick={() => {
                    handleStageIconClick(iconObj.label);
                  }}
                  onContextMenu={e => {
                    e.preventDefault();
                    const fileList = prod.filesByStage[iconObj.label] || [];
                    if (fileList.length > 0) {
                      setToastMsg('Cannot delete a stage/iteration with files!');
                      return;
                    }
                    if (
                      window.confirm(
                        `Delete ${iconObj.label}? It's empty and will be removed.`
                      )
                    ) {
                      // remove from stageIcons
                      const updatedIcons = prod.stageIcons.filter(
                        ic => ic.label !== iconObj.label
                      );
                      // remove from filesByStage
                      const updatedFiles = { ...prod.filesByStage };
                      delete updatedFiles[iconObj.label];
                      if (prod.selectedStage === iconObj.label) {
                        prod.selectedStage = null;
                      }
                      prod.stageIcons = updatedIcons;
                      prod.filesByStage = updatedFiles;

                      const newProds = [...products];
                      newProds[selectedProductIndex] = prod;
                      setProducts(newProds);
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                    width: '30px',
                    height: '30px',
                    lineHeight: '30px',
                    textAlign: 'center',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    fontWeight: 'bold',
                    background: bgColor,
                    color: textColor
                  }}
                >
                  {iconObj.label}
                </div>
              );
            })}
          </div>
        </Col>

        {/* Middle Column => product dropdown, add stage/iteration, F button */}
        <Col
          md={3}
          style={{
            height: '100%',
            overflowY: 'auto',
            padding: '1rem',
            borderRight: '1px solid #444'
          }}
        >
          {/* Product dropdown + add product */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <Form.Select
                size="sm"
                value={selectedProductIndex}
                onChange={handleSelectProduct}
                style={{
                  width: '150px',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555'
                }}
                className="shadow-none"
              >
                {products.map((p, idx) => (
                  <option key={idx} value={idx}>
                    {p.name}
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
                  width: '28px',
                  height: '28px'
                }}
                onClick={handleCreateProduct}
              >
                <FaPlus size={16} style={{ transform: 'scale(0.9)' }} />
              </div>
            </div>

            <div className="d-flex gap-2">
              {/* Iteration => #4FC3F7, outlined */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #4FC3F7',
                  background: 'transparent',
                  color: '#4FC3F7',
                  cursor: 'pointer'
                }}
                onClick={handleAddIteration}
              >
                i
              </div>

              {/* Stage => #FFC107, outlined */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #FFC107',
                  background: 'transparent',
                  color: '#FFC107',
                  cursor: 'pointer'
                }}
                onClick={handleAddStage}
              >
                S
              </div>

              {/* F => #FF4081, for add file */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #FF4081',
                  background: 'transparent',
                  color: '#FF4081',
                  cursor: 'pointer'
                }}
                onClick={handlePlusClick}
              >
                F
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
          {(() => {
            if (!prod.selectedStage) {
              return <p className="text-muted">Select a Stage/Iteration on the left to see or upload files.</p>;
            }
            const stageFiles = prod.filesByStage[prod.selectedStage] || [];

            return (
              <Table
                hover
                borderless
                className="table-dark table-sm"
                style={{ cursor: 'pointer' }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #555' }}>
                    <th>Name</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stageFiles.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="text-muted">
                        No files in {prod.selectedStage} yet.
                      </td>
                    </tr>
                  ) : (
                    stageFiles.map((fileObj, i) => {
                      const ext = fileObj.name.split('.').pop().toLowerCase();
                      const icon = iconMap[ext] || iconMap.default;
                      return (
                        <tr key={i} onClick={() => setSelectedFileObj(fileObj)}>
                          <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                            {icon}
                            {fileObj.name}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {new Date(fileObj.upload_date).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            );
          })()}
        </Col>

        {/* Right Column => actual file preview */}
        <Col
          md
          style={{
            height: '100%',
            overflowY: 'auto',
            padding: '1rem'
          }}
        >
          {renderPreview(selectedFileObj)}
        </Col>
      </Row>

      {/* Toast for ephemeral messages at top-center */}
      <ToastContainer position="top-center" className="p-3" style={{ zIndex: 9999 }}>
        <Toast
          bg="dark"
          onClose={() => setToastMsg('')}
          show={!!toastMsg}
          delay={3000}
          autohide
        >
          <Toast.Body className="text-light" style={{ textAlign: 'center' }}>
            {toastMsg}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
}
