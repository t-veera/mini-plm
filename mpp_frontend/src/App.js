// App.js
import React, { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Alert,
  Spinner,
  Table
} from 'react-bootstrap';

// React Three Fiber / Three.js
import { Canvas, useLoader } from '@react-three/fiber';
import { STLLoader } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Code Syntax Highlighting
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Markdown
import ReactMarkdown from 'react-markdown';

function App() {
  // States
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Fetch file list on mount
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/files/');
      setFiles(res.data);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  // Handle file upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file before uploading.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('uploaded_file', file);

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/files/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.status === 201) {
        setMessage('File uploaded successfully!');
        fetchFiles();
      }
    } catch (error) {
      setMessage('Error uploading file.');
      console.error("Error uploading file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = (f) => {
    setSelectedFile(f);
  };

  // 3D STL Viewer
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

  // CodePreview for code files
  function CodePreview({ fileUrl, extension }) {
    const [codeContent, setCodeContent] = useState('');

    useEffect(() => {
      async function fetchCode() {
        try {
          const res = await fetch(fileUrl);
          const text = await res.text();
          setCodeContent(text);
        } catch (err) {
          console.error("Error fetching code file:", err);
        }
      }
      fetchCode();
    }, [fileUrl]);

    let language = 'javascript';
    if (extension === '.py') language = 'python';
    else if (extension === '.cpp') language = 'cpp';
    else if (extension === '.java') language = 'java';
    else if (extension === '.ts') language = 'typescript';

    return (
      <div style={{ minHeight: '600px', border: '1px solid #555', overflow: 'auto' }}>
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

  // MarkdownPreview
  function MarkdownPreview({ fileUrl }) {
    const [markdownContent, setMarkdownContent] = useState('');

    useEffect(() => {
      async function fetchMarkdown() {
        try {
          const res = await fetch(fileUrl);
          const text = await res.text();
          setMarkdownContent(text);
        } catch (err) {
          console.error("Error fetching markdown file:", err);
        }
      }
      fetchMarkdown();
    }, [fileUrl]);

    return (
      <div style={{ minHeight: '600px', border: '1px solid #555', overflow: 'auto', padding: '1rem' }}>
        <ReactMarkdown>{markdownContent}</ReactMarkdown>
      </div>
    );
  }

  // Decide how to preview each file
  const renderPreview = (fileObj) => {
    if (!fileObj) return <p className="text-muted">No file selected</p>;

    const nameLower = fileObj.name.toLowerCase();
    // encodeURIComponent to handle spaces/special chars
    const fileUrl = `http://127.0.0.1:8000/media/${encodeURIComponent(fileObj.name)}`;

    // 1) Images
    if (
      nameLower.endsWith('.png') ||
      nameLower.endsWith('.jpg') ||
      nameLower.endsWith('.jpeg') ||
      nameLower.endsWith('.gif')
    ) {
      return (
        <div style={{ minHeight: '600px', border: '1px solid #555', overflow: 'auto' }}>
          <img
            src={fileUrl}
            alt={fileObj.name}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      );
    }
    // 2) PDFs (large fixed height, scrollable)
    else if (nameLower.endsWith('.pdf')) {
      return (
        <div style={{ minHeight: '600px', border: '1px solid #555', overflow: 'auto' }}>
          <iframe
            src={fileUrl}
            style={{
              display: 'block',
              width: '100%',
              // Force a larger height so it doesn't appear only 20%
              height: '1000px',
              border: 'none'
            }}
            title={fileObj.name}
          />
        </div>
      );
    }
    // 3) STL (3D) with absolute positioning
    else if (nameLower.endsWith('.stl')) {
      return (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '600px',
            border: '1px solid #555',
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
            {/* Light for shadows */}
            <directionalLight
              castShadow
              position={[10, 15, 10]}
              intensity={1}
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <ambientLight intensity={0.3} />

            {/* Ground plane */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -2, 0]}
              receiveShadow
            >
              <planeGeometry args={[50, 50]} />
              <meshStandardMaterial color="#111" />
            </mesh>

            <OrbitControls />

            <Suspense fallback={null}>
              <StlViewer fileUrl={fileUrl} />
            </Suspense>
          </Canvas>
        </div>
      );
    }
    // 4) Code files
    else if (
      nameLower.endsWith('.js') ||
      nameLower.endsWith('.py') ||
      nameLower.endsWith('.cpp') ||
      nameLower.endsWith('.java') ||
      nameLower.endsWith('.ts')
    ) {
      const ext = nameLower.substring(nameLower.lastIndexOf('.'));
      return <CodePreview fileUrl={fileUrl} extension={ext} />;
    }
    // 5) Markdown
    else if (nameLower.endsWith('.md') || nameLower.endsWith('.markdown')) {
      return <MarkdownPreview fileUrl={fileUrl} />;
    }
    // Fallback
    else {
      return (
        <div style={{ minHeight: '600px', border: '1px solid #555', padding: '1rem' }}>
          <p className="text-muted">No preview available</p>
        </div>
      );
    }
  };

  return (
    <Container
      fluid
      style={{
        height: '100vh',
        overflow: 'hidden'
      }}
      className="bg-dark text-light"
    >
      <Row style={{ height: '100%' }}>
        {/* Left Column (30%), scrollable */}
        <Col
          md={3}
          style={{
            height: '100%',
            overflowY: 'auto',
            borderRight: '1px solid #444',
            padding: '1rem'
          }}
        >
          <h4 className="mb-3">Upload File</h4>

          {message && (
            <Alert variant={message.includes('Error') ? 'danger' : 'success'}>
              {message}
            </Alert>
          )}

          <Form onSubmit={handleUpload} className="mb-4">
            <Form.Group controlId="fileUpload">
              <Form.Label className="text-white-50">Select a file</Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                disabled={isLoading}
                required
                className="bg-dark text-light border-secondary"
              />
            </Form.Group>

            <Button
              type="submit"
              variant="outline-light"
              className="mt-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />{' '}
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </Form>

          <h5 className="mb-3">Files List</h5>
          {files.length === 0 ? (
            <p className="text-muted">No files uploaded yet.</p>
          ) : (
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
                {files.map((f) => (
                  <tr key={f.id} onClick={() => handleRowClick(f)}>
                    <td>{f.name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(f.upload_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Col>

        {/* Right Column (70%), scrollable */}
        <Col
          md={9}
          style={{
            height: '100%',
            overflowY: 'auto',
            padding: '1rem'
          }}
        >
          <h4>Preview</h4>
          {renderPreview(selectedFile)}
        </Col>
      </Row>
    </Container>
  );
}

export default App;
