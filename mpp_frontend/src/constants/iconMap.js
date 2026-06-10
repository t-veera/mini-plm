import React from 'react';
import {
  FaRegFilePdf,
  FaImage,
  FaFileAlt,
  FaFileCode,
  FaJs,
  FaPython,
  FaMarkdown,
  FaCodepen,
  FaCode,
  FaCube,
  FaDraftingCompass,
  FaFileWord,
  FaCogs
} from 'react-icons/fa';

const iconMap = {
  pdf:    <FaRegFilePdf size={22} style={{ color: '#ff3d3d' }} />,
  png:    <FaImage size={22} style={{ color: '#63E6BE' }} />,
  jpg:    <FaImage size={22} style={{ color: '#63E6BE' }} />,
  jpeg:   <FaImage size={22} style={{ color: '#63E6BE' }} />,
  gif:    <FaImage size={22} style={{ color: '#63E6BE' }} />,
  stl:    <FaCube size={22} style={{ color: '#FFD43B' }} />,
  dxf:    <FaDraftingCompass size={22} style={{ color: '#6B7280' }} />,
  stp:    <FaCogs size={22} style={{ color: '#9775FA' }} />,
  step:   <FaCogs size={22} style={{ color: '#9775FA' }} />,
  doc:    <FaFileWord size={22} style={{ color: '#2B7BF3' }} />,
  docx:   <FaFileWord size={22} style={{ color: '#2B7BF3' }} />,
  js:     <FaJs size={22} style={{ color: '#e665a4' }} />,
  xlsx:   <FaFileAlt size={22} style={{ color: '#1D6F42' }} />,
  xls:    <FaFileAlt size={22} style={{ color: '#1D6F42' }} />,
  csv:    <FaFileAlt size={22} style={{ color: '#1D6F42' }} />,
  py:     <FaPython size={22} style={{ color: '#B197FC' }} />,
  cpp:    <FaCodepen size={22} style={{ color: '#ff813d' }} />,
  md:     <FaFileCode size={22} style={{ color: '#74C0FC' }} />,
  ino:    <FaCode size={22} style={{ color: '#FF6B6B' }} />,
  default:<FaFileAlt size={22} style={{ color: '#74C0FC' }} />
};

export default iconMap;
