import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    // Must match "uploaded_file" in the serializer & view
    formData.append('uploaded_file', file);
    try {
      await axios.post('http://127.0.0.1:8000/api/files/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchFiles();
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/files/');
      setFiles(res.data);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>MPP - File Upload MVP</h2>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          required
        />
        <button type="submit">Upload</button>
      </form>
      <h3>Uploaded Files:</h3>
      <ul>
        {files.map(f => (
          <li key={f.id}>
            {f.name} – {new Date(f.upload_date).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
