import React from 'react';
import { Form } from 'react-bootstrap';
import { FaPlus, FaUpload, FaEye, FaTable, FaChartLine, FaToriiGate, FaDrumSteelpan, FaFolderPlus } from 'react-icons/fa';
import styles from '../../constants/styles';

/** One toolbar button. Exported so other surfaces can add icons with the same look. */
export function ToolbarIcon({ icon, label, onClick, color, active = false }) {
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

/**
 * The shared dashboard toolbar: product picker, create/upload actions, and the
 * view-mode switcher (Files / BOM / KPIs). Every dashboard renders this same
 * component at the top of its left panel, so icons stay in one place as more are added.
 *
 * The hidden file/folder pickers live here too — they're what the upload icons click,
 * so they travel with the toolbar rather than being mounted separately per view.
 */
function Toolbar({
  products,
  selectedProductIndex,
  onSelectProduct,
  onCreateProduct,
  onAddIteration,
  onAddStage,
  onUploadFile,
  onUploadFolder,
  viewMode,
  setViewMode,
  hiddenFileInput,
  folderInput,
  onFileChange,
  onFolderInputChange,
}) {
  return (
    <>
      <div
        className="d-flex justify-content-between align-items-center"
        style={{
          marginBottom: '0.5rem', paddingBottom: '0.5rem',
          borderBottom: `1px solid ${styles.colors.border}`,
          gap: '8px',
          // Wrap instead of squeezing: in a narrow left panel the icons drop to a second
          // row and the product name stays readable.
          flexWrap: 'wrap',
        }}
      >
        <div className="d-flex align-items-center" style={{ gap: '2px', flexShrink: 0 }}>
          <Form.Select
            size="sm"
            value={selectedProductIndex}
            onChange={onSelectProduct}
            className="shadow-none product-select"
            style={{
              width: 'auto', minWidth: '130px', maxWidth: '210px',
              color: styles.colors.text.light, fontSize: styles.fonts.size.sm,
              fontWeight: 600, letterSpacing: '0.3px', paddingLeft: '4px',
              borderRadius: styles.borderRadius.md, cursor: 'pointer', textOverflow: 'ellipsis',
            }}
          >
            {products.map((p, idx) => (
              <option key={idx} value={idx} style={{ background: styles.colors.dark, fontWeight: 400 }}>
                {p.name.toUpperCase()}
              </option>
            ))}
          </Form.Select>
          <ToolbarIcon label="New product" onClick={onCreateProduct} icon={<FaPlus size={13} />} />
        </div>

        <div className="d-flex align-items-center" style={{ gap: '1px' }}>
          <ToolbarIcon label="Add iteration" onClick={onAddIteration} color={styles.colors.iteration} icon={<FaDrumSteelpan size={16} />} />
          <ToolbarIcon label="Add stage" onClick={onAddStage} color={styles.colors.stage} icon={<FaToriiGate size={16} />} />
          <ToolbarIcon label="Upload file" onClick={onUploadFile} icon={<FaUpload size={15} />} />
          <ToolbarIcon label="Upload folder" onClick={onUploadFolder} icon={<FaFolderPlus size={15} />} />
          <div style={{ width: '1px', height: '18px', background: styles.colors.border, margin: '0 5px' }} />
          <ToolbarIcon label="Files" onClick={() => setViewMode('normal')} active={viewMode === 'normal'} icon={<FaEye size={16} />} />
          <ToolbarIcon label="BOM" onClick={() => setViewMode('bom')} active={viewMode === 'bom'} icon={<FaTable size={15} />} />
          <ToolbarIcon label="KPIs" onClick={() => setViewMode('kpi')} active={viewMode === 'kpi'} icon={<FaChartLine size={15} />} />
        </div>
      </div>

      <input type="file" multiple ref={hiddenFileInput} onChange={onFileChange} style={{ display: 'none' }} />
      {/* Folder picker: webkitdirectory/directory set imperatively so the browser lets
          the user choose a whole folder and delivers every file with webkitRelativePath. */}
      <input
        type="file"
        multiple
        ref={el => {
          folderInput.current = el;
          if (el) { el.setAttribute('webkitdirectory', ''); el.setAttribute('directory', ''); }
        }}
        onChange={onFolderInputChange}
        style={{ display: 'none' }}
      />
    </>
  );
}

export default Toolbar;
