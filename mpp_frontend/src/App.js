import React, { useState, useRef, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Toast, ToastContainer, Spinner, Form } from 'react-bootstrap';
import { FaToriiGate, FaDrumSteelpan, FaDownload } from 'react-icons/fa';

import { AuthProvider, useAuth } from './context/AuthContext';
import SetupWizard from './components/SetupWizard';
import LoginPage from './components/Auth/LoginPage';
import UserMenu from './components/Auth/UserMenu';

import authenticatedFetch from './utils/authenticatedFetch';
import { hybridStorage } from './hybridStorage';
import styles from './constants/styles';
import globalStyles from './styles/globalStyles';
import { ThemeProvider } from './context/ThemeContext';
import useIconTheme from './hooks/useIconTheme';

import ResizableColumn from './components/ResizableColumn/ResizableColumn';
import Toolbar from './components/Toolbar/Toolbar';
import ErrorBoundary from './components/ErrorBoundary';
import FileList from './components/FileList/FileList';
import BOMViewer from './components/BOMViewer/BOMViewer';
import TraceabilityMatrix from './components/TraceabilityMatrix/TraceabilityMatrix';
import KPIDashboard from './components/KPIDashboard/KPIDashboard';
import { ConfirmModal, InputModal, MoveModal, QuantityModal, PriceModal, ChangeDescriptionModal } from './components/Modals/Modals';
import Model3DPreview from './components/viewers/Model3DPreview';
import ImageViewer from './components/viewers/ImageViewer';
import DocViewer from './components/viewers/DocViewer';
import KicadSchematicViewer from './components/viewers/KicadSchematicViewer';
import KicadPcbViewer from './components/viewers/KicadPcbViewer';
import { CodePreview, MarkdownPreview, CsvPreview, ExcelPreview } from './components/viewers/FilePreviewers';
import { readDropEntries, isIgnoredDropPath } from './utils/dropUpload';

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
        <span className="ms-3 text-light" style={{ fontSize: '0.9rem', borderRadius: '8px', backgroundColor: styles.colors.primarySoft, padding: '5px 10px' }}>
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

  // Previews fill the pane's full height; `fill=false` keeps the natural
  // document flow (markdown reads better scrolling as a normal page).
  const wrap = (content, fill = true) => (
    <div style={{ maxWidth: '100%', height: fill ? '100%' : 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: fill ? 'hidden' : 'auto' }}>
      {revisionSelector}
      <div style={{ flex: fill ? '1 1 auto' : '0 0 auto', minHeight: 0, overflow: fill ? 'hidden' : 'visible' }}>{content}</div>
    </div>
  );
  const fileUrl = serverUrl;
  const nameLower = fileObj.name.toLowerCase();

  if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'].some(e => nameLower.endsWith(e)))
    return wrap(<ImageViewer key={fileUrl} fileUrl={fileUrl} name={fileObj.name} />);

  if (nameLower.endsWith('.pdf'))
    return wrap(<div style={{ height: '100%', borderRadius: '8px', border: `1px solid ${styles.colors.border}`, overflow: 'hidden' }}><iframe src={fileUrl} style={{ display: 'block', width: '100%', height: '100%', border: 'none' }} title={fileObj.name} /></div>);

  if (['.kicad_sch', '.sch'].some(e => nameLower.endsWith(e)))
    return wrap(<KicadSchematicViewer key={fileUrl} fileUrl={fileUrl} />);

  if (nameLower.endsWith('.kicad_pcb'))
    return wrap(<KicadPcbViewer key={fileUrl} fileUrl={fileUrl} />);

  if (['.stl', '.dxf', '.stp', '.step'].some(e => nameLower.endsWith(e)))
    return wrap(<Model3DPreview fileUrl={fileUrl} />);

  if (['.js', '.jsx', '.ts', '.tsx', '.py', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.hh', '.hxx',
       '.ino', '.java', '.txt', '.log', '.json', '.xml', '.yml', '.yaml', '.toml', '.ini', '.cfg',
       '.sh', '.bat', '.rs', '.go', '.rb', '.php', '.sql', '.kt', '.swift'].some(e => nameLower.endsWith(e))) {
    const ext = nameLower.substring(nameLower.lastIndexOf('.'));
    return wrap(<CodePreview fileUrl={fileUrl} extension={ext} />);
  }

  if (['.md', '.markdown'].some(e => nameLower.endsWith(e)))
    return wrap(<MarkdownPreview key={fileUrl + selectedRevision?.revision_number} fileUrl={fileUrl} />, false);

  if (nameLower.endsWith('.csv'))
    return wrap(<CsvPreview fileUrl={fileUrl} />);

  if (['.xls', '.xlsx'].some(e => nameLower.endsWith(e)))
    return wrap(<ExcelPreview fileUrl={fileUrl} />);

  if (['.docx', '.docm', '.doc'].some(e => nameLower.endsWith(e)))
    return wrap(<DocViewer key={fileUrl} fileUrl={fileUrl} name={fileObj.name} />);

  const fileSize = fileObj.file_size || fileObj.size || 0;
  const uploadDate = fileObj.created_at || fileObj.upload_date;
  return wrap(
    <div style={{ height: '100%', borderRadius: '8px', border: `1px solid ${styles.colors.border}`, padding: '1rem' }}>
      <p className="text-muted">No preview available for {fileObj.name}</p>
      <p>Size: {(fileSize / 1024).toFixed(2)} KB</p>
      <p>Upload date: {uploadDate ? new Date(uploadDate).toLocaleDateString() : 'Unknown'}</p>
    </div>
  );
}

const LAST_SELECTION_KEY = 'phasorLastSelection';

// Remembers where the user left off (product / stage-iteration / file) so a fresh
// login lands on that view instead of an empty screen.
function loadLastSelection() {
  try {
    return JSON.parse(localStorage.getItem(LAST_SELECTION_KEY)) || null;
  } catch {
    return null;
  }
}

// `softColor` is passed in rather than derived: colours are CSS variables now, so a
// translucent variant can't be made by appending an alpha suffix to the base colour.
function RailButton({ icon, color, softColor, number, selected, onClick, onContextMenu, title }) {
  return (
    <div
      title={title}
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        position: 'relative', cursor: 'pointer', width: '36px', height: '36px',
        borderRadius: styles.borderRadius.md, marginBottom: '4px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: selected ? softColor : 'transparent',
        transition: 'background 0.12s ease',
      }}
      onMouseOver={e => { e.currentTarget.style.background = selected ? softColor : styles.colors.darkAlt; }}
      onMouseOut={e => { e.currentTarget.style.background = selected ? softColor : 'transparent'; }}
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
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [containerType, setContainerType] = useState(null);
  const [selectedFileObj, setSelectedFileObj] = useState(null);
  const [folderTree, setFolderTree] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: null, fileObj: null, folderObj: null });
  const [containerMenu, setContainerMenu] = useState({ visible: false, x: 0, y: 0, container: null, type: null });
  const [transferModal, setTransferModal] = useState({ visible: false, mode: 'move', kind: 'file', item: null, target: '', options: [] });
  const [dropUpload, setDropUpload] = useState({ active: false, done: 0, total: 0 });
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
  const folderInput = useRef(null);
  const contextMenuFileInput = useRef(null);
  const childFileInput = useRef(null);
  const uploadTargetFolderRef = useRef(null); // when set, next upload lands in this folder
  const pendingFolderIdRef = useRef(null); // folder to open once the restored product's tree loads

  const prod = products[selectedProductIndex] || {};

  // Reopen the product / container / file the user was last on. Falls back to the
  // first product whenever any part of the saved selection no longer exists.
  async function restoreLastSelection(loadedProducts) {
    const saved = loadLastSelection();
    const savedIndex = saved ? loadedProducts.findIndex(p => p.id === saved.productId) : -1;
    const productIndex = savedIndex >= 0 ? savedIndex : 0;
    setSelectedProductIndex(productIndex);
    if (savedIndex < 0 || !saved.containerType || !saved.containerId) return;

    const product = loadedProducts[productIndex];
    const containers = saved.containerType === 'stage' ? product.stages : product.iterations;
    const container = (containers || []).find(c => c.id === saved.containerId);
    if (!container) return;

    setSelectedContainer(container);
    setContainerType(saved.containerType);
    setProducts(prev => prev.map((p, i) => i === productIndex
      ? { ...p, selectedContainer: container, containerType: saved.containerType }
      : p));

    try {
      const endpoint = saved.containerType === 'stage'
        ? `/api/stages/${container.id}/files/`
        : `/api/iterations/${container.id}/files/`;
      const response = await authenticatedFetch(endpoint);
      if (!response.ok) return;
      const files = await response.json();
      const containerKey = `${saved.containerType}_${container.id}`;
      setProducts(prev => prev.map((p, i) => i === productIndex
        ? { ...p, filesByContainer: { ...p.filesByContainer, [containerKey]: files } }
        : p));
      if (!saved.fileId) return;
      const file = files.find(f => f.id === saved.fileId)
        || files.flatMap(f => f.child_files || []).find(c => c.id === saved.fileId);
      if (!file) return;
      setSelectedFileObj(file);
      // The folder tree effect may run before or after this resolves, so cover both.
      pendingFolderIdRef.current = file.folder ?? null;
      setCurrentFolderId(file.folder ?? null);
    } catch (error) {
      console.error('Failed to restore last container:', error);
    }
  }

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
          if (enriched.length > 0) await restoreLastSelection(enriched);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!products.length || isLoading) return;
    const id = setTimeout(() => hybridStorage.saveProducts(products).catch(console.error), 1000);
    return () => clearTimeout(id);
  }, [products, isLoading]);

  // Remember the current spot so the next login can reopen it.
  useEffect(() => {
    if (isLoading) return;
    const productId = products[selectedProductIndex]?.id;
    if (!productId) return;
    localStorage.setItem(LAST_SELECTION_KEY, JSON.stringify({
      productId,
      containerType: containerType || null,
      containerId: selectedContainer?.id ?? null,
      fileId: selectedFileObj?.id ?? null,
    }));
  }, [products, selectedProductIndex, containerType, selectedContainer, selectedFileObj, isLoading]);

  // On product change, reset the folder selection (restore uses pendingFolderIdRef to
  // reopen the last folder). The tree itself is loaded per-container by the effect below.
  const currentProductId = products[selectedProductIndex]?.id;
  useEffect(() => {
    setCurrentFolderId(pendingFolderIdRef.current);
    pendingFolderIdRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProductId]);

  // Folders are scoped to a stage/iteration, so (re)load the tree whenever the selected
  // container changes. No container selected => no folders.
  useEffect(() => {
    if (!selectedContainer || !containerType) { setFolderTree([]); return; }
    loadFolderTree(selectedContainer, containerType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContainer, containerType]);

  useEffect(() => {
    function handleClick() {
      if (contextMenu.visible) hideContextMenu();
      if (containerMenu.visible) setContainerMenu({ visible: false, x: 0, y: 0, container: null, type: null });
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.visible, containerMenu.visible]);

  useEffect(() => {
    // Injected once. It reads CSS variables throughout, so a theme change re-paints
    // it without this ever being rebuilt - see styles/globalStyles.js.
    const styleTag = document.createElement('style');
    styleTag.innerHTML = globalStyles;
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
        onConfirm: val => { setInputModal({ visible: false, title: '', placeholder: '', value: '', onConfirm: null, onCancel: null }); resolve(val ?? ''); },
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
    const name = await showInputModal('New Stage', 'Name (optional — defaults to S#)', '');
    if (name === null) return; // cancelled
    try {
      const response = await authenticatedFetch('/api/stages/', { method: 'POST', body: JSON.stringify({ product: currentProduct.id, name: name.trim(), type: 'workflow', color: '#007bff' }) });
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
    const name = await showInputModal('New Iteration', 'Name (optional — defaults to I#)', '');
    if (name === null) return; // cancelled
    try {
      const response = await authenticatedFetch('/api/iterations/', { method: 'POST', body: JSON.stringify({ product: currentProduct.id, name: name.trim(), type: 'design', color: '#28a745' }) });
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
    setCurrentFolderId(null); // don't carry a folder selection across containers
    loadContainerFiles(container, type);
  }

  async function loadContainerFiles(container, type, force = false) {
    try {
      const containerKey = `${type}_${container.id}`;
      const currentProduct = products[selectedProductIndex];
      if (!force && currentProduct.filesByContainer?.[containerKey]?.length > 0) return;
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

  async function loadFolderTree(container, type) {
    if (!container || !type) { setFolderTree([]); return; }
    setFoldersLoading(true);
    try {
      const endpoint = type === 'stage' ? `/api/stages/${container.id}/folders/` : `/api/iterations/${container.id}/folders/`;
      const response = await authenticatedFetch(endpoint);
      if (response.ok) setFolderTree(await response.json());
      else setFolderTree([]);
    } catch (error) {
      console.error('Failed to load folder tree:', error);
      setFolderTree([]);
    } finally {
      setFoldersLoading(false);
    }
  }

  // Reload the current container's folder tree after a folder mutation.
  function refreshFolders() {
    if (selectedContainer && containerType) loadFolderTree(selectedContainer, containerType);
  }

  async function handleCreateFolder(parentId, name) {
    if (!selectedContainer || !containerType) { setToastMsg('Select a Stage or Iteration first!'); return; }
    try {
      const body = { name, parent: parentId };
      if (containerType === 'stage') body.stage_id = selectedContainer.id;
      else body.iteration_id = selectedContainer.id;
      const response = await authenticatedFetch('/api/folders/', { method: 'POST', body: JSON.stringify(body) });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || 'Create failed'); }
      await loadFolderTree(selectedContainer, containerType);
      setToastMsg(`Folder "${name}" created`);
    } catch (error) { setToastMsg(`Failed to create folder: ${error.message}`); }
  }

  async function handleRenameFolder(folderId, name) {
    try {
      const response = await authenticatedFetch(`/api/folders/${folderId}/`, { method: 'PATCH', body: JSON.stringify({ name }) });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || 'Rename failed'); }
      refreshFolders();
      setToastMsg('Folder renamed');
    } catch (error) { setToastMsg(`Failed to rename folder: ${error.message}`); }
  }

  async function handleDeleteFolder(folder) {
    const hasContents = (folder.children?.length > 0) || (folder.file_count > 0);
    const msg = hasContents
      ? `Delete folder "${folder.name}" and everything inside it (subfolders and files)? This can't be undone.`
      : `Delete folder "${folder.name}"?`;
    if (!await showConfirm(msg)) return;
    try {
      const url = `/api/folders/${folder.id}/${hasContents ? '?recursive=true' : ''}`;
      const response = await authenticatedFetch(url, { method: 'DELETE' });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || 'Delete failed'); }
      if (currentFolderId === folder.id) setCurrentFolderId(folder.parent ?? null);
      refreshFolders();
      if (hasContents && prod.selectedContainer && prod.containerType) {
        loadContainerFiles(prod.selectedContainer, prod.containerType, true); // resync after files removed
      }
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
      refreshFolders();
      setToastMsg(folderId ? 'File moved into folder' : 'File moved to root');
    } catch (error) { setToastMsg(`Move failed: ${error.message}`); }
  }

  async function handleMoveFolder(folderId, newParentId) {
    try {
      const response = await authenticatedFetch(`/api/folders/${folderId}/`, { method: 'PATCH', body: JSON.stringify({ parent: newParentId }) });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err.error || (err.non_field_errors ? err.non_field_errors[0] : (Array.isArray(err) ? err[0] : 'Move failed'));
        throw new Error(msg);
      }
      refreshFolders();
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

  function handleContainerRightClick(e, container, type) {
    e.preventDefault();
    e.stopPropagation();
    setContainerMenu({ visible: true, x: e.clientX, y: e.clientY + 6, container, type });
  }

  function hideContainerMenu() { setContainerMenu({ visible: false, x: 0, y: 0, container: null, type: null }); }

  async function handleRenameContainer(container, type) {
    hideContainerMenu();
    const label = type === 'stage' ? container.stage_id : container.iteration_id;
    const name = await showInputModal(`Rename ${label}`, 'Enter a name', container.name || '');
    if (name === null) return;
    const finalName = name.trim() || label; // blank -> fall back to the S#/I# id
    try {
      const endpoint = type === 'stage' ? `/api/stages/${container.id}/` : `/api/iterations/${container.id}/`;
      const response = await authenticatedFetch(endpoint, { method: 'PATCH', body: JSON.stringify({ name: finalName }) });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.name?.[0] || err.error || 'Rename failed'); }
      const updatedContainer = await response.json();
      setProducts(prev => {
        const updated = [...prev];
        const updatedProd = { ...updated[selectedProductIndex] };
        const listKey = type === 'stage' ? 'stages' : 'iterations';
        updatedProd[listKey] = (updatedProd[listKey] || []).map(c => c.id === container.id ? { ...c, ...updatedContainer } : c);
        if (updatedProd.selectedContainer?.id === container.id) updatedProd.selectedContainer = { ...updatedProd.selectedContainer, ...updatedContainer };
        updated[selectedProductIndex] = updatedProd;
        return updated;
      });
      if (selectedContainer?.id === container.id) setSelectedContainer(prev => ({ ...prev, ...updatedContainer }));
      setToastMsg(`Renamed to "${finalName}"`);
    } catch (error) { setToastMsg(`Rename failed: ${error.message}`); }
  }

  async function handleDeleteContainer(container, type) {
    hideContainerMenu();
    const containerKey = `${type}_${container.id}`;
    const fileList = prod.filesByContainer[containerKey] || [];
    if (fileList.length > 0) { setToastMsg(`Cannot delete a ${type} with files!`); return; }
    const containerLabel = type === 'stage' ? container.stage_id : container.iteration_id;
    if (!await showConfirm(`Delete ${containerLabel} ("${container.name}")? It's empty and will be removed.`)) return;
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

  function handleUploadFolderClick() {
    if (!prod.selectedContainer || !prod.containerType) { setToastMsg('Please select a Stage or Iteration first!'); return; }
    uploadTargetFolderRef.current = currentFolderId; // folder upload lands in the selected folder (or root)
    folderInput.current?.click();
  }

  function handleBackgroundUpload() {
    hideContextMenu();
    if (!prod.selectedContainer || !prod.containerType) { setToastMsg('Please select a Stage or Iteration first!'); return; }
    uploadTargetFolderRef.current = null; // background upload lands at root
    hiddenFileInput.current.click();
  }

  const readFileAsDataUrl = (file) =>
    new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });

  // Merge a freshly-uploaded top-level file into the container's file list (dedup by name).
  function addUploadedFileToState(savedFile, dataUrl, containerKey) {
    setProducts(prev => {
      const updated = [...prev];
      const updatedProd = { ...updated[selectedProductIndex], filesByContainer: { ...updated[selectedProductIndex].filesByContainer } };
      const existing = [...(updatedProd.filesByContainer[containerKey] || [])];
      const existingIdx = existing.findIndex(f => f.name === savedFile.name && !f.is_child_file);
      if (existingIdx !== -1 && savedFile.current_revision > 1) existing[existingIdx] = { ...existing[existingIdx], ...savedFile, dataUrl };
      else existing.push({ ...savedFile, dataUrl });
      updatedProd.filesByContainer[containerKey] = existing;
      updated[selectedProductIndex] = updatedProd;
      return updated;
    });
  }

  // POST one top-level file into the given folder (null = root); returns { ...savedFile, dataUrl }.
  // Retries transient failures (e.g. a WSL2 bind-mount write hiccup); the backend create
  // is atomic, so a failed attempt leaves no partial row to collide with.
  async function uploadOneFile(file, targetFolderId, attempts = 3) {
    const buildForm = () => {
      const formData = new FormData();
      formData.append('uploaded_file', file);
      formData.append('original_name', file.name);
      formData.append('is_child_file', 'false');
      if (prod.containerType === 'stage') formData.append('stage_id', prod.selectedContainer.id);
      else formData.append('iteration_id', prod.selectedContainer.id);
      if (targetFolderId) formData.append('folder', targetFolderId);
      formData.append('change_description', 'Initial file upload');
      formData.append('status', 'in_work');
      formData.append('quantity', '1');
      return formData;
    };
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await authenticatedFetch('/api/files/', { method: 'POST', body: buildForm() });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        const savedFile = await response.json();
        const dataUrl = await readFileAsDataUrl(file);
        const containerKey = `${prod.containerType}_${prod.selectedContainer.id}`;
        addUploadedFileToState(savedFile, dataUrl, containerKey);
        return { ...savedFile, dataUrl };
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) await new Promise(r => setTimeout(r, 300 * (i + 1)));
      }
    }
    throw lastErr;
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) { e.target.value = ''; return; }
    if (!prod.selectedContainer || !prod.containerType) { setToastMsg('No container selected.'); e.target.value = ''; return; }
    // Each upload trigger sets the target folder explicitly (null = container root).
    const targetFolderId = uploadTargetFolderRef.current;
    setIsLoading(true);
    try {
      let last = null;
      for (const file of files) last = await uploadOneFile(file, targetFolderId);
      if (last) setSelectedFileObj(last);
      if (targetFolderId) refreshFolders(); // refresh file counts on the target folder
      if (files.length === 1 && last) {
        setToastMsg(last.current_revision > 1 ? `Rev ${last.current_revision} created!` : 'File uploaded!');
        setTimeout(() => { setCurrentFileForModal(last); setTempChangeDescription(''); setShowChangeDescriptionModal(true); }, 100);
      } else {
        setToastMsg(`${files.length} files uploaded`);
      }
    } catch (err) { setToastMsg(`Upload error: ${err.message}`); }
    finally { setIsLoading(false); e.target.value = ''; uploadTargetFolderRef.current = null; }
  }

  // Low-level folder create that returns the created folder object (id needed for nesting).
  async function apiCreateFolder(parentId, name) {
    const body = { name, parent: parentId ?? null };
    if (prod.containerType === 'stage') body.stage_id = prod.selectedContainer.id;
    else body.iteration_id = prod.selectedContainer.id;
    const response = await authenticatedFetch('/api/folders/', { method: 'POST', body: JSON.stringify(body) });
    if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || 'Folder create failed'); }
    return response.json();
  }

  // Find a folder's name by id within the nested folder tree.
  function findFolderName(nodes, id) {
    for (const n of nodes || []) {
      if (n.id === id) return n.name;
      const found = findFolderName(n.children, id);
      if (found) return found;
    }
    return null;
  }

  // Shared uploader for a resolved list of { file, relativePath } — used by both the
  // drag-drop path and the "Upload folder" picker. Recreates the folder structure under
  // `targetFolderId` (null = container root) and uploads each file, versioning changes.
  async function uploadEntries(entries, targetFolderId) {
    if (!entries.length) { setToastMsg('Nothing to upload (folders like .git/.pio/node_modules are skipped).'); return; }
    // Pin the target container so the async refresh below hits the right one even if
    // the selection changes while a big folder is uploading.
    const container = prod.selectedContainer;
    const containerType = prod.containerType;
    setIsLoading(true);
    setDropUpload({ active: true, done: 0, total: entries.length });
    let ok = 0;
    let failed = 0;
    let last = null;
    try {
      // Resolve each directory path to a folder id once. The backend create is
      // idempotent (get-or-create by container+parent+name), so re-uploading the same
      // folder merges into the existing structure and files version instead of
      // duplicating — no reliance on the client's (possibly stale) folder tree.
      const pathToId = new Map([['', targetFolderId ?? null]]);
      // If dropped ONTO a folder whose name matches a dropped top-level folder, merge
      // into it instead of nesting (so re-dropping "inkframe-reader" onto the existing
      // "inkframe-reader" updates it rather than making inkframe-reader/inkframe-reader).
      const targetName = targetFolderId ? findFolderName(folderTree, targetFolderId) : null;
      if (targetName) pathToId.set(targetName, targetFolderId);
      const ensureFolder = async (dirPath) => {
        if (pathToId.has(dirPath)) return pathToId.get(dirPath);
        const parts = dirPath.split('/');
        const name = parts[parts.length - 1];
        const parentPath = parts.slice(0, -1).join('/');
        const parentId = await ensureFolder(parentPath);
        const created = await apiCreateFolder(parentId, name);
        pathToId.set(dirPath, created.id);
        return created.id;
      };

      for (const { file, relativePath } of entries) {
        try {
          const parts = relativePath.split('/');
          const fullDir = parts.slice(0, -1).join('/'); // '' for a top-level file
          const folderId = await ensureFolder(fullDir);
          last = await uploadOneFile(file, folderId);
          ok += 1;
        } catch (err) {
          failed += 1;
          console.error(`Upload failed for ${relativePath}:`, err);
        }
        setDropUpload({ active: true, done: ok + failed, total: entries.length });
      }
    } finally {
      if (last) setSelectedFileObj(last);
      // Await the resync so new folders/files render immediately (no need to switch away).
      await loadFolderTree(container, containerType);
      await loadContainerFiles(container, containerType, true);
      setIsLoading(false);
      setDropUpload({ active: false, done: 0, total: 0 });
      setToastMsg(`Uploaded ${ok} file${ok === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}`);
    }
  }

  // Drag-drop path: read the OS DataTransfer (files/folders), then upload.
  async function handleExternalDrop(dataTransfer, targetFolderId) {
    if (!prod.selectedContainer || !prod.containerType) { setToastMsg('Select a Stage or Iteration first!'); return; }
    let entries;
    try { entries = await readDropEntries(dataTransfer); } catch (err) { setToastMsg(`Could not read dropped items: ${err.message}`); return; }
    await uploadEntries(entries, targetFolderId);
  }

  // "Upload folder" picker path (webkitdirectory): reliable full-tree capture with no
  // browser entry-expiry, so nothing gets silently skipped on large repos.
  async function handleFolderInputChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!prod.selectedContainer || !prod.containerType) { setToastMsg('Select a Stage or Iteration first!'); return; }
    const entries = files
      .map(file => ({ file, relativePath: file.webkitRelativePath || file.name }))
      .filter(({ relativePath }) => !isIgnoredDropPath(relativePath));
    await uploadEntries(entries, uploadTargetFolderRef.current);
    uploadTargetFolderRef.current = null;
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

  // --- Feature 3: copy/move a file or folder into another stage/iteration ---
  function openTransfer(kind, item, mode) {
    hideContextMenu();
    if (!item) return;
    const cur = prod.selectedContainer;
    const options = [
      ...(prod.stages || []).map(s => ({ key: `stage_${s.id}`, id: s.id, type: 'stage', label: s.stage_id, name: s.name })),
      ...(prod.iterations || []).map(i => ({ key: `iteration_${i.id}`, id: i.id, type: 'iteration', label: i.iteration_id, name: i.name })),
    ].filter(o => !(prod.containerType === o.type && cur?.id === o.id)); // exclude the current container
    if (!options.length) { setToastMsg('No other stage or iteration to target. Create one first.'); return; }
    setTransferModal({ visible: true, mode, kind, item, target: options[0].key, options });
  }

  const handleFileCopyTo = () => openTransfer('file', contextMenu.fileObj, 'copy');
  const handleFileMoveTo = () => openTransfer('file', contextMenu.fileObj, 'move');
  const handleFolderCopyTo = (folder) => openTransfer('folder', folder, 'copy');
  const handleFolderMoveTo = (folder) => openTransfer('folder', folder, 'move');

  async function handleTransferConfirm() {
    const { mode, kind, item, target, options } = transferModal;
    const opt = (options || []).find(o => o.key === target);
    setTransferModal({ visible: false, mode: 'move', kind: 'file', item: null, target: '', options: [] });
    if (!opt || !item) return;
    const body = opt.type === 'stage' ? { stage_id: opt.id } : { iteration_id: opt.id };
    const base = kind === 'file' ? 'files' : 'folders';
    try {
      const res = await authenticatedFetch(`/api/${base}/${item.id}/${mode}/`, { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `${mode} failed`); }
      // Resync current view (a move removes the item; a copy leaves it) and the target's tree.
      refreshFolders();
      if (prod.selectedContainer && prod.containerType) await loadContainerFiles(prod.selectedContainer, prod.containerType, true);
      if (selectedFileObj?.id === item.id && kind === 'file' && mode === 'move') setSelectedFileObj(null);
      setToastMsg(`${kind === 'file' ? 'File' : 'Folder'} ${mode === 'copy' ? 'copied' : 'moved'} to ${opt.label}`);
    } catch (e) { setToastMsg(`${mode === 'copy' ? 'Copy' : 'Move'} failed: ${e.message}`); }
  }

  async function handleRenameOption() {
    if (!contextMenu.fileObj) { hideContextMenu(); return; }
    const fileObj = contextMenu.fileObj;
    hideContextMenu();
    const newName = await showInputModal('Rename File', 'Enter new file name', fileObj.name);
    if (!newName || newName === fileObj.name) return;
    try {
      const response = await authenticatedFetch(`/api/files/${fileObj.id}/`, { method: 'PATCH', body: JSON.stringify({ name: newName }) });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || (Array.isArray(err.name) ? err.name[0] : 'Rename failed'));
      }
      // Persisted on the File record; reflect it in the list/preview immediately.
      updateFile(fileObj.id, { name: newName });
      setToastMsg(`Renamed to "${newName}"`);
    } catch (error) { setToastMsg(`Rename failed: ${error.message}`); }
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

  // The one toolbar shared by every dashboard — see components/Toolbar/Toolbar.js.
  const toolbar = (
    <Toolbar
      products={products}
      selectedProductIndex={selectedProductIndex}
      onSelectProduct={handleSelectProduct}
      onCreateProduct={handleCreateProduct}
      onAddIteration={handleAddIteration}
      onAddStage={handleAddStage}
      onUploadFile={handlePlusClick}
      onUploadFolder={handleUploadFolderClick}
      viewMode={viewMode}
      setViewMode={setViewMode}
      hiddenFileInput={hiddenFileInput}
      folderInput={folderInput}
      onFileChange={handleFileChange}
      onFolderInputChange={handleFolderInputChange}
    />
  );

  const fileBrowser = (
    <>
      {toolbar}

      {viewMode === 'normal' && (
        <FileList
          key={`${normalizedProd.containerType}_${normalizedProd.selectedContainer?.id}`}
          prod={normalizedProd}
          folderTree={folderTree}
          foldersLoading={foldersLoading}
          dropUpload={dropUpload}
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
          onRenameOption={handleRenameOption}
          onRemoveOption={handleRemoveOption}
          onFileCopyTo={handleFileCopyTo}
          onFileMoveTo={handleFileMoveTo}
          onFolderCopyTo={handleFolderCopyTo}
          onFolderMoveTo={handleFolderMoveTo}
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
          onExternalDrop={handleExternalDrop}
          hideContextMenu={hideContextMenu}
          contextMenuFileInput={contextMenuFileInput}
          childFileInput={childFileInput}
          onContextMenuFileChange={handleContextMenuFileChange}
          onChildFileChange={handleChildFileChange}
          activeTheme={activeTheme}
        />
      )}
      {viewMode === 'kpi' && <KPIDashboard prod={normalizedProd} />}
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
                      title={`${isStage ? container.stage_id : container.iteration_id} — ${container.name || (isStage ? `Stage ${container.stage_number}` : `Iteration ${container.iteration_number}`)}`}
                      selected={isSelected}
                      color={isStage ? styles.colors.stage : styles.colors.iteration}
                      softColor={isStage ? styles.colors.stageSoft : styles.colors.iterationSoft}
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
            ? <ResizableColumn leftContent={fileBrowser} rightContent={
                <ErrorBoundary resetKey={`${selectedFileObj?.id}-${selectedFileObj?.current_revision || 1}`}>
                  {renderPreview(selectedFileObj, handleRevisionChange, handleChildRevisionChange)}
                </ErrorBoundary>
              } />
            : viewMode === 'bom'
              // BOM owns its own split so the toolbar sits in the left panel (same place
              // as the Files view) while the tables get the full remaining width.
              ? <BOMViewer
                  prod={normalizedProd}
                  updateFile={updateFile}
                  toolbar={toolbar}
                  onSelectContainer={handleContainerClick}
                />
              : viewMode === 'trace'
                // Same split as BOM: toolbar in the left panel, matrix gets the rest.
                ? <TraceabilityMatrix
                    prod={normalizedProd}
                    toolbar={toolbar}
                    onSelectContainer={handleContainerClick}
                  />
                : <div className="p-2" style={{ height: '100%', overflow: 'auto' }}>{fileBrowser}</div>}
        </Col>
      </Row>

      {containerMenu.visible && (
        <div
          style={{ position: 'fixed', top: containerMenu.y, left: containerMenu.x, backgroundColor: styles.colors.dark, border: `1px solid ${styles.colors.border}`, borderRadius: '4px', padding: '0.5rem 0', zIndex: 1000, minWidth: '150px', fontSize: '0.85rem' }}
          onMouseLeave={hideContainerMenu}
        >
          <div style={{ padding: '0.375rem 1rem', cursor: 'pointer', color: styles.colors.text.light }}
            onClick={() => handleRenameContainer(containerMenu.container, containerMenu.type)}
            onMouseOver={e => e.currentTarget.style.backgroundColor = styles.colors.darkAlt}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >Rename</div>
          <div style={{ padding: '0.375rem 1rem', cursor: 'pointer', color: styles.colors.text.dark, backgroundColor: styles.colors.danger }}
            onClick={() => handleDeleteContainer(containerMenu.container, containerMenu.type)}
            onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >Delete</div>
        </div>
      )}

      {transferModal.visible && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1060 }}>
          <div style={{ backgroundColor: styles.colors.dark, border: `1px solid ${styles.colors.border}`, borderRadius: '6px', padding: '1.5rem', width: '420px', maxWidth: '90%' }}>
            <h6 style={{ color: styles.colors.text.light, marginBottom: '0.25rem', fontSize: '0.95rem' }}>
              {transferModal.mode === 'copy' ? 'Copy' : 'Move'} {transferModal.kind} to iteration/stage
            </h6>
            <p style={{ color: styles.colors.text.muted, marginBottom: '1rem', fontSize: '0.8rem' }}>{transferModal.item?.name}</p>
            <select
              className="form-select form-select-sm mb-3"
              style={{ backgroundColor: styles.colors.darkAlt, color: styles.colors.text.light, border: `1px solid ${styles.colors.border}` }}
              value={transferModal.target}
              onChange={e => setTransferModal(prev => ({ ...prev, target: e.target.value }))}
            >
              {transferModal.options.map(o => (
                <option key={o.key} value={o.key}>{o.label} — {o.name} ({o.type})</option>
              ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setTransferModal({ visible: false, mode: 'move', kind: 'file', item: null, target: '', options: [] })}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleTransferConfirm}>{transferModal.mode === 'copy' ? 'Copy' : 'Move'}</button>
            </div>
          </div>
        </div>
      )}

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: styles.colors.dark }}>
        <Spinner animation="border" style={{ color: styles.colors.iteration }} />
      </div>
    );
  }
  if (needsSetup && !showLogin) return <SetupWizard onSetupComplete={() => window.location.reload()} onShowLogin={() => setShowLogin(true)} />;
  if (!isAuthenticated) return <LoginPage />;
  return <><MainApp /><UserMenu user={user} onLogout={logout} /></>;
}

export default function App() {
  return <ThemeProvider><AuthProvider><AppContent /></AuthProvider></ThemeProvider>;
}



