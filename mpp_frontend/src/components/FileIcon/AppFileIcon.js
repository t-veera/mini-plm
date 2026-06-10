import React from 'react';
import { FileIcon, defaultStyles } from 'react-file-icon';

const minimalOverride = {
  color: '#4B5563',
  gradientColor: '#6B7280',
  labelColor: '#4B5563',
  glyphColor: '#9CA3AF',
  foldColor: '#374151',
};

const neonOverrides = {
  pdf:     { color: '#ff0055', gradientColor: '#ff0055', labelColor: '#ff0055' },
  png:     { color: '#00ffcc', gradientColor: '#00ffcc', labelColor: '#00ffcc' },
  jpg:     { color: '#00ffcc', gradientColor: '#00ffcc', labelColor: '#00ffcc' },
  jpeg:    { color: '#00ffcc', gradientColor: '#00ffcc', labelColor: '#00ffcc' },
  gif:     { color: '#00ffcc', gradientColor: '#00ffcc', labelColor: '#00ffcc' },
  stl:     { color: '#ffe600', gradientColor: '#ffe600', labelColor: '#ffe600' },
  dxf:     { color: '#00cfff', gradientColor: '#00cfff', labelColor: '#00cfff' },
  stp:     { color: '#bf00ff', gradientColor: '#bf00ff', labelColor: '#bf00ff' },
  step:    { color: '#bf00ff', gradientColor: '#bf00ff', labelColor: '#bf00ff' },
  doc:     { color: '#0066ff', gradientColor: '#0066ff', labelColor: '#0066ff' },
  docx:    { color: '#0066ff', gradientColor: '#0066ff', labelColor: '#0066ff' },
  js:      { color: '#ff00aa', gradientColor: '#ff00aa', labelColor: '#ff00aa' },
  xlsx:    { color: '#00ff88', gradientColor: '#00ff88', labelColor: '#00ff88' },
  xls:     { color: '#00ff88', gradientColor: '#00ff88', labelColor: '#00ff88' },
  csv:     { color: '#00ff88', gradientColor: '#00ff88', labelColor: '#00ff88' },
  py:      { color: '#aa00ff', gradientColor: '#aa00ff', labelColor: '#aa00ff' },
  cpp:     { color: '#ff6600', gradientColor: '#ff6600', labelColor: '#ff6600' },
  md:      { color: '#00ccff', gradientColor: '#00ccff', labelColor: '#00ccff' },
  ino:     { color: '#ff3300', gradientColor: '#ff3300', labelColor: '#ff3300' },
};

function AppFileIcon({ filename, theme = 'default', size = 24 }) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  const baseStyles = defaultStyles[ext] || {};

  let overrides = {};
  if (theme === 'minimal') {
    overrides = minimalOverride;
  } else if (theme === 'neon') {
    overrides = neonOverrides[ext] || { color: '#ffffff', gradientColor: '#ffffff', labelColor: '#ffffff' };
  }

  return (
    <div style={{ width: size, height: size, flexShrink: 0 }}>
      <FileIcon
        extension={ext}
        {...baseStyles}
        {...overrides}
        radius={2}
      />
    </div>
  );
}

export default AppFileIcon;
