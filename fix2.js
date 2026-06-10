const fs = require('fs');
let c = fs.readFileSync('mpp_frontend/src/App.js', 'utf8');

// ============================================================
// FIX 1: Context menu - broken single-quoted template literals
// ============================================================
c = c.replace("backgroundColor: '${styles.colors.dark}',", "backgroundColor: styles.colors.dark,");
c = c.replace("border: '1px solid ${styles.colors.border}',\n            borderRadius: '4px',\n            padding: '0.5rem 0',\n            zIndex: 1000,", "border: `1px solid ${styles.colors.border}`,\n            borderRadius: '4px',\n            padding: '0.5rem 0',\n            zIndex: 1000,");
c = c.replace(/color: '\$\{styles\.colors\.text\.light\}'/g, 'color: styles.colors.text.light');
c = c.replace(/e\.target\.style\.backgroundColor = '\$\{styles\.colors\.darkAlt\}'/g, "e.target.style.backgroundColor = styles.colors.darkAlt");

// ============================================================
// FIX 2: Add confirmModal + moveModal state
// ============================================================
c = c.replace(
  "const [showPriceModal, setShowPriceModal] = useState(false);",
  "const [showPriceModal, setShowPriceModal] = useState(false);\n  const [confirmModal, setConfirmModal] = useState({ visible: false, message: '', onConfirm: null });\n  const [moveModal, setMoveModal] = useState({ visible: false, fileToMove: null, containers: [], selected: '' });"
);

// ============================================================
// FIX 3: handleRemoveOption — replace window.confirm
// ============================================================
c = c.replace(
  "  if (!window.confirm(confirmMessage)) {\n    hideContextMenu();\n    return;\n  }\n\n  try {\n    // Collect all files to delete (parent + children)",
  "  hideContextMenu();\n  setConfirmModal({ visible: true, message: confirmMessage, onConfirm: async () => {\n    setConfirmModal({ visible: false, message: '', onConfirm: null });\n    try {\n    // Collect all files to delete (parent + children)"
);
// Close the onConfirm callback (catch block is unique to this function)
c = c.replace(
  "  } catch (error) {\n    console.error('Error removing file(s):', error);\n    setToastMsg(`Failed to remove file: ${error.message}`);\n  }\n  \n  hideContextMenu();\n}",
  "    } catch (error) {\n      console.error('Error removing file(s):', error);\n      setToastMsg(`Failed to remove file: ${error.message}`);\n    }\n  }});\n}"
);

// ============================================================
// FIX 4: handleContainerRightClick — replace window.confirm
// ============================================================
c = c.replace(
  "    const confirmDel = window.confirm(`Delete ${containerLabel}? It's empty and will be removed.`);\n    if (!confirmDel) return;\n\n    try {\n      // Delete from backend",
  "    setConfirmModal({ visible: true, message: `Delete ${containerLabel}? It's empty and will be removed.`, onConfirm: async () => {\n      setConfirmModal({ visible: false, message: '', onConfirm: null });\n      try {\n      // Delete from backend"
);
c = c.replace(
  "    } catch (error) {\n      console.error(`Error deleting ${type}:`, error);\n      setToastMsg(`Failed to delete ${type}: ${error.message}`);\n    }\n  }",
  "      } catch (error) {\n        console.error(`Error deleting ${type}:`, error);\n        setToastMsg(`Failed to delete ${type}: ${error.message}`);\n      }\n    }});\n  }"
);

// ============================================================
// FIX 5: handleMoveOption — replace prompt with modal
// Split rest of move logic into handleMoveConfirm()
// ============================================================
c = c.replace(
  "    // Show available containers to user\n    const containerList = availableContainers.map(c => `${c.label} (${c.name})`).join(', ');\n    const targetLabel = prompt(`Enter container to move file to.\\nAvailable: ${containerList}\\n\\nEnter (e.g., S1, I2):`);\n    \n    if (!targetLabel) return;",
  "    setMoveModal({ visible: true, fileToMove, containers: availableContainers, selected: availableContainers[0]?.label || '' });\n  }\n\n  async function handleMoveConfirm() {\n    const { fileToMove, selected: targetLabel } = moveModal;\n    setMoveModal({ visible: false, fileToMove: null, containers: [], selected: '' });\n    const prod = products[selectedProductIndex];\n    const availableContainers = [\n      ...(prod.stages || []).map(s => ({ id: s.id, label: s.stage_id, name: s.name, type: 'stage' })),\n      ...(prod.iterations || []).map(i => ({ id: i.id, label: i.iteration_id, name: i.name, type: 'iteration' }))\n    ];"
);

// ============================================================
// FIX 6: Add ConfirmModal + MoveModal JSX before hidden inputs
// ============================================================
const modalJSX =
  "\n      {/* Confirm Modal */}\n" +
  "      {confirmModal.visible && (\n" +
  "        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1060 }}>\n" +
  "          <div style={{ backgroundColor: styles.colors.dark, border: `1px solid ${styles.colors.border}`, borderRadius: '6px', padding: '1.5rem', width: '380px', maxWidth: '90%' }}>\n" +
  "            <p style={{ color: styles.colors.text.light, marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: '1.5' }}>{confirmModal.message}</p>\n" +
  "            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>\n" +
  "              <button className='btn btn-secondary btn-sm' onClick={() => setConfirmModal({ visible: false, message: '', onConfirm: null })}>Cancel</button>\n" +
  "              <button className='btn btn-danger btn-sm' onClick={confirmModal.onConfirm}>Confirm</button>\n" +
  "            </div>\n" +
  "          </div>\n" +
  "        </div>\n" +
  "      )}\n\n" +
  "      {/* Move Modal */}\n" +
  "      {moveModal.visible && (\n" +
  "        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1060 }}>\n" +
  "          <div style={{ backgroundColor: styles.colors.dark, border: `1px solid ${styles.colors.border}`, borderRadius: '6px', padding: '1.5rem', width: '380px', maxWidth: '90%' }}>\n" +
  "            <h6 style={{ color: styles.colors.text.light, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Move File</h6>\n" +
  "            <p style={{ color: styles.colors.text.muted, marginBottom: '1rem', fontSize: '0.8rem' }}>{moveModal.fileToMove?.name}</p>\n" +
  "            <select\n" +
  "              className='form-select form-select-sm mb-3'\n" +
  "              style={{ backgroundColor: styles.colors.darkAlt, color: styles.colors.text.light, border: `1px solid ${styles.colors.border}` }}\n" +
  "              value={moveModal.selected}\n" +
  "              onChange={e => setMoveModal(prev => ({ ...prev, selected: e.target.value }))}\n" +
  "            >\n" +
  "              {moveModal.containers.map(cont => (\n" +
  "                <option key={cont.id} value={cont.label}>{cont.label} — {cont.name} ({cont.type})</option>\n" +
  "              ))}\n" +
  "            </select>\n" +
  "            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>\n" +
  "              <button className='btn btn-secondary btn-sm' onClick={() => setMoveModal({ visible: false, fileToMove: null, containers: [], selected: '' })}>Cancel</button>\n" +
  "              <button className='btn btn-primary btn-sm' onClick={handleMoveConfirm}>Move</button>\n" +
  "            </div>\n" +
  "          </div>\n" +
  "        </div>\n" +
  "      )}\n\n";

c = c.replace("      {/* Hidden file inputs */}", modalJSX + "      {/* Hidden file inputs */}");

fs.writeFileSync('mpp_frontend/src/App.js', c);
console.log('Done.');
