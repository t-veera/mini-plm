import React from 'react';
import { Table, Form } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa';
import AppFileIcon from '../FileIcon/AppFileIcon';
import styles from '../../constants/styles';

const showQtyPriceExtensions = ['dxf', 'step', 'stp', 'stl', 'kicad_sch', 'gbr', 'gerber', 'kicad_pcb'];

function shouldShowQtyPrice(fileObj) {
  return showQtyPriceExtensions.includes((fileObj.file_extension || '').toLowerCase());
}

function FileList({
  prod,
  selectedFileObj,
  setSelectedFileObj,
  contextMenu,
  onFileRightClick,
  onAddChildClick,
  onQuantityClick,
  onPriceClick,
  onRevisionChange,
  onChildRevisionChange,
  onContextMenuUpload,
  onQuantityOption,
  onPriceOption,
  onMoveOption,
  onRemoveOption,
  hideContextMenu,
  contextMenuFileInput,
  childFileInput,
  onContextMenuFileChange,
  onChildFileChange,
  activeTheme = 'default',
}) {
  if (!prod.selectedContainer || !prod.containerType) {
    return <p className="text-muted" style={{ fontSize: '0.85rem' }}>Select a Stage or Iteration on the left to see or upload files.</p>;
  }

  const containerKey = `${prod.containerType}_${prod.selectedContainer.id}`;
  const containerFiles = prod.filesByContainer[containerKey] || [];
  const parentFiles = containerFiles.filter(file => !file.is_child_file);

  return (
    <>
      <Table hover borderless className="table-dark table-sm" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #555' }}>
            <th style={{ fontWeight: '200' }}>Name</th>
            <th style={{ fontWeight: '200' }}>Date</th>
            <th style={{ fontWeight: '200' }}>Rev</th>
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
            parentFiles.map((fileObj) => {
              const icon = <AppFileIcon filename={fileObj.name} theme={activeTheme} size={24} />;
              const hasRevisions = fileObj.revisions?.length > 0;
              const childFiles = containerFiles.filter(f => f.parent_file === fileObj.id);

              return (
                <React.Fragment key={fileObj.id}>
                  <tr
                    onClick={() => setSelectedFileObj(fileObj)}
                    className={selectedFileObj?.id === fileObj.id ? 'selected-file-row' : ''}
                  >
                    <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }} onContextMenu={e => onFileRightClick(e, fileObj)}>
                      <div className="d-flex align-items-center">
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0, marginRight: '6px' }}>{icon}</span>
                        <span className="flex-grow-1">{fileObj.name}</span>
                        <div className="ms-1" onClick={e => onAddChildClick(e, fileObj)} style={{ cursor: 'pointer', color: styles.colors.secondary }}>
                          <FaPlus size={10} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', minWidth: '120px', justifyContent: 'flex-end', gap: '4px' }}>
                          <span className="badge bg-warning" style={{ cursor: 'pointer', fontSize: '0.7rem', minWidth: '45px', visibility: (shouldShowQtyPrice(fileObj) && fileObj.quantity) ? 'visible' : 'hidden' }} onClick={e => onQuantityClick(e, fileObj)}>
                            {fileObj.quantity ? `Qty: ${fileObj.quantity}` : 'Qty: 0'}
                          </span>
                          <span className="badge bg-success" style={{ cursor: 'pointer', fontSize: '0.7rem', minWidth: '55px', visibility: (shouldShowQtyPrice(fileObj) && fileObj.price) ? 'visible' : 'hidden' }} onClick={e => onPriceClick(e, fileObj)}>
                            {fileObj.price ? `₹${fileObj.price}` : '₹0'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
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
                        style={{ width: '80px', backgroundColor: styles.colors.darkAlt, color: styles.colors.text.light, border: `1px solid ${styles.colors.border}`, fontSize: styles.fonts.size.sm, borderRadius: styles.borderRadius.sm, padding: '0.25rem 0.5rem', textAlign: 'center', cursor: 'pointer' }}
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
                    const childIcon = <AppFileIcon filename={childFile.name} theme={activeTheme} size={24} />;
                    const hasChildRevisions = childFile.revisions?.length > 0;
                    return (
                      <tr key={childFile.id} onClick={() => setSelectedFileObj(childFile)} style={selectedFileObj?.id === childFile.id ? { backgroundColor: 'rgba(108,117,125,0.6)' } : {}}>
                        <td style={{ whiteSpace: 'normal', wordBreak: 'break-word', paddingLeft: '32px', position: 'relative' }} onContextMenu={e => onFileRightClick(e, childFile)}>
                          <div className="d-flex align-items-center">
                            <span style={{ position: 'absolute', left: '8px', color: '#6c757d', fontSize: '0.7rem' }}>└</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: 0, marginRight: '6px' }}>{childIcon}</span>
                            <span style={{ marginLeft: '4px', minWidth: 0, flex: '1 1 auto' }}>{childFile.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', minWidth: '120px', justifyContent: 'flex-end', gap: '4px' }}>
                              <span className="badge bg-warning" style={{ cursor: 'pointer', fontSize: '0.7rem', minWidth: '45px', visibility: (shouldShowQtyPrice(childFile) && childFile.quantity) ? 'visible' : 'hidden' }} onClick={e => onQuantityClick(e, childFile)}>
                                {childFile.quantity ? `Qty: ${childFile.quantity}` : 'Qty: 0'}
                              </span>
                              <span className="badge bg-success" style={{ cursor: 'pointer', fontSize: '0.7rem', minWidth: '55px', visibility: (shouldShowQtyPrice(childFile) && childFile.price) ? 'visible' : 'hidden' }} onClick={e => onPriceClick(e, childFile)}>
                                {childFile.price ? `₹${childFile.price}` : '₹0'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(childFile.created_at || childFile.upload_date).toLocaleDateString()}</td>
                        <td>
                          <Form.Select
                            size="sm"
                            style={{ width: '80px', backgroundColor: styles.colors.darkAlt, color: styles.colors.text.light, border: `1px solid ${styles.colors.border}`, fontSize: '0.8rem', textAlign: 'center' }}
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
            })
          )}
        </tbody>
      </Table>

      {contextMenu.visible && (
        <div
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, backgroundColor: styles.colors.dark, border: `1px solid ${styles.colors.border}`, borderRadius: '4px', padding: '0.5rem 0', zIndex: 1000, minWidth: '150px', fontSize: '0.85rem' }}
          onMouseLeave={hideContextMenu}
        >
          {[
            { label: 'Upload Revision', action: onContextMenuUpload },
            { label: 'Set Quantity',    action: onQuantityOption },
            { label: 'Set Price',       action: onPriceOption },
            { label: 'Move',            action: onMoveOption },
          ].map(({ label, action }) => (
            <div key={label} style={{ padding: '0.375rem 1rem', cursor: 'pointer', color: styles.colors.text.light }}
              onClick={action}
              onMouseOver={e => e.currentTarget.style.backgroundColor = styles.colors.darkAlt}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >{label}</div>
          ))}
          <div style={{ padding: '0.375rem 1rem', cursor: 'pointer', color: styles.colors.text.light, backgroundColor: '#dc3545' }}
            onClick={onRemoveOption}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#c82333'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#dc3545'}
          >Remove</div>
        </div>
      )}

      <input type="file" ref={contextMenuFileInput} onChange={onContextMenuFileChange} style={{ display: 'none' }} />
      <input type="file" ref={childFileInput} onChange={onChildFileChange} style={{ display: 'none' }} />
    </>
  );
}

export default FileList;



