import React, { useState, useEffect } from 'react';
import { Table, Form, Spinner } from 'react-bootstrap';
import { FaPlus, FaFolder, FaFolderOpen, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import AppFileIcon from '../FileIcon/AppFileIcon';
import styles from '../../constants/styles';

const showQtyPriceExtensions = ['dxf', 'step', 'stp', 'stl', 'kicad_sch', 'gbr', 'gerber', 'kicad_pcb'];

// Software / source / text / doc files are never manufacturable parts, so they never
// carry quantity or price (badges hidden and the context-menu options suppressed).
const SOFTWARE_EXTENSIONS = [
  'py', 'cpp', 'c', 'h', 'hpp', 'hh', 'hxx', 'cxx', 'cc', 'js', 'jsx', 'ts', 'tsx',
  'ino', 'java', 'kt', 'swift', 'rs', 'go', 'rb', 'php', 'sql', 'sh', 'bat',
  'txt', 'md', 'markdown', 'json', 'xml', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'log',
  'html', 'css', 'doc', 'docx', 'pdf',
];
export const isSoftwareExt = (fileObj) =>
  SOFTWARE_EXTENSIONS.includes((fileObj.file_extension || '').toLowerCase().replace(/^\./, ''));

// Show qty/price badges for eligible manufacturing files, OR for any file once the
// user has explicitly set a price or a non-default quantity. Never for software files.
function qtyPriceFlags(fileObj) {
  if (isSoftwareExt(fileObj)) return { showQty: false, showPrice: false, showBadges: false };
  const ext = (fileObj.file_extension || '').toLowerCase().replace(/^\./, '');
  const eligibleExt = showQtyPriceExtensions.includes(ext);
  const hasPrice = fileObj.price !== null && fileObj.price !== undefined && fileObj.price !== '';
  const hasQtyVal = fileObj.quantity !== null && fileObj.quantity !== undefined;
  const showQty = hasQtyVal && (eligibleExt || Number(fileObj.quantity) !== 1);
  return { showQty, showPrice: hasPrice, showBadges: (hasQtyVal && (eligibleExt || Number(fileObj.quantity) !== 1)) || hasPrice };
}

const INDENT = 16; // px per nesting level

function FileList({
  prod,
  folderTree = [],
  foldersLoading = false,
  dropUpload = { active: false, done: 0, total: 0 },
  currentFolderId = null,
  setCurrentFolderId,
  selectedFileObj,
  setSelectedFileObj,
  contextMenu,
  onFileRightClick,
  onFolderRightClick,
  onBackgroundRightClick,
  onAddChildClick,
  onQuantityClick,
  onPriceClick,
  onRevisionChange,
  onChildRevisionChange,
  // file context-menu actions
  onContextMenuUpload,
  onQuantityOption,
  onPriceOption,
  onMoveOption,
  onRenameOption,
  onRemoveOption,
  onFileCopyTo,
  onFileMoveTo,
  // folder context-menu actions
  onFolderUpload,
  onFolderNewSubfolder,
  onFolderRename,
  onFolderDelete,
  onFolderDownload,
  onFolderCopyTo,
  onFolderMoveTo,
  onDownloadOption,
  // background context-menu actions
  onBackgroundNewFolder,
  onBackgroundUpload,
  // drag-and-drop
  onMoveFileToFolder,
  onMoveFolder,
  onExternalDrop,
  hideContextMenu,
  contextMenuFileInput,
  childFileInput,
  onContextMenuFileChange,
  onChildFileChange,
  activeTheme = 'default',
}) {
  // Persist which folders are open per container, so re-opening an iteration keeps
  // the same folders unpacked (component is remounted per container via `key`).
  const containerKey = (prod.selectedContainer && prod.containerType)
    ? `${prod.containerType}_${prod.selectedContainer.id}` : null;
  const expandStorageKey = containerKey ? `plm.expandedFolders.${containerKey}` : null;
  const [expanded, setExpanded] = useState(() => {
    if (!expandStorageKey) return {};
    try { return JSON.parse(localStorage.getItem(expandStorageKey)) || {}; } catch { return {}; }
  });
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  useEffect(() => {
    if (!expandStorageKey) return;
    try { localStorage.setItem(expandStorageKey, JSON.stringify(expanded)); } catch { /* ignore quota errors */ }
  }, [expanded, expandStorageKey]);

  if (!prod.selectedContainer || !prod.containerType) {
    return <p className="text-muted" style={{ fontSize: '0.85rem' }}>Select a Stage or Iteration on the left to see or upload files.</p>;
  }

  // Dedupe by id so a stray duplicate (e.g. from an interrupted upload) can't produce
  // React "two children with the same key" warnings or duplicated rows.
  const containerFiles = (() => {
    const seen = new Set();
    return (prod.filesByContainer[containerKey] || []).filter(f => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
  })();
  const filesInFolder = (folderId) => containerFiles.filter(f => !f.is_child_file && (f.folder ?? null) === folderId);
  // The list endpoint returns children nested on their parent and omits them from the
  // flat list; a just-uploaded child is the other way round. Merge both sources so a
  // child renders under its parent either way instead of vanishing on reload.
  const childrenOf = (fileObj) => {
    const byId = new Map();
    for (const c of fileObj.child_files || []) byId.set(c.id, c);
    for (const c of containerFiles) if (c.parent_file === fileObj.id) byId.set(c.id, c);
    return Array.from(byId.values());
  };

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const expand = (id) => setExpanded(prev => ({ ...prev, [id]: true }));

  // --- drag helpers ---
  const dragStartFile = (e, fileObj) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'file', id: fileObj.id }));
    e.dataTransfer.effectAllowed = 'move';
  };
  const dragStartFolder = (e, folder) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'folder', id: folder.id }));
    e.dataTransfer.effectAllowed = 'move';
  };
  const parseDrag = (e) => { try { return JSON.parse(e.dataTransfer.getData('application/json')); } catch { return null; } };
  const dropOnTarget = (e, targetFolderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    setDragOverRoot(false);
    // Files dragged in from the OS (Explorer/Finder) — upload them, preserving folders.
    if (e.dataTransfer.files?.length || Array.from(e.dataTransfer.types || []).includes('Files')) {
      onExternalDrop?.(e.dataTransfer, targetFolderId);
      return;
    }
    const data = parseDrag(e);
    if (!data) return;
    if (data.kind === 'file') onMoveFileToFolder(data.id, targetFolderId);
    else if (data.kind === 'folder' && data.id !== targetFolderId) onMoveFolder(data.id, targetFolderId);
  };

  // --- file row (with its child files) ---
  const renderFileRow = (fileObj, depth) => {
    const icon = <AppFileIcon filename={fileObj.name} />;
    const hasRevisions = fileObj.revisions?.length > 0;
    const childFiles = childrenOf(fileObj);
    const namePad = depth * INDENT + INDENT + 4; // +INDENT lines file icons up under folder icons (past the chevron)

    return (
      <React.Fragment key={fileObj.id}>
        <tr
          draggable
          onDragStart={e => dragStartFile(e, fileObj)}
          onClick={() => setSelectedFileObj(fileObj)}
          className={selectedFileObj?.id === fileObj.id ? 'selected-file-row' : ''}
        >
          <td style={{ maxWidth: 0, overflow: 'hidden', paddingLeft: `${namePad}px` }} onContextMenu={e => onFileRightClick(e, fileObj)}>
            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0, marginRight: '12px' }}>{icon}</span>
              <span title={fileObj.name} style={{ flex: '0 1 auto', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileObj.name}</span>
              <div className="ms-2" onClick={e => onAddChildClick(e, fileObj)} style={{ cursor: 'pointer', color: styles.colors.secondary, flexShrink: 0 }}>
                <FaPlus size={10} />
              </div>
              {(() => {
                const { showQty, showPrice, showBadges } = qtyPriceFlags(fileObj);
                if (!showBadges) return null;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexShrink: 0, marginLeft: '10px' }}>
                    {showQty && <span className="badge bg-warning" style={{ cursor: 'pointer', fontSize: '0.7rem' }} onClick={e => onQuantityClick(e, fileObj)}>Qty: {fileObj.quantity}</span>}
                    {showPrice && <span className="badge bg-success" style={{ cursor: 'pointer', fontSize: '0.7rem' }} onClick={e => onPriceClick(e, fileObj)}>₹{fileObj.price}</span>}
                  </div>
                );
              })()}
            </div>
          </td>
          <td style={{ whiteSpace: 'nowrap', color: styles.colors.text.muted, fontSize: styles.fonts.size.xs }}>
            {(() => {
              if (fileObj.revisions && fileObj.current_revision) {
                const currentRev = fileObj.revisions.find(r => r.revision_number === fileObj.current_revision);
                if (currentRev?.created_at) return new Date(currentRev.created_at).toLocaleDateString('en-GB');
              }
              return new Date(fileObj.created_at || fileObj.upload_date).toLocaleDateString('en-GB');
            })()}
          </td>
          <td>
            <Form.Select
              size="sm"
              className="rev-select shadow-none"
              style={{ width: '62px', fontSize: styles.fonts.size.xs, borderRadius: styles.borderRadius.sm, padding: '0.15rem 0.35rem', textAlign: 'center', cursor: 'pointer' }}
              value={fileObj.current_revision || 1}
              onClick={e => e.stopPropagation()}
              onChange={e => {
                e.stopPropagation();
                const revNum = parseInt(e.target.value, 10);
                if (!selectedFileObj || selectedFileObj.id !== fileObj.id) setSelectedFileObj(fileObj);
                if (hasRevisions) onRevisionChange(fileObj, revNum);
              }}
            >
              {hasRevisions
                ? fileObj.revisions.map(rev => <option key={rev.revision_number} value={rev.revision_number}>v {rev.revision_number}.0</option>)
                : <option value={1}>v 1.0</option>}
            </Form.Select>
          </td>
        </tr>

        {childFiles.map(childFile => {
          const childIcon = <AppFileIcon filename={childFile.name} />;
          const hasChildRevisions = childFile.revisions?.length > 0;
          return (
            <tr key={childFile.id} onClick={() => setSelectedFileObj(childFile)} style={selectedFileObj?.id === childFile.id ? { backgroundColor: styles.colors.primaryActive } : {}}>
              <td style={{ maxWidth: 0, overflow: 'hidden', paddingLeft: `${namePad + 20}px`, position: 'relative' }} onContextMenu={e => onFileRightClick(e, childFile)}>
                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                  <span style={{ position: 'absolute', left: `${namePad - 4}px`, color: styles.colors.text.muted, fontSize: '0.7rem' }}>└</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0, marginRight: '12px' }}>{childIcon}</span>
                  <span title={childFile.name} style={{ minWidth: 0, flex: '1 1 auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{childFile.name}</span>
                  {(() => {
                    const { showQty, showPrice, showBadges } = qtyPriceFlags(childFile);
                    if (!showBadges) return null;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexShrink: 0, marginLeft: '10px' }}>
                        {showQty && <span className="badge bg-warning" style={{ cursor: 'pointer', fontSize: '0.7rem' }} onClick={e => onQuantityClick(e, childFile)}>Qty: {childFile.quantity}</span>}
                        {showPrice && <span className="badge bg-success" style={{ cursor: 'pointer', fontSize: '0.7rem' }} onClick={e => onPriceClick(e, childFile)}>₹{childFile.price}</span>}
                      </div>
                    );
                  })()}
                </div>
              </td>
              <td style={{ whiteSpace: 'nowrap', color: styles.colors.text.muted, fontSize: styles.fonts.size.xs }}>{new Date(childFile.created_at || childFile.upload_date).toLocaleDateString('en-GB')}</td>
              <td>
                <Form.Select
                  size="sm"
                  className="rev-select shadow-none"
                  style={{ width: '62px', fontSize: styles.fonts.size.xs, borderRadius: styles.borderRadius.sm, padding: '0.15rem 0.35rem', textAlign: 'center', cursor: 'pointer' }}
                  value={childFile.current_revision || 1}
                  onClick={e => e.stopPropagation()}
                  onChange={e => {
                    e.stopPropagation();
                    const revNum = parseInt(e.target.value, 10);
                    if (!selectedFileObj || selectedFileObj.id !== childFile.id) setSelectedFileObj(childFile);
                    if (hasChildRevisions) onChildRevisionChange(childFile, revNum);
                  }}
                >
                  {hasChildRevisions
                    ? childFile.revisions.map(rev => <option key={rev.revision_number} value={rev.revision_number}>v {rev.revision_number}.0</option>)
                    : <option value={1}>v 1.0</option>}
                </Form.Select>
              </td>
            </tr>
          );
        })}
      </React.Fragment>
    );
  };

  // --- folder row + (when expanded) its nested subfolders and files ---
  const renderFolder = (folder, depth) => {
    const isOpen = !!expanded[folder.id];
    const isSelected = currentFolderId === folder.id;
    const hasChildren = (folder.children || []).length > 0;
    const namePad = depth * INDENT + 4;

    return (
      <React.Fragment key={`folder-${folder.id}`}>
        <tr
          draggable
          onDragStart={e => dragStartFolder(e, folder)}
          onDragOver={e => { e.preventDefault(); setDragOverFolderId(folder.id); }}
          onDragLeave={() => setDragOverFolderId(null)}
          onDrop={e => dropOnTarget(e, folder.id)}
          onClick={() => { setCurrentFolderId(folder.id); toggle(folder.id); }}
          onContextMenu={e => onFolderRightClick(e, folder)}
          style={{
            backgroundColor: dragOverFolderId === folder.id ? styles.colors.iterationSoft : (isSelected ? styles.colors.primarySoft : undefined),
            outline: dragOverFolderId === folder.id ? `1px dashed ${styles.colors.iteration}` : 'none',
          }}
        >
          <td style={{ whiteSpace: 'nowrap', paddingLeft: `${namePad}px` }}>
            <div className="d-flex align-items-center">
              <span
                onClick={e => { e.stopPropagation(); toggle(folder.id); }}
                style={{ width: '16px', display: 'inline-flex', justifyContent: 'center', color: styles.colors.text.muted, flexShrink: 0 }}
              >
                {hasChildren || filesInFolder(folder.id).length > 0 ? (isOpen ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />) : null}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', width: '24px', height: '24px', justifyContent: 'center', flexShrink: 0, marginRight: '12px', color: styles.colors.stage }}>
                {isOpen ? <FaFolderOpen size={15} /> : <FaFolder size={15} />}
              </span>
              <span className="flex-grow-1">
                {folder.name}
                {folder.file_count > 0 && <span style={{ marginLeft: '6px', color: styles.colors.text.muted, fontSize: styles.fonts.size.xs }}>({folder.file_count})</span>}
              </span>
            </div>
          </td>
          <td style={{ whiteSpace: 'nowrap', color: styles.colors.text.muted, fontSize: styles.fonts.size.xs }}>{folder.created_at ? new Date(folder.created_at).toLocaleDateString('en-GB') : ''}</td>
          <td></td>
        </tr>

        {isOpen && (folder.children || []).map(child => renderFolder(child, depth + 1))}
        {isOpen && filesInFolder(folder.id).map(file => renderFileRow(file, depth + 1))}
      </React.Fragment>
    );
  };

  const rootFiles = filesInFolder(null);
  const isEmpty = folderTree.length === 0 && rootFiles.length === 0;

  return (
    <>
      {dropUpload.active && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', marginBottom: '8px', borderRadius: styles.borderRadius.md, backgroundColor: styles.colors.iterationFaint, border: `1px solid ${styles.colors.iterationEdge}`, color: styles.colors.text.light, fontSize: styles.fonts.size.sm }}>
          <Spinner animation="border" size="sm" style={{ width: '15px', height: '15px', color: styles.colors.iteration }} />
          <span>Uploading files… {dropUpload.done}/{dropUpload.total}</span>
        </div>
      )}
      <div
        onContextMenu={onBackgroundRightClick}
        onClick={e => { if (e.target === e.currentTarget) setCurrentFolderId(null); }}
        onDragOver={e => { e.preventDefault(); setDragOverRoot(true); }}
        onDragLeave={() => setDragOverRoot(false)}
        onDrop={e => dropOnTarget(e, null)}
        style={{ minHeight: '400px', outline: dragOverRoot ? `1px dashed ${styles.colors.iteration}` : 'none' }}
      >
        <Table hover className="table-dark file-table" style={{ cursor: 'pointer', fontSize: '0.85rem', marginBottom: 0 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${styles.colors.border}` }}>
              {['Name', 'Date', 'Rev'].map(h => (
                <th key={h} style={{ fontWeight: 500, fontSize: styles.fonts.size.xs, color: styles.colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {folderTree.map(folder => renderFolder(folder, 0))}
            {rootFiles.map(file => renderFileRow(file, 0))}
            {foldersLoading && isEmpty && (
              <tr>
                <td colSpan="3" className="text-muted">
                  <span className="d-flex align-items-center" style={{ gap: '8px' }}>
                    <Spinner animation="border" size="sm" style={{ width: '13px', height: '13px', color: styles.colors.primary }} /> Loading folders…
                  </span>
                </td>
              </tr>
            )}
            {!foldersLoading && isEmpty && (
              <tr>
                <td colSpan="3" style={{ color: styles.colors.text.light, fontSize: styles.fonts.size.sm, padding: '12px 8px' }}>
                  No folders or files yet. Right-click to add a folder, or use the upload buttons above.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {contextMenu.visible && (
        <div
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, backgroundColor: styles.colors.dark, border: `1px solid ${styles.colors.border}`, borderRadius: '4px', padding: '0.5rem 0', zIndex: 1000, minWidth: '160px', fontSize: '0.85rem' }}
          onMouseLeave={hideContextMenu}
        >
          {contextMenu.type === 'folder' && (() => {
            const folder = contextMenu.folderObj;
            const items = [
              { label: 'Download as Zip', action: () => onFolderDownload(folder) },
              { label: 'Upload File Here', action: () => { expand(folder.id); onFolderUpload(folder); } },
              { label: 'New Subfolder', action: () => { expand(folder.id); onFolderNewSubfolder(folder); } },
              { label: 'Copy to iteration/stage…', action: () => onFolderCopyTo(folder) },
              { label: 'Move to iteration/stage…', action: () => onFolderMoveTo(folder) },
              { label: 'Rename', action: () => onFolderRename(folder) },
            ];
            return (
              <>
                {items.map(({ label, action }) => (
                  <div key={label} style={{ padding: '0.375rem 1rem', cursor: 'pointer', color: styles.colors.text.light }}
                    onClick={action}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = styles.colors.darkAlt}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >{label}</div>
                ))}
                <div style={{ padding: '0.375rem 1rem', cursor: 'pointer', color: styles.colors.text.dark, backgroundColor: styles.colors.danger }}
                  onClick={() => onFolderDelete(folder)}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >Delete Folder</div>
              </>
            );
          })()}

          {contextMenu.type === 'background' && [
            { label: 'New Folder', action: onBackgroundNewFolder },
            { label: 'Upload File', action: onBackgroundUpload },
          ].map(({ label, action }) => (
            <div key={label} style={{ padding: '0.375rem 1rem', cursor: 'pointer', color: styles.colors.text.light }}
              onClick={action}
              onMouseOver={e => e.currentTarget.style.backgroundColor = styles.colors.darkAlt}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >{label}</div>
          ))}

          {contextMenu.type === 'file' && (
            <>
              {[
                { label: 'Rename',          action: onRenameOption },
                { label: 'Download',        action: onDownloadOption },
                { label: 'Upload Revision', action: onContextMenuUpload },
                // Qty/price only for manufacturable files, not software/docs.
                ...(!isSoftwareExt(contextMenu.fileObj || {}) ? [
                  { label: 'Set Quantity',    action: onQuantityOption },
                  { label: 'Set Price',       action: onPriceOption },
                ] : []),
                { label: 'Move within…',    action: onMoveOption },
                { label: 'Copy to iteration/stage…', action: onFileCopyTo },
                { label: 'Move to iteration/stage…', action: onFileMoveTo },
              ].map(({ label, action }) => (
                <div key={label} style={{ padding: '0.375rem 1rem', cursor: 'pointer', color: styles.colors.text.light }}
                  onClick={action}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = styles.colors.darkAlt}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >{label}</div>
              ))}
              {/* Fixed white, not a theme text token: `danger` is the same red in both
                  themes, while text.dark (textInverse) is near-black in dark mode -- which
                  made this label unreadable on the red. Hover restores the token on exit so
                  the row doesn't settle on a slightly different red than it started. */}
              <div style={{ padding: '0.375rem 1rem', cursor: 'pointer', color: '#FFFFFF', backgroundColor: styles.colors.danger }}
                onClick={onRemoveOption}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#B91C1C'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = styles.colors.danger}
              >Remove</div>
            </>
          )}
        </div>
      )}

      <input type="file" ref={contextMenuFileInput} onChange={onContextMenuFileChange} style={{ display: 'none' }} />
      <input type="file" ref={childFileInput} onChange={onChildFileChange} style={{ display: 'none' }} />
    </>
  );
}

export default FileList;
