import React from 'react';
import { Form } from 'react-bootstrap';
import styles from '../../constants/styles';

export function ConfirmModal({ modal }) {
  if (!modal.visible) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: styles.colors.overlay, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1060 }}>
      <div style={{ backgroundColor: styles.colors.dark, border: `1px solid ${styles.colors.border}`, borderRadius: '6px', padding: '1.5rem', width: '380px', maxWidth: '90%' }}>
        <p style={{ color: styles.colors.text.light, marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: '1.5' }}>{modal.message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={modal.onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={modal.onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

export function InputModal({ modal, setModal }) {
  if (!modal.visible) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: styles.colors.overlay, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1060 }}>
      <div style={{ backgroundColor: styles.colors.dark, border: `1px solid ${styles.colors.border}`, borderRadius: '6px', padding: '1.5rem', width: '380px', maxWidth: '90%' }}>
        <h6 style={{ color: styles.colors.text.light, marginBottom: '1rem', fontSize: '0.9rem' }}>{modal.title}</h6>
        <input
          type="text"
          className="form-control form-control-sm mb-3"
          style={{ backgroundColor: styles.colors.darkAlt, color: styles.colors.text.light, border: `1px solid ${styles.colors.border}` }}
          placeholder={modal.placeholder}
          value={modal.value}
          autoFocus
          onChange={e => setModal(prev => ({ ...prev, value: e.target.value }))}
          // Both keys are consumed here: the modal is on top, so its Escape must not
          // also reach whatever it opened over -- the trace inspector closes on Escape
          // too, and would otherwise disappear behind this dialog on the same press.
          onKeyDown={e => {
            if (e.key === 'Enter') { e.stopPropagation(); modal.onConfirm(modal.value); }
            if (e.key === 'Escape') { e.stopPropagation(); modal.onCancel(); }
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={modal.onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => modal.onConfirm(modal.value)}>OK</button>
        </div>
      </div>
    </div>
  );
}

export function MoveModal({ modal, setModal, onConfirm }) {
  if (!modal.visible) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: styles.colors.overlay, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1060 }}>
      <div style={{ backgroundColor: styles.colors.dark, border: `1px solid ${styles.colors.border}`, borderRadius: '6px', padding: '1.5rem', width: '380px', maxWidth: '90%' }}>
        <h6 style={{ color: styles.colors.text.light, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Move File</h6>
        <p style={{ color: styles.colors.text.muted, marginBottom: '1rem', fontSize: '0.8rem' }}>{modal.fileToMove?.name}</p>
        <select
          className="form-select form-select-sm mb-3"
          style={{ backgroundColor: styles.colors.darkAlt, color: styles.colors.text.light, border: `1px solid ${styles.colors.border}` }}
          value={modal.selected}
          onChange={e => setModal(prev => ({ ...prev, selected: e.target.value }))}
        >
          {modal.containers.map(cont => (
            <option key={cont.id} value={cont.label}>{cont.label} — {cont.name} ({cont.type})</option>
          ))}
        </select>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setModal({ visible: false, fileToMove: null, containers: [], selected: '' })}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={onConfirm}>Move</button>
        </div>
      </div>
    </div>
  );
}

export function QuantityModal({ show, currentFile, onSave, onCancel }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: styles.colors.overlay, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050 }}>
      <div style={{ backgroundColor: styles.colors.dark, border: `1px solid ${styles.colors.border}`, borderRadius: '4px', padding: '1.5rem', width: '400px', maxWidth: '90%', fontSize: '0.9rem' }}>
        <h5 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Set Quantity</h5>
        <Form onSubmit={e => { e.preventDefault(); onSave(e.target.elements.quantity.value); }}>
          <Form.Group className="mb-3">
            <Form.Control type="number" name="quantity" min="1" placeholder="Enter quantity" defaultValue={currentFile?.quantity || ''} style={{ backgroundColor: styles.colors.darkAlt, color: styles.colors.text.light, border: `1px solid ${styles.colors.border}`, fontSize: '0.9rem' }} />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Save</button>
          </div>
        </Form>
      </div>
    </div>
  );
}

export function PriceModal({ show, currentFile, onSave, onCancel }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: styles.colors.overlay, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050 }}>
      <div style={{ backgroundColor: styles.colors.dark, border: `1px solid ${styles.colors.border}`, borderRadius: '4px', padding: '1.5rem', width: '400px', maxWidth: '90%', fontSize: '0.9rem' }}>
        <h5 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Set Price (INR)</h5>
        <Form onSubmit={e => { e.preventDefault(); onSave(e.target.elements.price.value); }}>
          <Form.Group className="mb-3">
            <Form.Control type="number" name="price" min="0.01" step="0.01" placeholder="Enter price in INR" defaultValue={currentFile?.price || ''} style={{ backgroundColor: styles.colors.darkAlt, color: styles.colors.text.light, border: `1px solid ${styles.colors.border}`, fontSize: '0.9rem' }} />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Save</button>
          </div>
        </Form>
      </div>
    </div>
  );
}

export function ChangeDescriptionModal({ show, tempDescription, setTempDescription, onSave, onCancel }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: styles.colors.overlay, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050 }}>
      <div style={{ backgroundColor: styles.colors.dark, border: `1px solid ${styles.colors.border}`, borderRadius: '4px', padding: '1.5rem', width: '500px', maxWidth: '90%', fontSize: '0.9rem' }}>
        <h5 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Revision Summary</h5>
        <Form onSubmit={e => { e.preventDefault(); onSave(tempDescription); }}>
          <Form.Group className="mb-3">
            <Form.Control type="text" placeholder="Describe the changes made in this upload" value={tempDescription} onChange={e => setTempDescription(e.target.value)} style={{ backgroundColor: styles.colors.darkAlt, color: styles.colors.text.light, border: `1px solid ${styles.colors.border}`, fontSize: '0.9rem' }} />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onSave(tempDescription)}>Save</button>
          </div>
        </Form>
      </div>
    </div>
  );
}
