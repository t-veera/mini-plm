// Hybrid storage solution - combines server storage with local caching
import axios from 'axios';

// Use relative URLs since we're proxying through nginx
// const API_BASE_URL = '';
// const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const API_BASE_URL = process.env.REACT_APP_API_URL || '';
axios.defaults.baseURL = API_BASE_URL;

// Configure axios for CSRF
axios.defaults.withCredentials = true;

export const hybridStorage = {
  // Local storage key for file cache
  CACHE_KEY: 'phasorFileCache',
  
  // Save products to server - uses individual Django REST endpoints
  async saveProducts(products) {
    console.log("🚀 [hybridStorage] saveProducts called with:", products);

    try {
      const savedProducts = [];
      
      for (const product of products) {
        let savedProduct;
        
        if (product.id) {
          // Update existing product
          console.log(`📡 Updating product ${product.id}`);
          const response = await axios.put(`/api/products/${product.id}/`, {
            name: product.name,
            description: product.description || ''
          });
          savedProduct = response.data;
        } else {
          // Create new product  
          console.log(`📡 Creating new product: ${product.name}`);
          const response = await axios.post('/api/products/', {
            name: product.name,
            description: product.description || ''
          });
          savedProduct = response.data;
        }
        
        // Save stages for this product
        if (product.stages && product.stages.length > 0) {
          savedProduct.stages = await this.saveStages(savedProduct.id, product.stages);
        }
        
        // Save iterations for this product  
        if (product.iterations && product.iterations.length > 0) {
          savedProduct.iterations = await this.saveIterations(savedProduct.id, product.iterations);
        }
        
        savedProducts.push(savedProduct);
      }

      console.log("✅ [hybridStorage] All products saved successfully");
      
      // Cache file data separately in localStorage
      this.cacheFileData(products);

      return savedProducts;

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

  // Save stages for a product
  async saveStages(productId, stages) {
    const savedStages = [];
    
    for (const stage of stages) {
      try {
        if (stage.id) {
          // Update existing stage
          const response = await axios.put(`/api/stages/${stage.id}/`, {
            name: stage.name,
            description: stage.description || '',
            stage_number: stage.stage_number,
            product: productId,
            order: stage.order
          });
          savedStages.push(response.data);
        } else {
          // Create new stage
          const response = await axios.post('/api/stages/', {
            name: stage.name,
            description: stage.description || '',
            stage_number: stage.stage_number,
            product: productId,
            order: stage.order
          });
          savedStages.push(response.data);
        }
      } catch (error) {
        console.error(`Failed to save stage ${stage.name}:`, error);
      }
    }
    
    return savedStages;
  },

  // Save iterations for a product
  async saveIterations(productId, iterations) {
    const savedIterations = [];
    
    for (const iteration of iterations) {
      try {
        if (iteration.id) {
          // Update existing iteration
          const response = await axios.put(`/api/iterations/${iteration.id}/`, {
            name: iteration.name,
            description: iteration.description || '',
            iteration_number: iteration.iteration_number,
            product: productId,
            stage: iteration.stage_id, // If iteration belongs to a stage
            order: iteration.order
          });
          savedIterations.push(response.data);
        } else {
          // Create new iteration
          const response = await axios.post('/api/iterations/', {
            name: iteration.name,
            description: iteration.description || '',
            iteration_number: iteration.iteration_number,
            product: productId,
            stage: iteration.stage_id, // If iteration belongs to a stage
            order: iteration.order
          });
          savedIterations.push(response.data);
        }
      } catch (error) {
        console.error(`Failed to save iteration ${iteration.name}:`, error);
      }
    }
    
    return savedIterations;
  },
  
  // Load products from server
  async loadProducts() {
    try {
      const response = await axios.get('/api/products/');
      
      if (response.status === 200 && response.data.length > 0) {
        // Load associated stages and iterations for each product
        const productsWithDetails = await Promise.all(
          response.data.map(async (product) => {
            try {
              // Load stages
              const stagesResponse = await axios.get(`/api/stages/?product_id=${product.id}`);
              product.stages = stagesResponse.data;
              
              // Load iterations
              const iterationsResponse = await axios.get(`/api/iterations/?product_id=${product.id}`);
              product.iterations = iterationsResponse.data;
              
              // Load files for this product
              const filesResponse = await axios.get(`/api/files/?product_id=${product.id}`);
              product.filesByContainer = this.organizeFilesByContainer(filesResponse.data);
              
              return product;
            } catch (error) {
              console.error(`Failed to load details for product ${product.id}:`, error);
              return product;
            }
          })
        );
        
        // Merge with cached file data
        const productsWithFiles = this.restoreFileData(productsWithDetails);
        return productsWithFiles;
      }
      
      return this.loadProductsLocally();
    } catch (error) {
      console.warn('Failed to load products from server:', error);
      return this.loadProductsLocally();
    }
  },

  // Organize files by container (stage_id or iteration_id)
  organizeFilesByContainer(files) {
    const filesByContainer = {};
    
    files.forEach(file => {
      const containerKey = `${file.container_type}_${file.container_id}`;
      if (!filesByContainer[containerKey]) {
        filesByContainer[containerKey] = [];
      }
      filesByContainer[containerKey].push(file);
    });
    
    return filesByContainer;
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
            stages: [],
            iterations: [],
            selectedContainer: product.selectedContainer,
            containerType: product.containerType,
            filesByContainer: {}
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
      stages: [],
      iterations: [],
      selectedContainer: null,
      containerType: null,
      filesByContainer: {}
    }];
  },
  
  // Strip file data (dataURLs) for efficient storage
  stripFileData(products) {
    return products.map(product => {
      const strippedProduct = {...product};
      
      if (strippedProduct.filesByContainer) {
        strippedProduct.filesByContainer = {...strippedProduct.filesByContainer};
        
        Object.keys(strippedProduct.filesByContainer).forEach(containerKey => {
          if (Array.isArray(strippedProduct.filesByContainer[containerKey])) {
            strippedProduct.filesByContainer[containerKey] = strippedProduct.filesByContainer[containerKey].map(file => {
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
      if (product.filesByContainer) {
        Object.values(product.filesByContainer).forEach(files => {
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
      
      if (restoredProduct.filesByContainer) {
        restoredProduct.filesByContainer = {...restoredProduct.filesByContainer};
        
        Object.keys(restoredProduct.filesByContainer).forEach(containerKey => {
          if (Array.isArray(restoredProduct.filesByContainer[containerKey])) {
            restoredProduct.filesByContainer[containerKey] = restoredProduct.filesByContainer[containerKey].map(file => {
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
  
  // Upload a file to the server with proper container association
  async uploadFile(file, containerType, containerId) {
    try {
      const formData = new FormData();
      formData.append('uploaded_file', file);
      formData.append('original_name', file.name);
      formData.append('is_child_file', 'false');
      formData.append('change_description', 'Initial file upload');
      formData.append('status', 'in_work');
      formData.append('quantity', '1');
      
      // Add container information
      if (containerType === 'stage') {
        formData.append('stage_id', containerId);
      } else if (containerType === 'iteration') {
        formData.append('iteration_id', containerId);
      } else {
        throw new Error('Invalid container type. Must be "stage" or "iteration".');
      }
      
      const response = await axios.post('/api/files/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.status === 201) {
        return {
          success: true,
          data: response.data
        };
      }
      
      return { success: false, error: 'Upload failed' };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Unknown error' 
      };
    }
  },

  // Create a new stage
  async createStage(productId, stageName, stageNumber, order = 1) {
    try {
      const response = await axios.post('/api/stages/', {
        name: stageName,
        description: '',
        stage_number: stageNumber,
        product: productId,
        order: order
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating stage:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Unknown error'
      };
    }
  },

  // Create a new iteration
  async createIteration(productId, iterationName, iterationNumber, stageId = null, order = 1) {
    try {
      const requestData = {
        name: iterationName,
        description: '',
        iteration_number: iterationNumber,
        product: productId,
        order: order
      };
      
      if (stageId) {
        requestData.stage = stageId;
      }
      
      const response = await axios.post('/api/iterations/', requestData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating iteration:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Unknown error'
      };
    }
  }
};

// File handling helper function that works with the backend
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
    if (!prod.selectedContainer || !prod.containerType) {
      setToastMsg('No container (stage/iteration) selected yet.');
      e.target.value = '';
      return;
    }

    setIsLoading(true);
    setToastMsg('');

    try {
      // Upload to server first (backend handles revision logic)
      const uploadResult = await hybridStorage.uploadFile(
        file, 
        prod.containerType, 
        prod.selectedContainer.id
      );
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Create dataURL for preview
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          reject(error);
        };
        reader.readAsDataURL(file);
      });

      // Update local state with the backend response
      const updatedProducts = [...products];
      const updatedProduct = { ...updatedProducts[selectedProductIndex] };
      updatedProducts[selectedProductIndex] = updatedProduct;

      updatedProduct.filesByContainer = { ...updatedProduct.filesByContainer };
      
      // Build container key
      const containerKey = `${prod.containerType}_${prod.selectedContainer.id}`;
      
      if (!updatedProduct.filesByContainer[containerKey]) {
        updatedProduct.filesByContainer[containerKey] = [];
      } else {
        updatedProduct.filesByContainer[containerKey] = [...updatedProduct.filesByContainer[containerKey]];
      }

      // Check if this is a new file or revision
      const existingFileIndex = updatedProduct.filesByContainer[containerKey].findIndex(
        f => f.name === file.name && !f.is_child_file
      );

      // Create file object from backend response
      const fileObj = {
        ...uploadResult.data,
        dataUrl, // Add dataURL for preview
      };

      let fileToSelect;
      let isNewRevision = false;

      if (existingFileIndex !== -1 && uploadResult.data.revision > 1) {
        // This is a revision - update existing file
        const existingFile = { ...updatedProduct.filesByContainer[containerKey][existingFileIndex] };
        
        // Update with new revision data
        existingFile.current_revision = uploadResult.data.revision;
        existingFile.dataUrl = dataUrl;
        existingFile.updated_at = uploadResult.data.created_at;
        existingFile.file_path = uploadResult.data.file_path;
        existingFile.latest_revision = uploadResult.data.latest_revision;
        
        // Add to revisions array if it exists
        if (existingFile.revisions) {
          existingFile.revisions = [...existingFile.revisions, uploadResult.data.latest_revision];
        }

        updatedProduct.filesByContainer[containerKey][existingFileIndex] = existingFile;
        fileToSelect = existingFile;
        isNewRevision = true;

        setToastMsg(`New revision (Rev ${uploadResult.data.revision}) created!`);
      } else {
        // This is a new file
        updatedProduct.filesByContainer[containerKey].push(fileObj);
        fileToSelect = fileObj;

        setToastMsg('File uploaded successfully!');
      }

      // Update state
      setProducts(updatedProducts);
      setSelectedFileObj(fileToSelect);

      // Persist changes
      hybridStorage.saveProducts(updatedProducts)
        .catch(err => console.error("Error saving after file upload:", err));

      // Open change description modal for additional details
      setTimeout(() => {
        setCurrentFileForModal(fileToSelect);
        setTempChangeDescription('');
        setShowChangeDescriptionModal(true);
        console.log("Opening change description modal for new file upload");
      }, 100);

      console.log('File uploaded and local state updated successfully');

    } catch (err) {
      console.error('Error uploading file:', err);
      setToastMsg('Error uploading file: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };
};