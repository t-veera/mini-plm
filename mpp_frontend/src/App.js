import React, { useState, useRef, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Toast, ToastContainer, Spinner, Form } from 'react-bootstrap';
import { FaPlus, FaUpload, FaEye, FaTable, FaChartLine, FaToriiGate, FaDrumSteelpan, FaDownload } from 'react-icons/fa';

import { AuthProvider, useAuth } from './context/AuthContext';
import SetupWizard from './components/SetupWizard';
import LoginPage from './components/Auth/LoginPage';
import UserMenu from './components/Auth/UserMenu';

import authenticatedFetch from './utils/authenticatedFetch';
import { hybridStorage } from './hybridStorage';
import styles from './constants/styles';
import useIconTheme from './hooks/useIconTheme';

import ResizableColumn from './components/ResizableColumn/ResizableColumn';
import FileList from './components/FileList/FileList';
import BOMViewer from './components/BOMViewer/BOMViewer';
import KPIDashboard from './components/KPIDashboard/KPIDashboard';
import { ConfirmModal, InputModal, MoveModal, QuantityModal, PriceModal, ChangeDescriptionModal } from './components/Modals/Modals';
import Model3DPreview from './components/viewers/Model3DPreview';
import KicadSchematicViewer from './components/viewers/KicadSchematicViewer';
import { CodePreview, MarkdownPreview, CsvPreview, ExcelPreview } from './components/viewers/FilePreviewers';

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function renderPreview(fileObj, handleRevisionChange, handleChildRevisionChange) {
  if (!fileObj) return <p className="text-muted">No file selected</p>;

  const selectedRevision = fileObj.selected_revision_obj || fileObj.latest_revision || fileObj;
  const normalizeUrl = (url) => url ? url.replace(/^https?:\/\/[^/]+/, window.location.origin) : null;
  const serverUrl = normalizeUrl(selectedRevision.uploaded_file) ||
    normalizeUrl(fileObj.uploaded_file) ||
    (fileObj.file_path ? `/media/${fileObj.file_path}` : null) ||
    `/media/uploads/${fileObj.name}`;

  const revisionSelector = (
    <div className="mb-3 d-flex align-items-center">
      <label className="me-2" style={{ minWidth: 'auto', fontSize: '0.9rem' }}>Revision:</label>
      <Form.Select
        size="sm"
        style={{ width: '90px', marginRight: '10px', backgroundColor: styles.colors.dark, color: styles.colors.text.light, border: `1px solid ${styles.colors.border}`, fontSize: '0.8rem' }}
        value={fileObj.current_revision || 1}
        onClick={e => e.stopPropagation()}
        onChange={e => {
          e.stopPropagation();
          const revNum = parseInt(e.target.value, 10);
          if (fileObj.is_child_file) handleChildRevisionChange(fileObj, revNum);
          else handleRevisionChange(fileObj, revNum);
        }}
      >
        {fileObj.revisions?.length > 0
          ? fileObj.revisions.map(rev => <option key={rev.revision_number} value={rev.revision_number}>v {rev.revision_number}.0</option>)
          : <option value={1}>v 1.0</option>}
      </Form.Select>
      {selectedRevision.description && (
        <span className="ms-3 text-light" style={{ fontSize: '0.9rem', borderRadius: '8px', backgroundColor: `${styles.colors.primary}26`, padding: '5px 10px' }}>
          {selectedRevision.description}
        </span>
      )}
      <button
        onClick={() => triggerDownload(serverUrl, fileObj.name)}
        title={`Download ${fileObj.name}`}
        style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'transparent', color: styles.colors.text.muted, border: `1px solid ${styles.colors.border}`, borderRadius: styles.borderRadius.md, padding: '4px 10px', fontSize: styles.fonts.size.sm }}
        onMouseOver={e => { e.currentTarget.style.background = styles.colors.darkAlt; e.currentTarget.style.color = styles.colors.text.light; }}
        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = styles.colors.text.muted; }}
      >
        <FaDownload size={13} /> Download
      </button>
    </div>
  );

  const wrap = (content) => <div style={{ maxWidth: '100%', overflow: 'auto' }}>{revisionSelector}{content}</div>;
  const fileUrl = serverUrl;
  const nameLower = fileObj.name.toLowerCase();

  if (['.png', '.jpg', '.jpeg', '.gif'].some(e => nameLower.endsWith(e)))
    return wrap(<div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'auto' }}><img src={fileUrl} alt={fileObj.name} style={{ maxWidth: '100%', height: 'auto' }} /></div>);

  if (nameLower.endsWith('.pdf'))
    return wrap(<div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', overflow: 'auto' }}><iframe src={fileUrl} style={{ display: 'block', width: '100%', height: '1000px', border: 'none' }} title={fileObj.name} /></div>);

  if (['.kicad_sch', '.sch'].some(e => nameLower.endsWith(e)))
    return wrap(<KicadSchematicViewer key={fileUrl} fileUrl={fileUrl} />);

  if (['.stl', '.dxf', '.stp', '.step'].some(e => nameLower.endsWith(e)))
    return wrap(<Model3DPreview fileUrl={fileUrl} />);

  if (['.js', '.py', '.cpp', '.java', '.ts', '.ino'].some(e => nameLower.endsWith(e))) {
    const ext = nameLower.substring(nameLower.lastIndexOf('.'));
    return wrap(<CodePreview fileUrl={fileUrl} extension={ext} />);
  }

  if (['.md', '.markdown'].some(e => nameLower.endsWith(e)))
    return wrap(<MarkdownPreview key={fileUrl + selectedRevision?.revision_number} fileUrl={fileUrl} />);

  if (nameLower.endsWith('.csv'))
    return wrap(<CsvPreview fileUrl={fileUrl} />);

  if (['.xls', '.xlsx'].some(e => nameLower.endsWith(e)))
    return wrap(<ExcelPreview fileUrl={fileUrl} />);

  const fileSize = fileObj.file_size || fileObj.size || 0;
  const uploadDate = fileObj.created_at || fileObj.upload_date;
  return wrap(
    <div style={{ minHeight: '600px', borderRadius: '8px', border: '1px solid #888', padding: '1rem' }}>
      <p className="text-muted">No preview available for {fileObj.name}</p>
      <p>Size: {(fileSize / 1024).toFixed(2)} KB</p>
      <p>Upload date: {uploadDate ? new Date(uploadDate).toLocaleDateString() : 'Unknown'}</p>
    </div>
  );
}

function ToolbarIcon({ icon, label, onClick, color, active = false }) {
  const base = color || styles.colors.text.muted;
  return (
    <div
      title={label}
      onClick={onClick}
      style={{
        cursor: 'pointer', width: '30px', height: '30px', borderRadius: styles.borderRadius.md,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? styles.colors.text.light : base,
        background: active ? `${styles.colors.primary}33` : 'transparent',
        transition: 'background 0.12s ease, color 0.12s ease',
      }}
      onMouseOver={e => { e.currentTarget.style.background = styles.colors.darkAlt; e.currentTarget.style.color = styles.colors.text.light; }}
      onMouseOut={e => { e.currentTarget.style.background = active ? `${styles.colors.primary}33` : 'transparent'; e.currentTarget.style.color = active ? styles.colors.text.light : base; }}
    >
      <span style={{ pointerEvents: 'none', display: 'inline-flex' }}>{icon}</span>
    </div>
  );
}

function RailButton({ icon, color, number, selected, onClick, onContextMenu, title }) {
  return (
    <div
      title={title}
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        position: 'relative', cursor: 'pointer', width: '36px', height: '36px',
        borderRadius: styles.borderRadius.md, marginBottom: '4px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: selected ? `${color}26` : 'transparent',
        transition: 'background 0.12s ease',
      }}
      onMouseOver={e => { e.currentTarget.style.background = selected ? `${color}26` : styles.colors.darkAlt; }}
      onMouseOut={e => { e.currentTarget.style.background = selected ? `${color}26` : 'transparent'; }}
    >
      <span style={{ color, display: 'inline-flex', pointerEvents: 'none' }}>{icon}</span>
      <span style={{ position: 'absolute', bottom: '1px', right: '3px', color: styles.colors.text.muted, fontSize: '9px', fontWeight: 700, lineHeight: 1, pointerEvents: 'none' }}>{number}</span>
    </div>
  );
}

function MainApp() {
  const [viewMode, setViewMode] = useState('normal');
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProductIndex, setSelectedProductIndex] = useState(() => {
    const idx = localStorage.getItem('phasorSelectedProductIndex');
    return idx ? parseInt(idx, 10) : 0;
  });
  const [needsSetup, setNeedsSetup] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [containerType, setContainerType] = useState(null);
  const [selectedFileObj, setSelectedFileObj] = useState(null);
  const [folderTree, setFolderTree] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: null, fileObj: null, folderObj: null });
  const [parentFileForChild, setParentFileForChild] = useState(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, message: '', onConfirm: null, onCancel: null });
  const [moveModal, setMoveModal] = useState({ visible: false, fileToMove: null, containers: [], selected: '' });
  const [inputModal, setInputModal] = useState({ visible: false, title: '', placeholder: '', value: '', onConfirm: null, onCancel: null });
  const [showChangeDescriptionModal, setShowChangeDescriptionModal] = useState(false);
  const [currentFileForModal, setCurrentFileForModal] = useState(null);
  const [tempChangeDescription, setTempChangeDescription] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const { activeTheme, setActiveTheme } = useIconTheme();

  const hiddenFileInput = useRef(null);
  const contextMenuFileInput = useRef(null);
  const childFileInput = useRef(null);
  const uploadTargetFolderRef = useRef(null); // when set, next upload lands in this folder

  const prod = products[selectedProductIndex] || {};

  useEffect(() => {
    const checkSetupAndLoadData = async () => {
      setIsLoading(true);
      try {
        const setupResponse = await authenticatedFetch('/api/initial-setup/');
        const setupData = await setupResponse.json();
        if (setupData.needs_setup) { setNeedsSetup(true); setIsLoading(false); return; }
        setNeedsSetup(false);
        const response = await authenticatedFetch('/api/products/');
        if (response.ok) {
          const backendProducts = await response.json();
          const enriched = backendProducts.map(p => ({ ...p, selectedContainer: null, containerType: null, filesByContainer: p.filesByContainer || {} }));
          setProducts(enriched);
          if (enriched.length > 0) setSelectedProductIndex(0);
        } else {
          const loaded = await hybridStorage.loadProducts();
          setProducts(loaded);
        }
      } catch (error) {
        console.error('Failed to load:', error);
        setNeedsSetup(false);
        setProducts([{ id: 1, name: 'Sample Product', stages: [], iterations: [], selectedContainer: null, containerType: null, filesByContainer: {} }]);
      } finally {
        setIsLoading(false);
      }
    };
    checkSetupAndLoadData();
  }, []);

  useEffect(() => {
    if (!products.length || isLoading) return;
    const id = setTimeout(() => hybridStorage.saveProducts(products).catch(console.error), 1000);
    return () => clearTimeout(id);
  }, [products, isLoading]);

  useEffect(() => {
    localStorage.setItem('phasorSelectedProductIndex', selectedProductIndex.toString());
  }, [selectedProductIndex]);

  // Load the product-scoped folder tree whenever the selected product changes.
  const currentProductId = products[selectedProductIndex]?.id;
  useEffect(() => {
    if (!currentProductId) { setFolderTree([]); return; }
    setCurrentFolderId(null);
    loadFolderTree(currentProductId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProductId]);

  useEffect(() => {
    function handleClick() { if (contextMenu.visible) hideContextMenu(); }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      * { max-width: 100% !important; box-sizing: border-box !important; font-family: ${styles.fonts.family} !important; }
      .excel-scroll-container, .excel-scroll-container * { max-width: none !important; overflow-x: auto !important; }
      body, html { overflow-x: hidden !important; width: 100% !important; max-width: 100vw !important; background-color: ${styles.colors.dark} !important; color: ${styles.colors.text.light} !important; }
      .container-fluid { padding-left: 0 !important; padding-right: 0 !important; }
      .table { font-size: ${styles.fonts.size.sm} !important; cursor: pointer !important; background-color: ${styles.colors.dark} !important; color: ${styles.colors.text.light} !important; }
      .table th, .table td { background-color: ${styles.colors.dark} !important; border-color: ${styles.colors.border} !important; }
      .form-control, .form-select { background-color: ${styles.colors.darkAlt} !important; color: ${styles.colors.text.light} !important; border: 1px solid ${styles.colors.border} !important; }
      .product-select { background-color: transparent !important; border: none !important; box-shadow: none !important; }
      .product-select:hover { background-color: ${styles.colors.darkAlt} !important; }
      .rev-select { color: ${styles.colors.text.muted} !important; background-color: transparent !important; border: 1px solid ${styles.colors.border} !important; }
      .rev-select:hover { color: ${styles.colors.text.light} !important; background-color: ${styles.colors.darkAlt} !important; }
      .selected-file-row td { background-color: ${styles.colors.primary}26 !important; }
      .context-menu-item:hover { background-color: ${styles.colors.darkAlt} !important; }
      .table-dark { background-color: ${styles.colors.dark} !important; color: ${styles.colors.text.light} !important; }
      .bg-dark { background-color: ${styles.colors.dark} !important; }
      select { appearance: none !important; -webkit-appearance: none !important; -moz-appearance: none !important; background-image: none !important; }
    `;
    document.head.appendChild(styleTag);
    return () => document.head.removeChild(styleTag);
  }, []);

  function showConfirm(message) {
    return new Promise(resolve => {
      setConfirmModal({
        visible: true, message,
        onConfirm: () => { setConfirmModal({ visible: false, message: '', onConfirm: null, onCancel: null }); resolve(true); },
        onCancel:  () => { setConfirmModal({ visible: false, message: '', onConfirm: null, onCancel: null }); resolve(false); }
      });
    });
  }

  function showInputModal(title, placeholder, initialValue = '') {
    return new Promise(resolve => {
      setInputModal({ visible: true, title, placeholder, value: initialValue,
        onConfirm: val => { setInputModal({ visible: false, title: '', placeholder: '', value: '', onConfirm: null, onCancel: null }); resolve(val || null); },
        onCancel:  ()  => { setInputModal({ visible: false, title: '', placeholder: '', value: '', onConfirm: null, onCancel: null }); resolve(null); }
      });
    });
  }

  function hideContextMenu() { setContextMenu({ visible: false, x: 0, y: 0, type: null, fileObj: null, folderObj: null }); }

  function getCurrentContainerIdFromFile(fileObj) {
    const p = products[selectedProductIndex];
    if (fileObj.container_type === 'stage') {
      const stage = p.stages?.find(s => s.stage_id === fileObj.container_id);
      return stage ? stage.id : fileObj.container_id;
    } else if (fileObj.container_type === 'iteration') {
      const iter = p.iterations?.find(i => i.iteration_id === fileObj.container_id);
      return iter ? iter.id : fileObj.container_id;
    }
    return fileObj.container_id;
  }

  function updateFile(fileId, updates) {
    const updatedProducts = [...products];
    const updatedProduct = { ...updatedProducts[selectedProductIndex] };
    updatedProducts[selectedProductIndex] = updatedProduct;
    updatedProduct.filesByContainer = { ...updatedProduct.filesByContainer };
    let foundFile = null, containerKey = null, fileIndex = -1;
    Object.keys(updatedProduct.filesByContainer).forEach(key => {
      const idx = updatedProduct.filesByContainer[key].findIndex(f => f.id === fileId);
      if (idx !== -1) { foundFile = updatedProduct.filesByContainer[key][idx]; containerKey = key; fileIndex = idx; }
    });
    if (!foundFile) return;
    updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];
    const updatedFile = { ...foundFile, ...updates };
    updatedProduct.filesByContainer[containerKey][fileIndex] = updatedFile;
    setProducts(updatedProducts);
    if (selectedFileObj?.id === fileId) setSelectedFileObj(updatedFile);
    hybridStorage.saveProducts(updatedProducts).catch(console.error);
  }

  async function handleCreateProduct() {
    const prodName = await showInputModal('New Product', 'Enter product name');
    if (!prodName) return;
    try {
      const response = await authenticatedFetch('/api/products/', { method: 'POST', body: JSON.stringify({ name: prodName, description: '' }) });
      if (!response.ok) throw new Error(response.statusText);
      const newProduct = await response.json();
      const newProd = { ...newProduct, selectedContainer: null, containerType: null, filesByContainer: {} };
      const updated = [...products, newProd];
      setProducts(updated);
      setSelectedProductIndex(products.length);
      setSelectedContainer(null);
      setContainerType(null);
      setSelectedFileObj(null);
      hybridStorage.saveProducts(updated).catch(console.error);
    } catch (error) { alert(`Failed to create product: ${error.message}`); }
  }

  function handleSelectProduct(e) {
    const index = parseInt(e.target.value, 10);
    setSelectedProductIndex(index);
    setSelectedFileObj(null);
    setSelectedContainer(null);
    setContainerType(null);
    if (products[index]?.id) loadProductDetails(products[index].id, index);
  }

  async function loadProductDetails(productId, targetIndex = null) {
    try {
      const response = await authenticatedFetch(`/api/products/${productId}/`);
      if (response.ok) {
        const productData = await response.json();
        const idx = targetIndex !== null ? targetIndex : selectedProductIndex;
        setProducts(prev => prev.map((p, i) => i === idx ? { ...p, stages: productData.stages || [], iterations: productData.iterations || [] } : p));
      }
    } catch (error) { console.error('Failed to load product details:', error); }
  }

  async function handleAddStage() {
    const currentProduct = products[selectedProductIndex];
    if (!currentProduct?.id) { alert('Select a product first'); return; }
    try {
      const response = await authenticatedFetch('/api/stages/', { method: 'POST', body: JSON.stringify({ product: currentProduct.id, name: `Stage ${(currentProduct.stages?.length || 0) + 1}`, type: 'workflow', color: '#007bff' }) });
      if (!response.ok) throw new Error(await response.text());
      const newStage = await response.json();
      const updated = [...products];
      const updatedProd = { ...updated[selectedProductIndex] };
      updatedProd.stages = [...(updatedProd.stages || []), newStage];
      updatedProd.filesByContainer = { ...updatedProd.filesByContainer, [`stage_${newStage.id}`]: [] };
      updatedProd.selectedContainer = newStage;
      updatedProd.containerType = 'stage';
      updated[selectedProductIndex] = updatedProd;
      setProducts(updated);
      setSelectedContainer(newStage);
      setContainerType('stage');
      setSelectedFileObj(null);
      hybridStorage.saveProducts(updated).catch(console.error);
    } catch (error) { alert(`Failed to create stage: ${error.message}`); }
  }

  async function handleAddIteration() {
    const currentProduct = products[selectedProductIndex];
    if (!currentProduct?.id) { alert('Select a product first'); return; }
    try {
      const response = await authenticatedFetch('/api/iterations/', { method: 'POST', body: JSON.stringify({ product: currentProduct.id, name: `Iteration ${(currentProduct.iterations?.length || 0) + 1}`, type: 'design', color: '#28a745' }) });
      if (!response.ok) throw new Error(await response.text());
      const newIteration = await response.json();
      const updated = [...products];
      const updatedProd = { ...updated[selectedProductIndex] };
      updatedProd.iterations = [...(updatedProd.iterations || []), newIteration];
      updatedProd.filesByContainer = { ...updatedProd.filesByContainer, [`iteration_${newIteration.id}`]: [] };
      updatedProd.selectedContainer = newIteration;
      updatedProd.containerType = 'iteration';
      updated[selectedProductIndex] = updatedProd;
      setProducts(updated);
      setSelectedContainer(newIteration);
      setContainerType('iteration');
      setSelectedFileObj(null);
      hybridStorage.saveProducts(updated).catch(console.error);
    } catch (error) { alert(`Failed to create iteration: ${error.message}`); }
  }

  function handleContainerClick(container, type) {
    const updated = [...products];
    updated[selectedProductIndex] = { ...updated[selectedProductIndex], selectedContainer: container, containerType: type, filesByContainer: updated[selectedProductIndex].filesByContainer || {} };
    setProducts(updated);
    setSelectedContainer(container);
    setContainerType(type);
    setSelectedFileObj(null);
    loadContainerFiles(container, type);
  }

  async function loadContainerFiles(container, type) {
    try {
      const containerKey = `${type}_${container.id}`;
      const currentProduct = products[selectedProductIndex];
      if (currentProduct.filesByContainer?.[containerKey]?.length > 0) return;
      const endpoint = type === 'stage' ? `/api/stages/${container.id}/files/` : `/api/iterations/${container.id}/files/`;
      const response = await authenticatedFetch(endpoint);
      if (response.ok) {
        const files = await response.json();
        setProducts(prev => {
          const updated = [...prev];
          updated[selectedProductIndex] = { ...updated[selectedProductIndex], filesByContainer: { ...updated[selectedProductIndex].filesByContainer, [containerKey]: files } };
          return updated;
        });
      }
    } catch (error) { console.error(`Failed to load ${type} files:`, error); }
  }

  async function loadFolderTree(productId) {
    setFoldersLoading(true);
    try {
      const response = await authenticatedFetch(`/api/products/${productId}/folders/`);
      if (response.ok) setFolderTree(await response.json());
      else setFolderTree([]);
    } catch (error) {
      console.error('Failed to load folder tree:', error);
      setFolderTree([]);
    } finally {
      setFoldersLoading(false);
    }
  }

  async function handleCreateFolder(parentId, name) {
    const productId = products[selectedProductIndex]?.id;
    if (!productId) { setToastMsg('Select a product first!'); return; }
    try {
      const response = await authenticatedFetch('/api/folders/', { method: 'POST', body: JSON.stringify({ name, parent: parentId, product: productId }) });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || 'Create failed'); }
      await loadFolderTree(productId);
      setToastMsg(`Folder "${name}" created`);
    } catch (error) { setToastMsg(`Failed to create folder: ${error.message}`); }
  }

  async function handleRenameFolder(folderId, name) {
    const productId = products[selectedProductIndex]?.id;
    try {
      const response = await authenticatedFetch(`/api/folders/${folderId}/`, { method: 'PATCH', body: JSON.stringify({ name }) });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || 'Rename failed'); }
      await loadFolderTree(productId);
      setToastMsg('Folder renamed');
    } catch (error) { setToastMsg(`Failed to rename folder: ${error.message}`); }
  }

  async function handleDeleteFolder(folder) {
    const productId = products[selectedProductIndex]?.id;
    if (!await showConfirm(`Delete folder "${folder.name}"? It must be empty first.`)) return;
    try {
      const response = await authenticatedFetch(`/api/folders/${folder.id}/`, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || 'Delete failed'); }
      if (currentFolderId === folder.id) setCurrentFolderId(folder.parent ?? null);
      await loadFolderTree(productId);
      setToastMsg(`Folder "${folder.name}" deleted`);
    } catch (error) { setToastMsg(error.message); }
  }

  function handleUploadToFolder(folder) {
    hideContextMenu();
    if (!prod.selectedContainer || !prod.containerType) { setToastMsg('Select a Stage or Iteration first!'); return; }
    uploadTargetFolderRef.current = folder.id;
    setCurrentFolderId(folder.id); // open the folder so the uploaded file is visible
    setTimeout(() => hiddenFileInput.current?.click(), 0);
  }

  async function handleFolderNewSubfolder(folder) {
    hideContextMenu();
    const name = await showInputModal('New Subfolder', `Subfolder of "${folder.name}"`);
    if (!name) return;
    await handleCreateFolder(folder.id, name);
  }

  async function handleBackgroundNewFolder() {
    hideContextMenu();
    const name = await showInputModal('New Folder', 'Enter folder name');
    if (!name) return;
    await handleCreateFolder(currentFolderId, name);
  }

  async function handleFolderRenamePrompt(folder) {
    hideContextMenu();
    const name = await showInputModal('Rename Folder', 'Enter new name', folder.name);
    if (!name || name === folder.name) return;
    await handleRenameFolder(folder.id, name);
  }

  async function handleMoveFileToFolder(fileId, folderId) {
    const productId = products[selectedProductIndex]?.id;
    try {
      const response = await authenticatedFetch(`/api/files/${fileId}/`, { method: 'PATCH', body: JSON.stringify({ folder: folderId }) });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || (Array.isArray(err) ? err[0] : 'Move failed')); }
      // Update the file's folder locally so it reflects immediately.
      setProducts(prev => {
        const updated = [...prev];
        const updatedProd = { ...updated[selectedProductIndex], filesByContainer: { ...updated[selectedProductIndex].filesByContainer } };
        Object.keys(updatedProd.filesByContainer).forEach(key => {
          updatedProd.filesByContainer[key] = updatedProd.filesByContainer[key].map(f => f.id === fileId ? { ...f, folder: folderId } : f);
        });
        updated[selectedProductIndex] = updatedProd;
        return updated;
      });
      if (selectedFileObj?.id === fileId) setSelectedFileObj(prev => ({ ...prev, folder: folderId }));
      if (productId) loadFolderTree(productId);
      setToastMsg(folderId ? 'File moved into folder' : 'File moved to root');
    } catch (error) { setToastMsg(`Move failed: ${error.message}`); }
  }

  async function handleMoveFolder(folderId, newParentId) {
    const productId = products[selectedProductIndex]?.id;
    try {
      const response = await authenticatedFetch(`/api/folders/${folderId}/`, { method: 'PATCH', body: JSON.stringify({ parent: newParentId }) });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err.error || (err.non_field_errors ? err.non_field_errors[0] : (Array.isArray(err) ? err[0] : 'Move failed'));
        throw new Error(msg);
      }
      if (productId) await loadFolderTree(productId);
      setToastMsg('Folder moved');
    } catch (error) { setToastMsg(error.message); }
  }

  function getFileDownloadUrl(fileObj) {
    if (!fileObj) return null;
    const normalizeUrl = (url) => url ? url.replace(/^https?:\/\/[^/]+/, window.location.origin) : null;
    const rev = fileObj.selected_revision_obj || fileObj.latest_revision;
    return normalizeUrl(rev?.uploaded_file) || normalizeUrl(fileObj.uploaded_file) || (fileObj.file_path ? `/media/${fileObj.file_path}` : null);
  }

  function handleDownloadFile(fileObj) {
    const url = getFileDownloadUrl(fileObj);
    if (!url) { setToastMsg('No file available to download'); return; }
    triggerDownload(url, fileObj.name);
  }

  function handleDownloadOption() {
    if (contextMenu.fileObj) handleDownloadFile(contextMenu.fileObj);
    hideContextMenu();
  }

  function handleDownloadFolder(folder) {
    hideContextMenu();
    if (!prod.selectedContainer || !prod.containerType) { setToastMsg('Select a Stage or Iteration first!'); return; }
    const url = `/api/folders/${folder.id}/download/?container_type=${prod.containerType}&container_id=${prod.selectedContainer.id}`;
    triggerDownload(url, `${folder.name}.zip`);
  }

  async function handleContainerRightClick(e, container, type) {
    e.preventDefault();
    const containerKey = `${type}_${container.id}`;
    const fileList = prod.filesByContainer[containerKey] || [];
    if (fileList.length > 0) { setToastMsg(`Cannot delete a ${type} with files!`); return; }
    const containerLabel = type === 'stage' ? container.stage_id : container.iteration_id;
    if (!await showConfirm(`Delete ${containerLabel}? It's empty and will be removed.`)) return;
    try {
      const endpoint = type === 'stage' ? `/api/stages/${container.id}/` : `/api/iterations/${container.id}/`;
      const response = await authenticatedFetch(endpoint, { method: 'DELETE' });
      if (!response.ok) throw new Error(response.statusText);
      const updated = [...products];
      const updatedProd = { ...updated[selectedProductIndex] };
      if (type === 'stage') updatedProd.stages = updatedProd.stages.filter(s => s.id !== container.id);
      else updatedProd.iterations = updatedProd.iterations.filter(i => i.id !== container.id);
      updatedProd.filesByContainer = { ...updatedProd.filesByContainer };
      delete updatedProd.filesByContainer[containerKey];
      if (updatedProd.selectedContainer?.id === container.id) { updatedProd.selectedContainer = null; updatedProd.containerType = null; setSelectedContainer(null); setContainerType(null); }
      updated[selectedProductIndex] = updatedProd;
      setProducts(updated);
      setSelectedFileObj(null);
      hybridStorage.saveProducts(updated).catch(console.error);
      setToastMsg(`${type} "${containerLabel}" deleted`);
    } catch (error) { setToastMsg(`Failed to delete ${type}: ${error.message}`); }
  }

  function handlePlusClick() {
    if (!prod.selectedContainer || !prod.containerType) { setToastMsg('Please select a Stage or Iteration first!'); return; }
    uploadTargetFolderRef.current = currentFolderId; // toolbar upload lands in the selected folder (or root)
    hiddenFileInput.current.click();
  }

  function handleBackgroundUpload() {
    hideContextMenu();
    if (!prod.selectedContainer || !prod.containerType) { setToastMsg('Please select a Stage or Iteration first!'); return; }
    uploadTargetFolderRef.current = null; // background upload lands at root
    hiddenFileInput.current.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) { e.target.value = ''; return; }
    if (!prod.selectedContainer || !prod.containerType) { setToastMsg('No container selected.'); e.target.value = ''; return; }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('uploaded_file', file);
      formData.append('original_name', file.name);
      formData.append('is_child_file', 'false');
      if (prod.containerType === 'stage') formData.append('stage_id', prod.selectedContainer.id);
      else formData.append('iteration_id', prod.selectedContainer.id);
      // Each upload trigger sets the target folder explicitly (null = container root).
      const targetFolderId = uploadTargetFolderRef.current;
      if (targetFolderId) formData.append('folder', targetFolderId);
      formData.append('change_description', 'Initial file upload');
      formData.append('status', 'in_work');
      formData.append('quantity', '1');
      const response = await authenticatedFetch('/api/files/', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(response.statusText);
      const savedFile = await response.json();
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      const containerKey = `${prod.containerType}_${prod.selectedContainer.id}`;
      setProducts(prev => {
        const updated = [...prev];
        const updatedProd = { ...updated[selectedProductIndex], filesByContainer: { ...updated[selectedProductIndex].filesByContainer } };
        const existing = [...(updatedProd.filesByContainer[containerKey] || [])];
        const existingIdx = existing.findIndex(f => f.name === file.name && !f.is_child_file);
        if (existingIdx !== -1 && savedFile.current_revision > 1) existing[existingIdx] = { ...existing[existingIdx], ...savedFile, dataUrl };
        else existing.push({ ...savedFile, dataUrl });
        updatedProd.filesByContainer[containerKey] = existing;
        updated[selectedProductIndex] = updatedProd;
        return updated;
      });
      setSelectedFileObj({ ...savedFile, dataUrl });
      if (targetFolderId && prod.id) loadFolderTree(prod.id);
      setToastMsg(savedFile.current_revision > 1 ? `Rev ${savedFile.current_revision} created!` : 'File uploaded!');
      setTimeout(() => { setCurrentFileForModal({ ...savedFile, dataUrl }); setTempChangeDescription(''); setShowChangeDescriptionModal(true); }, 100);
    } catch (err) { setToastMsg(`Upload error: ${err.message}`); }
    finally { setIsLoading(false); e.target.value = ''; uploadTargetFolderRef.current = null; }
  }

  async function handleContextMenuFileChange(e) {
    const file = e.target.files[0];
    if (!file || !currentFileForModal) { e.target.value = ''; return; }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('uploaded_file', file);
      formData.append('original_name', currentFileForModal.name);
      formData.append('is_child_file', currentFileForModal.is_child_file ? 'true' : 'false');
      if (prod.containerType === 'stage') formData.append('stage_id', prod.selectedContainer.id);
      else formData.append('iteration_id', prod.selectedContainer.id);
      formData.append('change_description', 'File revision from context menu');
      if (currentFileForModal.is_child_file && currentFileForModal.parent_file) formData.append('parent_id', currentFileForModal.parent_file);
      const response = await authenticatedFetch('/api/files/', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(response.statusText);
      const savedFile = await response.json();
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      const containerKey = `${currentFileForModal.container_type}_${currentFileForModal.container_db_id}`;
      setProducts(prev => {
        const updated = [...prev];
        const updatedProd = { ...updated[selectedProductIndex], filesByContainer: { ...updated[selectedProductIndex].filesByContainer } };
        const files = [...(updatedProd.filesByContainer[containerKey] || [])];
        const idx = files.findIndex(f => f.id === currentFileForModal.id);
        if (idx !== -1) files[idx] = { ...files[idx], ...savedFile, dataUrl, created_at: new Date().toISOString() };
        updatedProd.filesByContainer[containerKey] = files;
        updated[selectedProductIndex] = updatedProd;
        return updated;
      });
      setToastMsg(`Rev ${savedFile.current_revision} created`);
      setTimeout(() => { setCurrentFileForModal({ ...savedFile, dataUrl }); setTempChangeDescription(''); setShowChangeDescriptionModal(true); }, 100);
    } catch (err) { setToastMsg(`Revision error: ${err.message}`); }
    finally { setIsLoading(false); e.target.value = ''; setCurrentFileForModal(null); }
  }

  async function handleChildFileChange(e) {
    const file = e.target.files[0];
    if (!file || !parentFileForChild) { e.target.value = ''; return; }
    if (!prod.selectedContainer || !prod.containerType) { setToastMsg('No container selected.'); e.target.value = ''; return; }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('uploaded_file', file);
      formData.append('original_name', file.name);
      formData.append('is_child_file', 'true');
      formData.append('parent_id', parentFileForChild.id);
      if (prod.containerType === 'stage') formData.append('stage_id', prod.selectedContainer.id);
      else formData.append('iteration_id', prod.selectedContainer.id);
      formData.append('change_description', 'Initial child file upload');
      const response = await authenticatedFetch('/api/files/', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(response.statusText);
      const savedChildFile = await response.json();
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      const childFileObj = { ...savedChildFile, dataUrl };
      const containerKey = `${prod.containerType}_${prod.selectedContainer.id}`;
      setProducts(prev => {
        const updated = [...prev];
        const updatedProd = { ...updated[selectedProductIndex], filesByContainer: { ...updated[selectedProductIndex].filesByContainer } };
        const files = [...(updatedProd.filesByContainer[containerKey] || []), childFileObj];
        const parentIdx = files.findIndex(f => f.id === parentFileForChild.id && !f.is_child_file);
        if (parentIdx !== -1) files[parentIdx] = { ...files[parentIdx], child_files: [...(files[parentIdx].child_files || []), childFileObj] };
        updatedProd.filesByContainer[containerKey] = files;
        updated[selectedProductIndex] = updatedProd;
        return updated;
      });
      setSelectedFileObj(childFileObj);
      setToastMsg(`Child file "${file.name}" added`);
      setTimeout(() => { setCurrentFileForModal(childFileObj); setTempChangeDescription(''); setShowChangeDescriptionModal(true); }, 100);
    } catch (err) { setToastMsg(`Child upload error: ${err.message}`); }
    finally { setIsLoading(false); e.target.value = ''; setParentFileForChild(null); }
  }

  function handleRevisionChange(fileObj, revisionNumber) {
    const revision = fileObj.revisions?.find(r => r.revision_number === revisionNumber);
    if (!revision) return;
    const containerKey = `${fileObj.container_type}_${fileObj.container_db_id}`;
    setProducts(prev => {
      const updated = [...prev];
      const updatedProd = { ...updated[selectedProductIndex], filesByContainer: { ...updated[selectedProductIndex].filesByContainer } };
      const files = [...(updatedProd.filesByContainer[containerKey] || [])];
      const idx = files.findIndex(f => f.id === fileObj.id);
      if (idx !== -1) files[idx] = { ...files[idx], current_revision: revisionNumber, selected_revision_obj: revision };
      updatedProd.filesByContainer[containerKey] = files;
      updated[selectedProductIndex] = updatedProd;
      return updated;
    });
    setSelectedFileObj(prev => prev?.id === fileObj.id ? { ...prev, current_revision: revisionNumber, selected_revision_obj: revision } : prev);
  }

  function handleChildRevisionChange(childFileObj, revisionNumber) {
    handleRevisionChange(childFileObj, revisionNumber);
  }

  function handleFileRightClick(e, fileObj) { e.preventDefault(); e.stopPropagation(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY + 10, type: 'file', fileObj, folderObj: null }); }
  function handleFolderRightClick(e, folder) { e.preventDefault(); e.stopPropagation(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY + 10, type: 'folder', fileObj: null, folderObj: folder }); }
  function handleBackgroundRightClick(e) { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY + 10, type: 'background', fileObj: null, folderObj: null }); }
  function handleContextMenuUpload() { if (contextMenu.fileObj) { setCurrentFileForModal(contextMenu.fileObj); contextMenuFileInput.current.click(); } hideContextMenu(); }
  function handleQuantityOption() { if (contextMenu.fileObj) { setCurrentFileForModal(contextMenu.fileObj); setShowQuantityModal(true); } hideContextMenu(); }
  function handlePriceOption() { if (contextMenu.fileObj) { setCurrentFileForModal(contextMenu.fileObj); setShowPriceModal(true); } hideContextMenu(); }

  async function handleMoveOption() {
    if (!contextMenu.fileObj) { hideContextMenu(); return; }
    const fileToMove = contextMenu.fileObj;
    hideContextMenu();
    const allContainers = [
      ...(prod.stages || []).map(s => ({ id: s.id, label: s.stage_id, name: s.name, type: 'stage' })),
      ...(prod.iterations || []).map(i => ({ id: i.id, label: i.iteration_id, name: i.name, type: 'iteration' }))
    ];
    if (!allContainers.length) { setToastMsg('No containers available!'); return; }
    const targetLabel = await showInputModal(`Move "${fileToMove.name}"`, `Available: ${allContainers.map(c => c.label).join(', ')}`);
    if (!targetLabel) return;
    const targetContainer = allContainers.find(c => c.label.toLowerCase() === targetLabel.toLowerCase());
    if (!targetContainer) { setToastMsg(`Container ${targetLabel} not found`); return; }
    try {
      const updateData = targetContainer.type === 'stage' ? { stage_id: targetContainer.id } : { iteration_id: targetContainer.id };
      const response = await authenticatedFetch(`/api/files/${fileToMove.id}/`, { method: 'PATCH', body: JSON.stringify(updateData) });
      if (!response.ok) throw new Error(response.statusText);
      setToastMsg(`File moved to ${targetContainer.label}`);
    } catch (error) { setToastMsg(`Move failed: ${error.message}`); }
  }

  async function handleMoveConfirm() {
    const { fileToMove, selected } = moveModal;
    setMoveModal({ visible: false, fileToMove: null, containers: [], selected: '' });
    const allContainers = [
      ...(prod.stages || []).map(s => ({ id: s.id, label: s.stage_id, name: s.name, type: 'stage' })),
      ...(prod.iterations || []).map(i => ({ id: i.id, label: i.iteration_id, name: i.name, type: 'iteration' }))
    ];
    const target = allContainers.find(c => c.label.toLowerCase() === selected.toLowerCase());
    if (!target) { setToastMsg(`Container ${selected} not found`); return; }
    try {
      const updateData = target.type === 'stage' ? { stage_id: target.id } : { iteration_id: target.id };
      const response = await authenticatedFetch(`/api/files/${fileToMove.id}/`, { method: 'PATCH', body: JSON.stringify(updateData) });
      if (!response.ok) throw new Error('Move failed');
      setToastMsg(`Moved to ${target.label}`);
    } catch (error) { setToastMsg(`Move failed: ${error.message}`); }
  }

  async function handleRemoveOption() {
    if (!contextMenu.fileObj) { hideContextMenu(); return; }
    const fileToRemove = contextMenu.fileObj;
    const msg = fileToRemove.is_child_file ? `Remove "${fileToRemove.name}"?` : `Remove "${fileToRemove.name}" and all child files?`;
    if (!await showConfirm(msg)) { hideContextMenu(); return; }
    try {
      const ids = [fileToRemove.id, ...(!fileToRemove.is_child_file && fileToRemove.child_files ? fileToRemove.child_files.map(c => c.id) : [])];
      await Promise.all(ids.map(id => authenticatedFetch(`/api/files/${id}/`, { method: 'DELETE' })));
      const containerKey = `${fileToRemove.container_type}_${getCurrentContainerIdFromFile(fileToRemove)}`;
      setProducts(prev => {
        const updated = [...prev];
        const updatedProd = { ...updated[selectedProductIndex], filesByContainer: { ...updated[selectedProductIndex].filesByContainer } };
        updatedProd.filesByContainer[containerKey] = (updatedProd.filesByContainer[containerKey] || []).filter(f => !ids.includes(f.id));
        updated[selectedProductIndex] = updatedProd;
        return updated;
      });
      if (selectedFileObj && ids.includes(selectedFileObj.id)) setSelectedFileObj(null);
      setToastMsg('File removed');
    } catch (error) { setToastMsg(`Remove failed: ${error.message}`); }
    hideContextMenu();
  }

  function handleAddChildClick(e, fileObj) {
    e.stopPropagation(); e.preventDefault();
    if (fileObj.is_child_file) { setToastMsg('Child files cannot have children'); return; }
    setParentFileForChild(fileObj);
    setTimeout(() => childFileInput.current?.click(), 0);
  }

  function handleQuantityClick(e, fileObj) { e.stopPropagation(); setCurrentFileForModal(fileObj); setShowQuantityModal(true); }
  function handlePriceClick(e, fileObj) { e.stopPropagation(); setCurrentFileForModal(fileObj); setShowPriceModal(true); }

  async function handleQuantityUpdate(quantity) {
    if (!currentFileForModal) return;
    try {
      const response = await authenticatedFetch(`/api/files/${currentFileForModal.id}/`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
      if (!response.ok) throw new Error(response.statusText);
      const updatedFile = await response.json();
      updateFile(currentFileForModal.id, updatedFile);
      setToastMsg(`Quantity updated to ${quantity}`);
      setShowQuantityModal(false); setCurrentFileForModal(null);
    } catch (error) { setToastMsg(`Quantity update failed: ${error.message}`); }
  }

  async function handlePriceUpdate(price) {
    if (!currentFileForModal) return;
    try {
      const response = await authenticatedFetch(`/api/files/${currentFileForModal.id}/`, { method: 'PATCH', body: JSON.stringify({ price: parseFloat(price) }) });
      if (!response.ok) throw new Error(response.statusText);
      const updatedFile = await response.json();
      updateFile(currentFileForModal.id, updatedFile);
      setToastMsg(`Price updated to ₹${parseFloat(price).toFixed(2)}`);
      setShowPriceModal(false); setCurrentFileForModal(null);
    } catch (error) { setToastMsg(`Price update failed: ${error.message}`); }
  }

  async function handleChangeDescriptionUpdate(description) {
    if (!currentFileForModal) { setShowChangeDescriptionModal(false); return; }
    try {
      const latestRevision = currentFileForModal.latest_revision;
      if (!latestRevision) throw new Error('No latest revision found');
      const response = await authenticatedFetch(`/api/file-revisions/${latestRevision.id}/`, { method: 'PATCH', body: JSON.stringify({ description }) });
      if (!response.ok) throw new Error(response.statusText);
      updateFile(currentFileForModal.id, { latest_revision: { ...latestRevision, description } });
      setToastMsg('Description updated');
    } catch (error) { setToastMsg(`Description update failed: ${error.message}`); }
    finally { setShowChangeDescriptionModal(false); setCurrentFileForModal(null); }
  }

  if (needsSetup === true) {
    return <SetupWizard onSetupComplete={() => { setNeedsSetup(false); window.location.reload(); }} />;
  }

  const normalizedProd = {
    ...prod,
    selectedContainer: prod.selectedContainer || null,
    containerType: prod.containerType || null,
    filesByContainer: prod.filesByContainer || {}
  };

  const fileBrowser = (
    <>
      <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${styles.colors.border}`, gap: '8px' }}>
        <div className="d-flex align-items-center" style={{ gap: '2px', minWidth: 0 }}>
          <Form.Select
            size="sm"
            value={selectedProductIndex}
            onChange={handleSelectProduct}
            className="shadow-none product-select"
            style={{ width: 'auto', maxWidth: '170px', color: styles.colors.text.light, fontSize: styles.fonts.size.sm, fontWeight: 600, letterSpacing: '0.3px', paddingLeft: '4px', borderRadius: styles.borderRadius.md, cursor: 'pointer', textOverflow: 'ellipsis' }}
          >
            {products.map((p, idx) => <option key={idx} value={idx} style={{ background: styles.colors.dark, fontWeight: 400 }}>{p.name.toUpperCase()}</option>)}
          </Form.Select>
          <ToolbarIcon label="New product" onClick={handleCreateProduct} icon={<FaPlus size={13} />} />
        </div>
        <div className="d-flex align-items-center" style={{ gap: '1px' }}>
          <ToolbarIcon label="Add iteration" onClick={handleAddIteration} color={styles.colors.iteration} icon={<FaDrumSteelpan size={16} />} />
          <ToolbarIcon label="Add stage" onClick={handleAddStage} color={styles.colors.stage} icon={<FaToriiGate size={16} />} />
          <ToolbarIcon label="Upload file" onClick={handlePlusClick} icon={<FaUpload size={15} />} />
          <div style={{ width: '1px', height: '18px', background: styles.colors.border, margin: '0 5px' }} />
          <ToolbarIcon label="Files" onClick={() => setViewMode('normal')} active={viewMode === 'normal'} icon={<FaEye size={16} />} />
          <ToolbarIcon label="BOM" onClick={() => setViewMode('bom')} active={viewMode === 'bom'} icon={<FaTable size={15} />} />
          <ToolbarIcon label="KPIs" onClick={() => setViewMode('kpi')} active={viewMode === 'kpi'} icon={<FaChartLine size={15} />} />
        </div>
      </div>

      {viewMode === 'normal' && (
        <FileList
          prod={normalizedProd}
          folderTree={folderTree}
          foldersLoading={foldersLoading}
          currentFolderId={currentFolderId}
          setCurrentFolderId={setCurrentFolderId}
          selectedFileObj={selectedFileObj}
          setSelectedFileObj={setSelectedFileObj}
          contextMenu={contextMenu}
          onFileRightClick={handleFileRightClick}
          onFolderRightClick={handleFolderRightClick}
          onBackgroundRightClick={handleBackgroundRightClick}
          onAddChildClick={handleAddChildClick}
          onQuantityClick={handleQuantityClick}
          onPriceClick={handlePriceClick}
          onRevisionChange={handleRevisionChange}
          onChildRevisionChange={handleChildRevisionChange}
          onContextMenuUpload={handleContextMenuUpload}
          onQuantityOption={handleQuantityOption}
          onPriceOption={handlePriceOption}
          onMoveOption={handleMoveOption}
          onRemoveOption={handleRemoveOption}
          onFolderUpload={handleUploadToFolder}
          onFolderNewSubfolder={handleFolderNewSubfolder}
          onFolderRename={handleFolderRenamePrompt}
          onFolderDelete={handleDeleteFolder}
          onFolderDownload={handleDownloadFolder}
          onDownloadOption={handleDownloadOption}
          onBackgroundNewFolder={handleBackgroundNewFolder}
          onBackgroundUpload={handleBackgroundUpload}
          onMoveFileToFolder={handleMoveFileToFolder}
          onMoveFolder={handleMoveFolder}
          hideContextMenu={hideContextMenu}
          contextMenuFileInput={contextMenuFileInput}
          childFileInput={childFileInput}
          onContextMenuFileChange={handleContextMenuFileChange}
          onChildFileChange={handleChildFileChange}
          activeTheme={activeTheme}
        />
      )}
      {viewMode === 'bom' && <BOMViewer prod={normalizedProd} updateFile={updateFile} />}
      {viewMode === 'kpi' && <KPIDashboard prod={normalizedProd} />}

      <input type="file" ref={hiddenFileInput} onChange={handleFileChange} style={{ display: 'none' }} />
    </>
  );

  return (
    <Container fluid style={{ height: '100vh', overflow: 'hidden', maxWidth: '100vw', width: '100%', padding: 0, margin: 0 }} className="bg-dark text-light p-0">
      <ToastContainer position="top-center" className="p-3" style={{ zIndex: 9999 }}>
        <Toast bg="dark" onClose={() => setToastMsg('')} show={!!toastMsg} delay={3000} autohide>
          <Toast.Body className="text-light" style={{ textAlign: 'center', fontSize: '0.85rem' }}>{toastMsg}</Toast.Body>
        </Toast>
      </ToastContainer>

      <Row className="g-0 m-0" style={{ height: '100%', maxWidth: '100%' }}>
        <Col xs="auto" style={{ width: '52px', background: styles.colors.dark, padding: 0, borderRight: `1px solid ${styles.colors.border}` }}>
          <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0.5rem' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: styles.borderRadius.md, background: styles.colors.darkAlt, color: styles.colors.text.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.5px', marginBottom: '14px' }}>mP</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              {(() => {
                const allContainers = [
                  ...(normalizedProd.stages || []).map(s => ({ ...s, containerType: 'stage' })),
                  ...(normalizedProd.iterations || []).map(i => ({ ...i, containerType: 'iteration' }))
                ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                return allContainers.map(container => {
                  const isStage = container.containerType === 'stage';
                  const isSelected = normalizedProd.selectedContainer?.id === container.id && normalizedProd.containerType === container.containerType;
                  return (
                    <RailButton
                      key={`${container.containerType}-${container.id}`}
                      title={isStage ? `Stage ${container.stage_number}` : `Iteration ${container.iteration_number}`}
                      selected={isSelected}
                      color={isStage ? styles.colors.stage : styles.colors.iteration}
                      number={isStage ? container.stage_number : container.iteration_number}
                      icon={isStage ? <FaToriiGate size={18} /> : <FaDrumSteelpan size={18} />}
                      onClick={() => handleContainerClick(container, container.containerType)}
                      onContextMenu={e => handleContainerRightClick(e, container, container.containerType)}
                    />
                  );
                });
              })()}
            </div>
          </div>
        </Col>

        <Col className="p-0 m-0" style={{ height: '100%', overflow: 'hidden', maxWidth: 'calc(100vw - 52px)' }}>
          {viewMode === 'normal'
            ? <ResizableColumn leftContent={fileBrowser} rightContent={renderPreview(selectedFileObj, handleRevisionChange, handleChildRevisionChange)} />
            : <div className="p-2" style={{ height: '100%', overflow: 'auto' }}>{fileBrowser}</div>}
        </Col>
      </Row>

      <ConfirmModal modal={confirmModal} />
      <InputModal modal={inputModal} setModal={setInputModal} />
      <MoveModal modal={moveModal} setModal={setMoveModal} onConfirm={handleMoveConfirm} />
      <QuantityModal show={showQuantityModal} currentFile={currentFileForModal} onSave={handleQuantityUpdate} onCancel={() => { setShowQuantityModal(false); setCurrentFileForModal(null); }} />
      <PriceModal show={showPriceModal} currentFile={currentFileForModal} onSave={handlePriceUpdate} onCancel={() => { setShowPriceModal(false); setCurrentFileForModal(null); }} />
      <ChangeDescriptionModal show={showChangeDescriptionModal} tempDescription={tempChangeDescription} setTempDescription={setTempChangeDescription} onSave={handleChangeDescriptionUpdate} onCancel={() => { setShowChangeDescriptionModal(false); setCurrentFileForModal(null); }} />
    </Container>
  );
}

function AppContent() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    authenticatedFetch('/api/initial-setup/')
      .then(r => r.json())
      .then(data => setNeedsSetup(data.needs_setup))
      .catch(console.error)
      .finally(() => setCheckingSetup(false));
  }, []);

  if (loading || checkingSetup) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
        <Spinner animation="border" style={{ color: '#3b82f6' }} />
      </div>
    );
  }
  if (needsSetup && !showLogin) return <SetupWizard onSetupComplete={() => window.location.reload()} onShowLogin={() => setShowLogin(true)} />;
  if (!isAuthenticated) return <LoginPage />;
  return <><MainApp /><UserMenu user={user} onLogout={logout} /></>;
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}



