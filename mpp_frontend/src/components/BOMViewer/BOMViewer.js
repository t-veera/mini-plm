import React, { useEffect } from 'react';
import { Table, Form } from 'react-bootstrap';
import * as XLSX from 'xlsx';

function BOMViewer({ prod, updateFile }) {
  const containerKey = prod.selectedContainer
    ? `${prod.containerType}_${prod.selectedContainer.id}`
    : null;

  const containerFiles = containerKey ? (prod.filesByContainer[containerKey] || []) : [];

  const latestFiles = containerFiles.map(file =>
    file.revisions && file.selected_revision_obj ? { ...file, ...file.selected_revision_obj } : file
  );

  const dxfParentFiles = latestFiles.filter(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    return !file.is_child_file && ext === 'dxf';
  });

  const parentFileMap = {};
  dxfParentFiles.forEach(parent => { parentFileMap[parent.id] = []; });
  latestFiles.forEach(file => {
    if (file.is_child_file && parentFileMap.hasOwnProperty(file.parent_file)) {
      parentFileMap[file.parent_file].push(file);
    }
  });

  const spreadsheetFiles = latestFiles.filter(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    return ['xls', 'xlsx', 'csv'].includes(ext);
  });

  useEffect(() => {
    spreadsheetFiles.forEach(file => {
      if (!file.contents && file.dataUrl) {
        try {
          if (file.dataUrl.startsWith('data:')) {
            const base64Content = file.dataUrl.split(',')[1];
            if (!base64Content) return;
            const binaryString = atob(base64Content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            const workbook = XLSX.read(bytes.buffer, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            if (jsonData?.length > 0) {
              const contents = jsonData.map((row, idx) => ({
                id: idx,
                name: row.Component || row.Name || row.Item || Object.values(row)[0] || '',
                label: row.Label || row.Description || '',
                quantity: row.Quantity || row.Qty || row.Amount || 1,
                price: row.Price || row.Cost || row.Value || '',
                ...row
              }));
              updateFile(file.id, { contents });
            }
          }
        } catch (error) {
          console.error('Error parsing spreadsheet file', file.name, error);
        }
      }
    });
  }, [spreadsheetFiles, updateFile]);

  const handleLabelChange    = (fileId, val) => updateFile(fileId, { label: val });
  const handleQuantityChange = (fileId, val) => updateFile(fileId, { quantity: parseInt(val, 10) || 1 });
  const handlePriceChange    = (fileId, val) => updateFile(fileId, { price: val === '' ? '' : (parseFloat(val) || 0) });
  const handleSpreadsheetRowChange = (fileId, rowId, field, value) => updateFile(fileId, { rowId, [field]: value });

  const calculateGroupTotal = (parent) => {
    let total = (parent.quantity || 1) * (parseFloat(parent.price) || 0);
    (parentFileMap[parent.id] || []).forEach(child => { total += (child.quantity || 1) * (parseFloat(child.price) || 0); });
    return total.toFixed(2);
  };

  const calculateSpreadsheetTotal = (file) =>
    Array.isArray(file.contents)
      ? file.contents.reduce((sum, row) => sum + (row.quantity || 1) * (parseFloat(row.price) || 0), 0).toFixed(2)
      : '0.00';

  const calculateGrandTotal = () => {
    let total = 0;
    dxfParentFiles.forEach(parent => {
      total += (parent.quantity || 1) * (parseFloat(parent.price) || 0);
      (parentFileMap[parent.id] || []).forEach(child => { total += (child.quantity || 1) * (parseFloat(child.price) || 0); });
    });
    spreadsheetFiles.forEach(file => {
      if (Array.isArray(file.contents)) total += file.contents.reduce((sum, row) => sum + (row.quantity || 1) * (parseFloat(row.price) || 0), 0);
    });
    return total.toFixed(2);
  };

  const containerLabel = prod.selectedContainer
    ? (prod.selectedContainer.stage_id || prod.selectedContainer.iteration_id || prod.selectedContainer.name || '')
    : '';

  const tableHeaderStyle = { backgroundColor: '#1F2937', padding: '10px 15px', borderRadius: '4px 4px 0 0', marginBottom: 0, borderBottom: '1px solid #374151' };
  const tableStyle = { borderCollapse: 'collapse', borderRadius: '0 0 4px 4px', overflow: 'hidden', border: '1px solid #374151' };
  const inputStyle = { backgroundColor: '#1F2937', color: '#F3F4F6', border: '1px solid #374151' };
  const tableHeadStyle = { backgroundColor: '#1F2937' };

  return (
    <div className="p-3">
      <h4>Bill of Materials: {prod.name?.toUpperCase()} — {containerLabel.toUpperCase() || 'No Container Selected'}</h4>

      {!prod.selectedContainer ? (
        <p className="text-muted">Select a Stage or Iteration to view the BOM.</p>
      ) : (
        <>
          {dxfParentFiles.map(parent => (
            <div key={parent.id} className="mb-4">
              <h5 style={tableHeaderStyle}>{parent.name.split('.')[0]}</h5>
              <Table striped bordered hover variant="dark" className="mb-0" style={tableStyle}>
                <thead>
                  <tr style={tableHeadStyle}>
                    <th style={{ width: '40%' }}>Component</th>
                    <th style={{ width: '25%' }}>Label</th>
                    <th style={{ width: '10%' }}>Qty</th>
                    <th style={{ width: '12%' }}>Price (₹)</th>
                    <th style={{ width: '13%' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: '500' }}>{parent.name}</td>
                    <td><Form.Control size="sm" type="text" placeholder="Add label" defaultValue={parent.label || ''} onBlur={e => handleLabelChange(parent.id, e.target.value)} style={inputStyle} /></td>
                    <td><Form.Control size="sm" type="number" min="1" value={parent.quantity || 1} onChange={e => handleQuantityChange(parent.id, e.target.value)} style={{ ...inputStyle, width: '100%' }} /></td>
                    <td><Form.Control size="sm" type="number" min="0" step="0.01" value={parent.price === '' ? '' : (parseFloat(parent.price) || 0)} onChange={e => handlePriceChange(parent.id, e.target.value)} style={{ ...inputStyle, width: '100%' }} /></td>
                    <td style={{ textAlign: 'right' }}>{((parent.quantity || 1) * (parseFloat(parent.price) || 0)).toFixed(2)}</td>
                  </tr>
                  {(parentFileMap[parent.id] || []).map(child => (
                    <tr key={child.id} style={{ backgroundColor: 'rgba(40,45,50,0.8)' }}>
                      <td style={{ paddingLeft: '25px' }}><span style={{ opacity: 0.8 }}>↳</span> {child.name}</td>
                      <td><Form.Control size="sm" type="text" placeholder="Add label" defaultValue={child.label || ''} onBlur={e => handleLabelChange(child.id, e.target.value)} style={inputStyle} /></td>
                      <td><Form.Control size="sm" type="number" min="1" value={child.quantity || 1} onChange={e => handleQuantityChange(child.id, e.target.value)} style={{ ...inputStyle, width: '100%' }} /></td>
                      <td><Form.Control size="sm" type="number" min="0" step="0.01" value={child.price === '' ? '' : (parseFloat(child.price) || 0)} onChange={e => handlePriceChange(child.id, e.target.value)} style={{ ...inputStyle, width: '100%' }} /></td>
                      <td style={{ textAlign: 'right' }}>{((child.quantity || 1) * (parseFloat(child.price) || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={tableHeadStyle}>
                    <td colSpan="4" className="text-end"><strong>Total</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{calculateGroupTotal(parent)}</strong></td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          ))}

          {spreadsheetFiles.map(file => (
            <div key={file.id} className="mb-4">
              <h5 style={tableHeaderStyle}>{file.name}</h5>
              <Table striped bordered hover variant="dark" className="mb-0" style={tableStyle}>
                <thead>
                  <tr style={tableHeadStyle}>
                    <th style={{ width: '40%' }}>Component</th>
                    <th style={{ width: '25%' }}>Label</th>
                    <th style={{ width: '10%' }}>Qty</th>
                    <th style={{ width: '12%' }}>Price (₹)</th>
                    <th style={{ width: '13%' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(file.contents) && file.contents.map(row => (
                    <tr key={row.id}>
                      <td><Form.Control size="sm" type="text" value={row.name} onBlur={e => handleSpreadsheetRowChange(file.id, row.id, 'name', e.target.value)} style={inputStyle} /></td>
                      <td><Form.Control size="sm" type="text" value={row.label || ''} onBlur={e => handleSpreadsheetRowChange(file.id, row.id, 'label', e.target.value)} style={inputStyle} /></td>
                      <td><Form.Control size="sm" type="number" min="1" value={row.quantity || 1} onChange={e => handleSpreadsheetRowChange(file.id, row.id, 'quantity', e.target.value)} style={{ ...inputStyle, width: '100%' }} /></td>
                      <td><Form.Control size="sm" type="number" min="0" step="0.01" value={row.price === '' ? '' : (parseFloat(row.price) || 0)} onChange={e => handleSpreadsheetRowChange(file.id, row.id, 'price', e.target.value)} style={{ ...inputStyle, width: '100%' }} /></td>
                      <td style={{ textAlign: 'right' }}>{((row.quantity || 1) * (parseFloat(row.price) || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={tableHeadStyle}>
                    <td colSpan="4" className="text-end"><strong>Total</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{calculateSpreadsheetTotal(file)}</strong></td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          ))}

          {dxfParentFiles.length === 0 && spreadsheetFiles.length === 0 && (
            <p className="text-muted">No DXF or spreadsheet files in this container to build a BOM from.</p>
          )}

          <div className="mt-4 p-3" style={{ backgroundColor: '#1F2937', borderRadius: '4px', borderLeft: '4px solid #059669' }}>
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

export default BOMViewer;
