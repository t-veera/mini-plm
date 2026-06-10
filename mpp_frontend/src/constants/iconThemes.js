import React from 'react';
import {
  FaRegFilePdf, FaImage, FaFileAlt, FaFileCode, FaJs, FaPython,
  FaCodepen, FaCode, FaCube, FaDraftingCompass, FaFileWord, FaCogs,
  FaFile, FaFileImage, FaFilePdf, FaFileArchive
} from 'react-icons/fa';
import {
  SiAutocad
} from 'react-icons/si';
import {
  VscFilePdf, VscFileCode, VscFile, VscFileMedia
} from 'react-icons/vsc';

const themes = {
  default: {
    label: 'Default',
    description: 'Colourful icons per file type',
    icons: {
      pdf:     <FaRegFilePdf size={18} style={{ color: '#ff3d3d' }} />,
      png:     <FaImage size={18} style={{ color: '#63E6BE' }} />,
      jpg:     <FaImage size={18} style={{ color: '#63E6BE' }} />,
      jpeg:    <FaImage size={18} style={{ color: '#63E6BE' }} />,
      gif:     <FaImage size={18} style={{ color: '#63E6BE' }} />,
      stl:     <FaCube size={18} style={{ color: '#FFD43B' }} />,
      dxf:     <FaDraftingCompass size={18} style={{ color: '#6B7280' }} />,
      stp:     <FaCogs size={18} style={{ color: '#9775FA' }} />,
      step:    <FaCogs size={18} style={{ color: '#9775FA' }} />,
      doc:     <FaFileWord size={18} style={{ color: '#2B7BF3' }} />,
      docx:    <FaFileWord size={18} style={{ color: '#2B7BF3' }} />,
      js:      <FaJs size={18} style={{ color: '#e665a4' }} />,
      xlsx:    <FaFileAlt size={18} style={{ color: '#1D6F42' }} />,
      xls:     <FaFileAlt size={18} style={{ color: '#1D6F42' }} />,
      csv:     <FaFileAlt size={18} style={{ color: '#1D6F42' }} />,
      py:      <FaPython size={18} style={{ color: '#B197FC' }} />,
      cpp:     <FaCodepen size={18} style={{ color: '#ff813d' }} />,
      md:      <FaFileCode size={18} style={{ color: '#74C0FC' }} />,
      ino:     <FaCode size={18} style={{ color: '#FF6B6B' }} />,
      default: <FaFileAlt size={18} style={{ color: '#74C0FC' }} />,
    }
  },

  minimal: {
    label: 'Minimal',
    description: 'Monochrome, low distraction',
    icons: {
      pdf:     <FaRegFilePdf size={18} style={{ color: '#6B7280' }} />,
      png:     <FaImage size={18} style={{ color: '#6B7280' }} />,
      jpg:     <FaImage size={18} style={{ color: '#6B7280' }} />,
      jpeg:    <FaImage size={18} style={{ color: '#6B7280' }} />,
      gif:     <FaImage size={18} style={{ color: '#6B7280' }} />,
      stl:     <FaCube size={18} style={{ color: '#6B7280' }} />,
      dxf:     <FaDraftingCompass size={18} style={{ color: '#6B7280' }} />,
      stp:     <FaCogs size={18} style={{ color: '#6B7280' }} />,
      step:    <FaCogs size={18} style={{ color: '#6B7280' }} />,
      doc:     <FaFileWord size={18} style={{ color: '#6B7280' }} />,
      docx:    <FaFileWord size={18} style={{ color: '#6B7280' }} />,
      js:      <FaJs size={18} style={{ color: '#6B7280' }} />,
      xlsx:    <FaFileAlt size={18} style={{ color: '#6B7280' }} />,
      xls:     <FaFileAlt size={18} style={{ color: '#6B7280' }} />,
      csv:     <FaFileAlt size={18} style={{ color: '#6B7280' }} />,
      py:      <FaPython size={18} style={{ color: '#6B7280' }} />,
      cpp:     <FaCodepen size={18} style={{ color: '#6B7280' }} />,
      md:      <FaFileCode size={18} style={{ color: '#6B7280' }} />,
      ino:     <FaCode size={18} style={{ color: '#6B7280' }} />,
      default: <FaFileAlt size={18} style={{ color: '#6B7280' }} />,
    }
  },

  neon: {
    label: 'Neon',
    description: 'High contrast, bright accents',
    icons: {
      pdf:     <FaRegFilePdf size={18} style={{ color: '#ff0055' }} />,
      png:     <FaImage size={18} style={{ color: '#00ffcc' }} />,
      jpg:     <FaImage size={18} style={{ color: '#00ffcc' }} />,
      jpeg:    <FaImage size={18} style={{ color: '#00ffcc' }} />,
      gif:     <FaImage size={18} style={{ color: '#00ffcc' }} />,
      stl:     <FaCube size={18} style={{ color: '#ffe600' }} />,
      dxf:     <FaDraftingCompass size={18} style={{ color: '#00cfff' }} />,
      stp:     <FaCogs size={18} style={{ color: '#bf00ff' }} />,
      step:    <FaCogs size={18} style={{ color: '#bf00ff' }} />,
      doc:     <FaFileWord size={18} style={{ color: '#0066ff' }} />,
      docx:    <FaFileWord size={18} style={{ color: '#0066ff' }} />,
      js:      <FaJs size={18} style={{ color: '#ff00aa' }} />,
      xlsx:    <FaFileAlt size={18} style={{ color: '#00ff88' }} />,
      xls:     <FaFileAlt size={18} style={{ color: '#00ff88' }} />,
      csv:     <FaFileAlt size={18} style={{ color: '#00ff88' }} />,
      py:      <FaPython size={18} style={{ color: '#aa00ff' }} />,
      cpp:     <FaCodepen size={18} style={{ color: '#ff6600' }} />,
      md:      <FaFileCode size={18} style={{ color: '#00ccff' }} />,
      ino:     <FaCode size={18} style={{ color: '#ff3300' }} />,
      default: <FaFileAlt size={18} style={{ color: '#ffffff' }} />,
    }
  }
};

export default themes;
