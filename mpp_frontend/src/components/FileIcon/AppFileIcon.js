import React from 'react';

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

function AppFileIcon({ filename, size = 32 }) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  const src = materialIconMap[ext] || materialIconMap.default;

  return (
    <div style={{
      width: size,
      height: size,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <img
        src={src}
        alt={ext}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    </div>
  );
}

export default AppFileIcon;
