import React from 'react';
import { FileIcon, defaultStyles } from 'react-file-icon';

const customBaseStyles = {
  stl:  { color: '#FFD43B', gradientColor: '#e6c200', labelColor: '#FFD43B', glyphColor: 'rgba(0,0,0,0.4)', type: '3d' },
  stp:  { color: '#9775FA', gradientColor: '#7950f2', labelColor: '#9775FA', glyphColor: 'rgba(0,0,0,0.4)', type: '3d' },
  step: { color: '#9775FA', gradientColor: '#7950f2', labelColor: '#9775FA', glyphColor: 'rgba(0,0,0,0.4)', type: '3d' },
  dxf:  { color: '#74C0FC', gradientColor: '#339af0', labelColor: '#74C0FC', glyphColor: 'rgba(0,0,0,0.4)', type: 'vector' },
  ino:  { color: '#FF6B6B', gradientColor: '#f03e3e', labelColor: '#FF6B6B', glyphColor: 'rgba(0,0,0,0.4)', type: 'code' },
  md:   { color: '#74C0FC', gradientColor: '#339af0', labelColor: '#74C0FC', glyphColor: 'rgba(0,0,0,0.4)', type: 'document' },
  txt:  { color: '#9CA3AF', gradientColor: '#6B7280', labelColor: '#9CA3AF', glyphColor: 'rgba(0,0,0,0.4)', type: 'document' },
};

function AppFileIcon({ filename, size = 32 }) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  const baseStyles = defaultStyles[ext] || customBaseStyles[ext] || {
    color: '#74C0FC',
    gradientColor: '#339af0',
    labelColor: '#74C0FC',
    glyphColor: 'rgba(0,0,0,0.4)',
    type: 'document'
  };

  return (
    <div style={{
      width: size,
      height: size,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <FileIcon
        extension={ext.toUpperCase()}
        {...baseStyles}
        radius={3}
        labelUppercase
      />
    </div>
  );
}

export default AppFileIcon;
