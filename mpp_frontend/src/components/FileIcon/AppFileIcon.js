import React from 'react';
import { FileIcon, defaultStyles } from 'react-file-icon';

// ── Material icon mapping ─────────────────────────────────────────────────────
const materialIconMap = {
  pdf:     '/icons/material/pdf.svg',
  png:     '/icons/material/image.svg',
  jpg:     '/icons/material/image.svg',
  jpeg:    '/icons/material/image.svg',
  gif:     '/icons/material/image.svg',
  stl:     '/icons/material/3d.svg',
  dxf:     '/icons/material/3d.svg',
  stp:     '/icons/material/3d.svg',
  step:    '/icons/material/3d.svg',
  cpp:     '/icons/material/cpp.svg',
  py:      '/icons/material/python.svg',
  js:      '/icons/material/javascript.svg',
  xlsx:    '/icons/material/table.svg',
  xls:     '/icons/material/table.svg',
  csv:     '/icons/material/table.svg',
  md:      '/icons/material/markdown.svg',
  ino:     '/icons/material/arduino.svg',
  doc:     '/icons/material/word.svg',
  docx:    '/icons/material/word.svg',
  default: '/icons/material/document.svg',
};

// ── Catppuccin Mocha palette overrides for react-file-icon ───────────────────
const catppuccinStyles = {
  pdf:     { color: '#f38ba8', gradientColor: '#eba0ac', labelColor: '#f38ba8', glyphColor: '#1e1e2e' },
  png:     { color: '#89dceb', gradientColor: '#74c7ec', labelColor: '#89dceb', glyphColor: '#1e1e2e' },
  jpg:     { color: '#89dceb', gradientColor: '#74c7ec', labelColor: '#89dceb', glyphColor: '#1e1e2e' },
  jpeg:    { color: '#89dceb', gradientColor: '#74c7ec', labelColor: '#89dceb', glyphColor: '#1e1e2e' },
  gif:     { color: '#89dceb', gradientColor: '#74c7ec', labelColor: '#89dceb', glyphColor: '#1e1e2e' },
  stl:     { color: '#f9e2af', gradientColor: '#fab387', labelColor: '#f9e2af', glyphColor: '#1e1e2e' },
  dxf:     { color: '#89b4fa', gradientColor: '#74c7ec', labelColor: '#89b4fa', glyphColor: '#1e1e2e' },
  stp:     { color: '#cba6f7', gradientColor: '#b4befe', labelColor: '#cba6f7', glyphColor: '#1e1e2e' },
  step:    { color: '#cba6f7', gradientColor: '#b4befe', labelColor: '#cba6f7', glyphColor: '#1e1e2e' },
  cpp:     { color: '#89b4fa', gradientColor: '#74c7ec', labelColor: '#89b4fa', glyphColor: '#1e1e2e' },
  py:      { color: '#a6e3a1', gradientColor: '#94e2d5', labelColor: '#a6e3a1', glyphColor: '#1e1e2e' },
  js:      { color: '#f9e2af', gradientColor: '#fab387', labelColor: '#f9e2af', glyphColor: '#1e1e2e' },
  xlsx:    { color: '#a6e3a1', gradientColor: '#94e2d5', labelColor: '#a6e3a1', glyphColor: '#1e1e2e' },
  xls:     { color: '#a6e3a1', gradientColor: '#94e2d5', labelColor: '#a6e3a1', glyphColor: '#1e1e2e' },
  csv:     { color: '#a6e3a1', gradientColor: '#94e2d5', labelColor: '#a6e3a1', glyphColor: '#1e1e2e' },
  md:      { color: '#89b4fa', gradientColor: '#74c7ec', labelColor: '#89b4fa', glyphColor: '#1e1e2e' },
  ino:     { color: '#94e2d5', gradientColor: '#89dceb', labelColor: '#94e2d5', glyphColor: '#1e1e2e' },
  doc:     { color: '#89b4fa', gradientColor: '#74c7ec', labelColor: '#89b4fa', glyphColor: '#1e1e2e' },
  docx:    { color: '#89b4fa', gradientColor: '#74c7ec', labelColor: '#89b4fa', glyphColor: '#1e1e2e' },
  default: { color: '#cdd6f4', gradientColor: '#bac2de', labelColor: '#cdd6f4', glyphColor: '#1e1e2e' },
};

// ── Minimal monochrome ────────────────────────────────────────────────────────
const minimalStyle = {
  color: '#4B5563',
  gradientColor: '#6B7280',
  labelColor: '#4B5563',
  glyphColor: 'rgba(255,255,255,0.4)',
  foldColor: '#374151',
};

// ── Custom styles for extensions missing from defaultStyles ──────────────────
const customBaseStyles = {
  stl:  { color: '#FFD43B', gradientColor: '#FFD43B', labelColor: '#FFD43B', type: '3d' },
  stp:  { color: '#9775FA', gradientColor: '#9775FA', labelColor: '#9775FA', type: '3d' },
  step: { color: '#9775FA', gradientColor: '#9775FA', labelColor: '#9775FA', type: '3d' },
  dxf:  { color: '#6B7280', gradientColor: '#6B7280', labelColor: '#6B7280', type: 'vector' },
  ino:  { color: '#FF6B6B', gradientColor: '#FF6B6B', labelColor: '#FF6B6B', type: 'code' },
  md:   { color: '#74C0FC', gradientColor: '#74C0FC', labelColor: '#74C0FC', type: 'document' },
};

function AppFileIcon({ filename, theme = 'material', size = 24 }) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();

  // ── Material theme: serve actual SVG files ──────────────────────────────────
  if (theme === 'material') {
    const src = materialIconMap[ext] || materialIconMap.default;
    return (
      <div style={{ width: size, height: size, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={src} alt={ext} style={{ width: size, height: size, objectFit: 'contain' }} />
      </div>
    );
  }

  // ── Catppuccin + Minimal: use react-file-icon with palette overrides ────────
  const baseStyles = defaultStyles[ext] || customBaseStyles[ext] || {};
  const overrides = theme === 'catppuccin'
    ? (catppuccinStyles[ext] || catppuccinStyles.default)
    : minimalStyle;

  return (
    <div style={{ width: size, height: size, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <FileIcon
        extension={ext.toUpperCase()}
        {...baseStyles}
        {...overrides}
        radius={2}
        labelUppercase
      />
    </div>
  );
}

export default AppFileIcon;
