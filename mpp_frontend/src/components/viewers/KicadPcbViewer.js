import React from 'react';
import KicadCanvas from './KicadCanvas';
import { parseAndRenderPcb } from './kicadPcbRenderer';

/*
 * KiCad PCB (.kicad_pcb) viewer — renders a top-down composite of the board
 * (outline, copper zones/tracks, pads, vias, silkscreen) the way it looks in
 * the KiCad PCB editor, in a shared pan/zoom canvas.
 */
export default function KicadPcbViewer({ fileUrl }) {
  return (
    <KicadCanvas
      fileUrl={fileUrl}
      parse={parseAndRenderPcb}
      kind="board"
      renderStats={(s) =>
        `${s.footprints || 0} fp · ${s.pads || 0} pads${s.tracks ? ` · ${s.tracks} tracks` : ''}${
          s.vias ? ` · ${s.vias} vias` : ''
        }`
      }
    />
  );
}
