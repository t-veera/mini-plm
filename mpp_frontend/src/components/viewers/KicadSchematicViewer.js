import React from 'react';
import KicadCanvas from './KicadCanvas';
import parseAndRender from './kicadSchRenderer';

/*
 * KiCad schematic (.kicad_sch) viewer — renders the sheet the way it looks in
 * Eeschema, in a shared pan/zoom canvas.
 */
export default function KicadSchematicViewer({ fileUrl }) {
  return (
    <KicadCanvas
      fileUrl={fileUrl}
      parse={parseAndRender}
      kind="schematic"
      renderStats={(s) => `${s.symbols || 0} sym · ${s.wires || 0} wires${s.sheets ? ` · ${s.sheets} sheets` : ''}`}
    />
  );
}
