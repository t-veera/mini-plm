// Hybrid storage solution - combines server storage with local caching
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

export const hybridStorage = {
  // Local storage key for file cache
  CACHE_KEY: 'phasorFileCache',
  
// Save products to server
async saveProducts(products) {
  console.log("🚀 [hybridStorage] saveProducts called with:", products);

  try {
    // Strip file data for efficient server saving
    const lightProducts = this.stripFileData(products);
    const apiUrl = `${API_BASE_URL}/api/products/save`;

    console.log("📡 Attempting POST to:", apiUrl);
    console.log("📦 Payload:", JSON.stringify(lightProducts, null, 2));

    const response = await axios.post(apiUrl, lightProducts);

    console.log("✅ [hybridStorage] Save successful:", response.status, response.data);

    // Cache file data separately in localStorage
    this.cacheFileData(products);

    return response.data;

  } catch (error) {
    console.error("❌ [hybridStorage] Save to server FAILED:");
    if (error.response) {
      console.error("Response:", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("No response received. Request:", error.request);
    } else {
      console.error("Error message:", error.message);
    }

    // Fallback to local save
    this.saveProductsLocally(products);

    throw error;
  }
},
  
  // Load products from server
  async loadProducts() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/products/`);
      
      if (response.status === 200 && response.data.length > 0) {
        // Merge with cached file data
        const productsWithFiles = this.restoreFileData(response.data);
        return productsWithFiles;
      }
      
      return this.loadProductsLocally();
    } catch (error) {
      console.warn('Failed to load products from server:', error);
      return this.loadProductsLocally();
    }
  },
  
  // Save products to localStorage (fallback)
  saveProductsLocally(products) {
    try {
      // Save lightweight products structure
      const lightProducts = this.stripFileData(products);
      localStorage.setItem('phasorProducts', JSON.stringify(lightProducts));
      
      // Cache file data separately
      this.cacheFileData(products);
    } catch (error) {
      console.error('Failed to save products locally:', error);
      // If we hit quota errors, clear old data and try again
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        this.clearOldCache();
        try {
          const minimalProducts = products.map(product => ({
            name: product.name,
            stageIcons: product.stageIcons,
            selectedStage: product.selectedStage,
            filesByStage: {}
          }));
          localStorage.setItem('phasorProducts', JSON.stringify(minimalProducts));
        } catch (fallbackError) {
          console.error("Failed to save even minimal data:", fallbackError);
        }
      }
    }
  },
  
  // Load products from localStorage
  loadProductsLocally() {
    try {
      const stored = localStorage.getItem('phasorProducts');
      if (stored) {
        const parsedProducts = JSON.parse(stored);
        // Restore file data from cache
        return this.restoreFileData(parsedProducts);
      }
    } catch (error) {
      console.error('Failed to load products from localStorage:', error);
    }
    
    // Default fallback
    return [{
      name: 'Sample Product',
      stageIcons: [],
      selectedStage: null,
      filesByStage: {}
    }];
  },
  
  // Strip file data (dataURLs) for efficient storage
  stripFileData(products) {
    return products.map(product => {
      const strippedProduct = {...product};
      
      if (strippedProduct.filesByStage) {
        strippedProduct.filesByStage = {...strippedProduct.filesByStage};
        
        Object.keys(strippedProduct.filesByStage).forEach(stage => {
          if (Array.isArray(strippedProduct.filesByStage[stage])) {
            strippedProduct.filesByStage[stage] = strippedProduct.filesByStage[stage].map(file => {
              const fileCopy = {...file};
              
              // Remove dataURL
              delete fileCopy.dataUrl;
              
              // Process revisions if they exist
              if (fileCopy.revisions && Array.isArray(fileCopy.revisions)) {
                fileCopy.revisions = fileCopy.revisions.map(rev => {
                  const revCopy = {...rev};
                  delete revCopy.dataUrl;
                  return revCopy;
                });
              }
              
              // Process selected_revision_obj if it exists
              if (fileCopy.selected_revision_obj) {
                const revObjCopy = {...fileCopy.selected_revision_obj};
                delete revObjCopy.dataUrl;
                fileCopy.selected_revision_obj = revObjCopy;
              }
              
              return fileCopy;
            });
          }
        });
      }
      
      return strippedProduct;
    });
  },
  
  // Cache file data locally
  cacheFileData(products) {
    const fileCache = {};
    
    // Extract all files with dataURLs
    products.forEach(product => {
      if (product.filesByStage) {
        Object.values(product.filesByStage).forEach(files => {
          if (Array.isArray(files)) {
            files.forEach(file => {
              // Cache main file
              if (file.id && file.dataUrl) {
                fileCache[file.id] = file.dataUrl;
              }
              
              // Cache revisions
              if (file.revisions && Array.isArray(file.revisions)) {
                file.revisions.forEach(revision => {
                  if (revision.id && revision.dataUrl) {
                    fileCache[revision.id] = revision.dataUrl;
                  }
                });
              }
            });
          }
        });
      }
    });
    
    // Store in chunks to avoid hitting localStorage size limits
    const entries = Object.entries(fileCache);
    const chunkSize = 5; // Adjust based on typical file sizes
    
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      const chunkObj = Object.fromEntries(chunk);
      try {
        localStorage.setItem(`${this.CACHE_KEY}_${i/chunkSize}`, JSON.stringify(chunkObj));
      } catch (error) {
        console.warn(`Failed to cache chunk ${i/chunkSize}:`, error);
        // If this chunk fails, skip it and continue with others
      }
    }
    
    // Store the number of chunks
    localStorage.setItem(`${this.CACHE_KEY}_count`, Math.ceil(entries.length / chunkSize));
  },
  
  // Restore file data from cache
  restoreFileData(products) {
    // Load all cache chunks
    const fileCache = {};
    const chunkCount = parseInt(localStorage.getItem(`${this.CACHE_KEY}_count`) || '0', 10);
    
    for (let i = 0; i < chunkCount; i++) {
      try {
        const chunk = localStorage.getItem(`${this.CACHE_KEY}_${i}`);
        if (chunk) {
          Object.assign(fileCache, JSON.parse(chunk));
        }
      } catch (error) {
        console.warn(`Failed to load cache chunk ${i}:`, error);
      }
    }
    
    // Restore dataURLs to files
    return products.map(product => {
      const restoredProduct = {...product};
      
      if (restoredProduct.filesByStage) {
        restoredProduct.filesByStage = {...restoredProduct.filesByStage};
        
        Object.keys(restoredProduct.filesByStage).forEach(stage => {
          if (Array.isArray(restoredProduct.filesByStage[stage])) {
            restoredProduct.filesByStage[stage] = restoredProduct.filesByStage[stage].map(file => {
              const fileCopy = {...file};
              
              // Restore main file dataUrl
              if (fileCopy.id && fileCache[fileCopy.id]) {
                fileCopy.dataUrl = fileCache[fileCopy.id];
              }
              
              // Restore revisions
              if (fileCopy.revisions && Array.isArray(fileCopy.revisions)) {
                fileCopy.revisions = fileCopy.revisions.map(rev => {
                  const revCopy = {...rev};
                  if (revCopy.id && fileCache[revCopy.id]) {
                    revCopy.dataUrl = fileCache[revCopy.id];
                  }
                  return revCopy;
                });
              }
              
              // Restore selected_revision_obj if it exists
              if (fileCopy.selected_revision_obj && fileCopy.selected_revision_obj.id) {
                fileCopy.selected_revision_obj = {
                  ...fileCopy.selected_revision_obj,
                  dataUrl: fileCache[fileCopy.selected_revision_obj.id] || null
                };
              }
              
              return fileCopy;
            });
          }
        });
      }
      
      return restoredProduct;
    });
  },
  
  // Clear old cache entries to free up space
  clearOldCache() {
    // Clear all cache chunks
    const chunkCount = parseInt(localStorage.getItem(`${this.CACHE_KEY}_count`) || '0', 10);
    for (let i = 0; i < chunkCount; i++) {
      localStorage.removeItem(`${this.CACHE_KEY}_${i}`);
    }
    localStorage.removeItem(`${this.CACHE_KEY}_count`);
    
    // Also clear other possible storage items
    localStorage.removeItem('phasorProducts');
  },
  
  // Upload a file to the server and get a URL
  async uploadFile(file) {
    try {
      const formData = new FormData();
      formData.append('uploaded_file', file);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/files/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      if (response.status === 201) {
        // Return the URL to the file on the server
        return {
          success: true,
          url: response.data.url,
          fileId: response.data.id
        };
      }
      
      return { success: false, error: 'Upload failed' };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }
};

// File handling helper function that can be exported and used in App.js
export const createFileUploadHandler = (
  products, 
  setProducts, 
  selectedProductIndex, 
  setToastMsg, 
  setIsLoading, 
  setSelectedFileObj, 
  setCurrentFileForModal, 
  setTempChangeDescription, 
  setShowChangeDescriptionModal
) => {
  return async (e) => {
    const file = e.target.files[0];
    if (!file) {
      e.target.value = '';
      return;
    }

    const prod = products[selectedProductIndex];
    if (!prod.selectedStage) {
      setToastMsg('No stage selected yet.');
      e.target.value = '';
      return;
    }

    setIsLoading(true);
    setToastMsg('');

    try {
      // Create dataURL for preview and local caching
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          reject(error);
        };
        reader.readAsDataURL(file);
      });

      // Upload to server and get URL
      const uploadResult = await hybridStorage.uploadFile(file);
      
      // Create deep copies to ensure state updates correctly
      const updatedProducts = [...products];
      const updatedProduct = {...updatedProducts[selectedProductIndex]};
      updatedProducts[selectedProductIndex] = updatedProduct;
      
      const stage = updatedProduct.selectedStage;
      
      // Ensure filesByStage exists and create a new object reference
      updatedProduct.filesByStage = {...updatedProduct.filesByStage};
      
      // Ensure the stage array exists and create a new array reference
      if (!updatedProduct.filesByStage[stage]) {
        updatedProduct.filesByStage[stage] = [];
      } else {
        updatedProduct.filesByStage[stage] = [...updatedProduct.filesByStage[stage]];
      }

      // Check if a file with the same name already exists
      const existingFileIndex = updatedProduct.filesByStage[stage].findIndex(
        f => f.name === file.name && !f.isChildFile
      );

      // Create the new file object
      const newFileObj = {
        id: Date.now(), // Add unique ID for React keys
        name: file.name,
        upload_date: new Date().toISOString(),
        size: file.size,
        type: file.type,
        dataUrl: dataUrl, // Store the dataURL for preview
        serverUrl: uploadResult.success ? uploadResult.url : null, // Store server URL if upload succeeded
        childFiles: [], // Initialize empty array to track child files
        status: 'In-Work', // Default status
        price: '', // Empty price by default
        quantity: 1, 
        current_revision: 1 // Initialize with revision 1
      };

      let fileToSelect; // This will be the file we select for preview

      if (existingFileIndex !== -1) {
        // Handle existing file as a revision
        const existingFile = {...updatedProduct.filesByStage[stage][existingFileIndex]};
        
        // Initialize revisions array if needed
        if (!existingFile.revisions) {
          existingFile.revisions = [];
          // First revision is the current file
          existingFile.revisions.push({
            id: existingFile.id,
            name: existingFile.name,
            upload_date: existingFile.upload_date,
            size: existingFile.size,
            type: existingFile.type,
            dataUrl: existingFile.dataUrl,
            serverUrl: existingFile.serverUrl,
            rev_number: 1,
            childFiles: existingFile.childFiles || [],
            status: existingFile.status || 'In-Work',
            price: existingFile.price || ''
          });
        }
        
        // Add new revision
        const newRevision = {
          ...newFileObj,
          rev_number: existingFile.revisions.length + 1,
          childFiles: [],
          status: 'In-Work',
          price: existingFile.price || ''
        };
        
        existingFile.revisions.push(newRevision);
        
        // Update current file
        existingFile.dataUrl = newFileObj.dataUrl;
        existingFile.serverUrl = newFileObj.serverUrl;
        existingFile.upload_date = newFileObj.upload_date;
        existingFile.size = newFileObj.size;
        existingFile.current_revision = newRevision.rev_number;
        existingFile.childFiles = newRevision.childFiles;
        existingFile.status = 'In-Work';
        existingFile.selected_revision_obj = newRevision;
        
        // Replace in array
        updatedProduct.filesByStage[stage][existingFileIndex] = existingFile;
        
        fileToSelect = existingFile;
        
        setToastMsg(`New revision (Rev ${newRevision.rev_number}) created!`);
      } else {
        // New file
        newFileObj.revisions = [{
          ...newFileObj,
          rev_number: 1
        }];
        
        newFileObj.selected_revision_obj = newFileObj.revisions[0];
        
        updatedProduct.filesByStage[stage].push(newFileObj);
        
        fileToSelect = newFileObj;
        
        setToastMsg('File uploaded successfully!');
      }
      
      // Update state with completely new references
      setProducts(updatedProducts);
      
      // Select this file for preview
      setSelectedFileObj(fileToSelect);
      
      // Show change description modal
      setTimeout(() => {
        setCurrentFileForModal(fileToSelect);
        setTempChangeDescription('');
        setShowChangeDescriptionModal(true);
        console.log("Opening change description modal for new file upload");
      }, 100);
    } catch (err) {
      console.error('Error uploading file:', err);
      setToastMsg('Error uploading file: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
      // Reset the file input
      e.target.value = '';
    }
  };
};