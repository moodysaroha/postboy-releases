// Collections Management Module
class CollectionsManager {
  constructor() {
    this.collections = [];
  }

  async init() {
    await this.loadCollections();
    this.renderCollections();
    this.setupEventListeners();
  }

  async loadCollections() {
    try {
      this.collections = await window.electronAPI.db.getCollections();
    } catch (error) {
      console.error('Failed to load collections:', error);
      this.collections = [];
    }
  }

  setupEventListeners() {
    // New collection button
    const newCollectionBtn = document.getElementById('new-collection-btn');
    if (newCollectionBtn) {
      newCollectionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.createNewCollection();
      });
    }

    // Import collections button
    const importBtn = document.getElementById('import-collection-btn');
    if (importBtn) {
      importBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.importCollections();
      });
    }

    // Export collections button
    const exportBtn = document.getElementById('export-collection-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.exportCollections();
      });
    }

    this.setupModalEventListeners();
  }

  setupModalEventListeners() {
    // No HTML modal event listeners needed - using modal-manager now
  }

  async createNewCollection() {
    const modalContent = `
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Collection Name:</label>
        <input type="text" id="new-collection-name" placeholder="Enter collection name..." 
               style="width: 100%; padding: 8px; border: 1px solid #444; border-radius: 4px; background: #2b2d31; color: #f2f3f5;">
      </div>
    `;

    const modalPromise = window.modalManager.showModal({
      title: 'Create New Collection',
      message: modalContent,
      buttons: ['Create', 'Cancel'],
      defaultButton: 0,
      cancelable: true
    });
    
    // Focus the input field after modal is shown
    setTimeout(() => {
      const input = document.getElementById('new-collection-name');
      if (input) {
        input.focus();
        input.select();
      }
    }, 150);
    
    const result = await modalPromise;
    
    if (result.response === 0) {
      const name = document.getElementById('new-collection-name')?.value.trim();
      if (name) {
        return await this.handleCreateCollection(name);
      } else {
        await window.modalManager.showWarning('Collection Name Required', 'Please enter a collection name');
        return this.createNewCollection();
      }
    }
    return null;
  }

  async handleCreateCollection(name) {
    if (!name) {
      return null;
    }

    try {
      const collectionId = await window.electronAPI.db.createCollection(name, '');
      
      // Reload collections to get the updated list
      await this.loadCollections();
      this.renderCollections();
      
      // Switch to Collections tab after creating a new collection
      if (window.postboy && window.postboy.switchSidebarTab) {
        window.postboy.switchSidebarTab('collections');
      }
      
      return collectionId;
    } catch (error) {
      console.error('Failed to create collection:', error);
      return null;
    }
  }

  async saveCurrentRequest() {
    const method = window.postboy.getMethodValue();
    const url = document.getElementById('url-input')?.value.trim();
    
    if (!url) {
      await window.modalManager.showWarning('URL Required', 'Please enter a URL first');
      return;
    }

    this.showSaveRequestModal(method, url);
  }

  async showSaveRequestModal(method, url, preselectedCollectionId = null) {
    const defaultName = url.split('/').pop() || 'Request';
    
    if (this.collections.length === 0) {
      const createFirst = await window.modalManager.confirm(
        'No Collections',
        'You need to create a collection first.',
        'Would you like to create one now?'
      );
      
      if (createFirst) {
        const newCollectionId = await this.createNewCollection();
        if (newCollectionId && this.collections.length > 0) {
          // Restart save modal with the new collection preselected
          return this.showSaveRequestModal(method, url, newCollectionId);
        }
      }
      return;
    }

    const collectionOptions = this.collections.map((collection, index) => {
      const selected = (preselectedCollectionId && collection.id === preselectedCollectionId) ? 'selected' : '';
      return `<option value="${index}" ${selected}>${collection.name}</option>`;
    }).join('');

    const modalContent = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">Request Name:</label>
          <input type="text" id="save-request-name" value="${defaultName}" 
                 style="width: 100%; padding: 8px; border: 1px solid #444; border-radius: 4px; background: #2b2d31; color: #f2f3f5;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">Collection:</label>
          <select id="save-collection-select" 
                  style="width: 100%; padding: 8px; border: 1px solid #444; border-radius: 4px; background: #2b2d31; color: #f2f3f5;">
            <option value="">Select a collection...</option>
            ${collectionOptions}
          </select>
        </div>
        <div>
          <button id="create-new-collection-btn" 
                  style="background: none; border: none; color: #00a8fc; text-decoration: underline; cursor: pointer;">
            + Create New Collection
          </button>
        </div>
      </div>
    `;

    const modalPromise = window.modalManager.showModal({
      title: 'Save Request',
      message: modalContent,
      buttons: ['Save', 'Cancel'],
      defaultButton: 0,
      cancelable: true
    });

    // Add event listener for the create new collection button and focus input after modal is shown
    setTimeout(() => {
      // Focus the request name input
      const nameInput = document.getElementById('save-request-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
      
      const createBtn = document.getElementById('create-new-collection-btn');
      if (createBtn) {
        createBtn.addEventListener('click', async () => {
          // Close the current modal first
          const activeModal = document.querySelector('.discord-modal');
          if (activeModal) {
            activeModal.remove();
          }
          
          // Create new collection
          const newCollectionId = await this.createNewCollection();
          
          // Restart the save request process with the new collection preselected
          if (newCollectionId) {
            this.showSaveRequestModal(method, url, newCollectionId);
          } else {
            // If collection creation was cancelled, show the save modal again
            this.showSaveRequestModal(method, url, preselectedCollectionId);
          }
        });
      }
    }, 100);

    const result = await modalPromise;

    if (result.response === 0) {
      const requestName = document.getElementById('save-request-name')?.value.trim();
      const collectionIndex = parseInt(document.getElementById('save-collection-select')?.value);
      
      if (!requestName) {
        await window.modalManager.showWarning('Request Name Required', 'Please enter a request name');
        return this.showSaveRequestModal(method, url);
      }
      
      if (isNaN(collectionIndex)) {
        await window.modalManager.showWarning('Collection Required', 'Please select a collection');
        return this.showSaveRequestModal(method, url);
      }

      this.handleSaveRequest(requestName, collectionIndex);
    }
  }

  async handleSaveRequest(requestName, collectionIndex) {
    if (!requestName) {
      return;
    }
    
    if (isNaN(collectionIndex) || collectionIndex < 0 || collectionIndex >= this.collections.length) {
      return;
    }

    const method = window.postboy.getMethodValue();
    const baseUrl = document.getElementById('url-input')?.value.trim();
    
    let headers = {};
    let params = {};
    let body = '';
    
    let bodyType = 'none';
    
    if (window.postboy) {
      headers = window.postboy.getKeyValuePairs('headers-container');
      params = window.postboy.getKeyValuePairs('params-container');
      
      // Get body and body type from the current selection
      const bodyData = window.postboy.getRequestBody();
      body = bodyData.body || '';
      bodyType = window.postboy.getCurrentBodyType();
    }
    
    let fullUrl = baseUrl;
    const urlParams = new URLSearchParams(params);
    if (urlParams.toString()) {
      fullUrl += (baseUrl.includes('?') ? '&' : '?') + urlParams.toString();
    }
    
    let authData = null;
    if (window.authManager) {
      authData = window.authManager.exportAuthData();
    }

    const requestData = {
      name: requestName,
      method,
      url: fullUrl,
      headers: Object.entries(headers).map(([key, value]) => ({ key, value })),
      params: Object.entries(params).map(([key, value]) => ({ key, value })),
      bodyContent: body,
      bodyType,
      authType: authData?.type || 'none',
      authData: authData || {}
    };

    try {
      const collectionId = this.collections[collectionIndex].id;
      await window.electronAPI.db.createRequest(collectionId, requestData);
      
      // Reload collections to get updated data
      await this.loadCollections();
      this.renderCollections();
      
      // Switch to Collections tab after saving
      if (window.postboy && window.postboy.switchSidebarTab) {
        window.postboy.switchSidebarTab('collections');
      }
      
      // Mark tab as saved
      if (window.postboy && window.postboy.markTabAsSaved) {
        window.postboy.markTabAsSaved(null, requestName);
      }
    } catch (error) {
      console.error('Failed to save request:', error);
    }
  }

  async renderCollections() {
    const collectionsList = document.getElementById('collections-list');
    if (!collectionsList) return;
    
    if (this.collections.length === 0) {
      collectionsList.innerHTML = `
        <div class="empty-collections">
          <p>No collections yet</p>
          <p>Click "+" to create your first collection</p>
        </div>
      `;
      return;
    }

    // Load requests for each collection and update the collections array
    await Promise.all(
      this.collections.map(async (collection) => {
        try {
          const requests = await window.electronAPI.db.getRequests(collection.id);
          collection.requests = requests;
          collection.expanded = collection.expanded !== undefined ? collection.expanded : true;
        } catch (error) {
          console.error(`Failed to load requests for collection ${collection.id}:`, error);
          collection.requests = [];
          collection.expanded = collection.expanded !== undefined ? collection.expanded : true;
        }
      })
    );

    collectionsList.innerHTML = this.collections.map(collection => {
      const requestsHtml = collection.requests.map(request => `
        <div class="collection-request" data-request-id="${request.id}" data-collection-id="${collection.id}">
          <div class="method ${request.method.toLowerCase()}">${request.method}</div>
          <div class="name">
            <span class="request-name-text" data-request-id="${request.id}" data-collection-id="${collection.id}">${request.name}</span>
            <input class="request-name-input" data-request-id="${request.id}" data-collection-id="${collection.id}" value="${request.name}" style="display: none;" />
          </div>
          <div class="request-actions">
            <button class="request-action-btn rename-request-btn" data-request-id="${request.id}" data-collection-id="${collection.id}" title="Rename Request">✏️</button>
            <button class="request-action-btn delete-request-btn" data-request-id="${request.id}" data-collection-id="${collection.id}" title="Delete Request">🗑️</button>
          </div>
        </div>
      `).join('');

      return `
        <div class="collection-item ${collection.expanded ? 'expanded' : ''}" data-collection-id="${collection.id}">
          <div class="collection-header">
            <div class="collection-name">
              <span class="collection-toggle">▶</span>
              <span class="collection-name-text" data-collection-id="${collection.id}">${collection.name}</span>
              <input class="collection-name-input" data-collection-id="${collection.id}" value="${collection.name}" style="display: none;" />
            </div>
            <div class="collection-actions">
              <button class="collection-action-btn rename-collection-btn" data-collection-id="${collection.id}" title="Rename">✏️</button>
              <button class="collection-action-btn delete-collection-btn" data-collection-id="${collection.id}" title="Delete">🗑️</button>
            </div>
          </div>
          <div class="collection-requests">
            ${requestsHtml}
          </div>
        </div>
      `;
    }).join('');

    this.setupCollectionEventListeners();
  }

  setupCollectionEventListeners() {
    // Collection toggle
    document.querySelectorAll('.collection-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.classList.contains('collection-action-btn')) return;
        if (e.target.classList.contains('collection-name-input')) return;
        
        const collectionItem = header.closest('.collection-item');
        const collectionId = collectionItem.getAttribute('data-collection-id');
        this.toggleCollection(collectionId);
      });
    });

    // Request click
    document.querySelectorAll('.collection-request').forEach(request => {
      request.addEventListener('click', (e) => {
        // Don't load request if clicking on action buttons
        if (e.target.classList.contains('request-action-btn')) return;
        
        const requestId = request.getAttribute('data-request-id');
        const collectionId = request.getAttribute('data-collection-id');
        this.loadCollectionRequest(collectionId, requestId);
      });
    });

    // Request delete buttons
    document.querySelectorAll('.delete-request-btn').forEach(deleteBtn => {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent triggering the request click
        
        const requestId = deleteBtn.getAttribute('data-request-id');
        const collectionId = deleteBtn.getAttribute('data-collection-id');
        await this.deleteCollectionRequest(collectionId, requestId);
      });
    });

    // Rename collection buttons
    document.querySelectorAll('.rename-collection-btn').forEach(renameBtn => {
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the header click
        
        const collectionId = renameBtn.getAttribute('data-collection-id');
        this.startRenameCollection(collectionId);
      });
    });

    // Rename request buttons
    document.querySelectorAll('.rename-request-btn').forEach(renameBtn => {
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the request click
        
        const requestId = renameBtn.getAttribute('data-request-id');
        const collectionId = renameBtn.getAttribute('data-collection-id');
        this.startRenameRequest(collectionId, requestId);
      });
    });

    // Delete collection buttons
    document.querySelectorAll('.delete-collection-btn').forEach(deleteBtn => {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent triggering the header click
        
        const collectionId = deleteBtn.getAttribute('data-collection-id');
        await this.deleteCollection(collectionId);
      });
    });

    // Collection name inputs (for inline editing)
    document.querySelectorAll('.collection-name-input').forEach(input => {
      input.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          await this.finishRenameCollection(input.getAttribute('data-collection-id'), input.value);
        } else if (e.key === 'Escape') {
          this.cancelRenameCollection(input.getAttribute('data-collection-id'));
        }
      });

      input.addEventListener('blur', async (e) => {
        await this.finishRenameCollection(input.getAttribute('data-collection-id'), input.value);
      });
    });

    // Request name inputs (for inline editing)
    document.querySelectorAll('.request-name-input').forEach(input => {
      input.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          const collectionId = input.getAttribute('data-collection-id');
          const requestId = input.getAttribute('data-request-id');
          await this.finishRenameRequest(collectionId, requestId, input.value);
        } else if (e.key === 'Escape') {
          const collectionId = input.getAttribute('data-collection-id');
          const requestId = input.getAttribute('data-request-id');
          this.cancelRenameRequest(collectionId, requestId);
        }
      });

      input.addEventListener('blur', async (e) => {
        const collectionId = input.getAttribute('data-collection-id');
        const requestId = input.getAttribute('data-request-id');
        await this.finishRenameRequest(collectionId, requestId, input.value);
      });
    });
  }

  toggleCollection(collectionId) {
    // Convert ID for comparison since DOM attributes return strings
    const numCollectionId = parseInt(collectionId);
    const collection = this.collections.find(c => c.id === numCollectionId || c.id === collectionId);
    if (!collection) return;

    collection.expanded = !collection.expanded;
    this.renderCollections();
  }

  async loadCollectionRequest(collectionId, requestId) {
    try {
      const request = await window.electronAPI.db.getRequest(requestId);
      if (!request) return;

      if (!window.postboy) return;

      // Track that this request is from a collection for auto-save
      window.postboy.currentCollectionId = collectionId;
      window.postboy.currentCollectionRequestId = requestId;

      // Set method and URL - keep the full URL as stored
      window.postboy.setMethodValue(request.method);
      
      // Parse URL to separate base URL and query params
      const url = new URL(request.url);
      const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
      
      document.getElementById('url-input').value = baseUrl;

      // Set headers - convert array back to object
      const headersObj = {};
      if (request.headers && Array.isArray(request.headers)) {
        request.headers.forEach(header => {
          if (header.key && header.value) {
            headersObj[header.key] = header.value;
          }
        });
      }
      window.postboy.setKeyValuePairs('headers-container', headersObj);

      // Extract and set params from URL
      const urlParams = {};
      url.searchParams.forEach((value, key) => {
        urlParams[key] = value;
      });
      
      // Convert stored params array to object and merge with URL params
      const storedParamsObj = {};
      if (request.params && Array.isArray(request.params)) {
        request.params.forEach(param => {
          if (param.key && param.value) {
            storedParamsObj[param.key] = param.value;
          }
        });
      }
      
      const allParams = { ...urlParams, ...storedParamsObj };
      window.postboy.setKeyValuePairs('params-container', allParams);

      // Set body type and content
      const bodyType = request.body_type || 'json';
      window.postboy.setBodyType(bodyType);
      
      if (request.body_content && bodyType !== 'none') {
        if (bodyType === 'form-urlencoded') {
          // Handle form URL encoded data
          window.postboy.setFormUrlEncodedData(request.body_content);
        } else if (bodyType === 'form-data') {
          // Handle form data (would need more complex restoration)
          console.warn('Form data restoration not fully implemented');
        } else {
          // Handle text-based body types (json, xml, yaml, etc.) with auto-formatting
          window.postboy.setBodyContentWithFormatting(bodyType, request.body_content);
        }
      }

      // Load auth data if available
      if (request.auth_type && request.auth_type !== 'none' && window.authManager) {
        window.authManager.setAuthData(request.auth_type, request.authData || {});
      }
      
      // Mark current tab as saved with the request name
      if (window.postboy && window.postboy.markTabAsSaved) {
        window.postboy.markTabAsSaved(null, request.name);
      }
    } catch (error) {
      console.error('Failed to load collection request:', error);
    }
  }

  startRenameCollection(collectionId) {
    const nameText = document.querySelector(`.collection-name-text[data-collection-id="${collectionId}"]`);
    const nameInput = document.querySelector(`.collection-name-input[data-collection-id="${collectionId}"]`);
    
    if (!nameText || !nameInput) return;

    // Hide text, show input
    nameText.style.display = 'none';
    nameInput.style.display = 'inline-block';
    nameInput.focus();
    nameInput.select();
  }

  async finishRenameCollection(collectionId, newName) {
    // Convert ID for comparison since DOM attributes return strings
    const numCollectionId = parseInt(collectionId);
    const collection = this.collections.find(c => c.id === numCollectionId || c.id === collectionId);
    if (!collection) return;

    const nameText = document.querySelector(`.collection-name-text[data-collection-id="${collectionId}"]`);
    const nameInput = document.querySelector(`.collection-name-input[data-collection-id="${collectionId}"]`);
    
    if (!nameText || !nameInput) return;

    // Validate name
    const trimmedName = newName.trim();
    if (trimmedName && trimmedName !== collection.name) {
      try {
        // Update in database first
        await window.electronAPI.db.updateCollection(collectionId, trimmedName, collection.description || '');
        
        // Update local collection
        collection.name = trimmedName;
        
        // Update the text element directly instead of re-rendering everything
        nameText.textContent = trimmedName;
        nameInput.value = trimmedName;
        nameInput.style.display = 'none';
        nameText.style.display = 'inline-block';
        
        if (window.postboy) {
          window.postboy.addConsoleLog(`Collection renamed to "${trimmedName}"`);
        }
      } catch (error) {
        console.error('Failed to rename collection:', error);
        // Reset input on error
        nameInput.value = collection.name;
        nameInput.style.display = 'none';
        nameText.style.display = 'inline-block';
      }
    } else {
      // Hide input, show text
      nameInput.style.display = 'none';
      nameText.style.display = 'inline-block';
    }
  }

  cancelRenameCollection(collectionId) {
    const nameText = document.querySelector(`.collection-name-text[data-collection-id="${collectionId}"]`);
    const nameInput = document.querySelector(`.collection-name-input[data-collection-id="${collectionId}"]`);
    
    if (!nameText || !nameInput) return;

    // Reset input value and hide it
    const collection = this.collections.find(c => c.id === collectionId);
    if (collection) {
      nameInput.value = collection.name;
    }
    
    nameInput.style.display = 'none';
    nameText.style.display = 'inline-block';
  }

  startRenameRequest(collectionId, requestId) {
    const nameText = document.querySelector(`.request-name-text[data-request-id="${requestId}"][data-collection-id="${collectionId}"]`);
    const nameInput = document.querySelector(`.request-name-input[data-request-id="${requestId}"][data-collection-id="${collectionId}"]`);
    
    if (!nameText || !nameInput) return;

    // Hide text, show input
    nameText.style.display = 'none';
    nameInput.style.display = 'inline-block';
    nameInput.focus();
    nameInput.select();
  }

  async finishRenameRequest(collectionId, requestId, newName) {
    // Convert IDs for comparison since DOM attributes return strings
    const numCollectionId = parseInt(collectionId);
    const numRequestId = parseInt(requestId);
    
    const collection = this.collections.find(c => c.id === numCollectionId || c.id === collectionId);
    if (!collection) return;

    const request = collection.requests.find(r => r.id === numRequestId || r.id === requestId);
    if (!request) return;

    const nameText = document.querySelector(`.request-name-text[data-request-id="${requestId}"][data-collection-id="${collectionId}"]`);
    const nameInput = document.querySelector(`.request-name-input[data-request-id="${requestId}"][data-collection-id="${collectionId}"]`);
    
    if (!nameText || !nameInput) return;

    // Validate name
    const trimmedName = newName.trim();
    if (trimmedName && trimmedName !== request.name) {
      try {
        // Update in database first - we need to update the full request data
        const requestData = { ...request, name: trimmedName };
        await window.electronAPI.db.updateRequest(requestId, requestData);
        
        // Update local request
        request.name = trimmedName;
        
        // Update the text element directly instead of re-rendering everything
        nameText.textContent = trimmedName;
        nameInput.value = trimmedName;
        nameInput.style.display = 'none';
        nameText.style.display = 'inline-block';
        
        if (window.postboy) {
          window.postboy.addConsoleLog(`Request renamed to "${trimmedName}"`);
        }
      } catch (error) {
        console.error('Failed to rename request:', error);
        // Reset input on error
        nameInput.value = request.name;
        nameInput.style.display = 'none';
        nameText.style.display = 'inline-block';
      }
    } else {
      // Hide input, show text
      nameInput.style.display = 'none';
      nameText.style.display = 'inline-block';
    }
  }

  cancelRenameRequest(collectionId, requestId) {
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) return;

    const request = collection.requests.find(r => r.id === requestId);
    if (!request) return;

    const nameText = document.querySelector(`.request-name-text[data-request-id="${requestId}"][data-collection-id="${collectionId}"]`);
    const nameInput = document.querySelector(`.request-name-input[data-request-id="${requestId}"][data-collection-id="${collectionId}"]`);
    
    if (!nameText || !nameInput) return;

    // Reset input value and hide it
    nameInput.value = request.name;
    nameInput.style.display = 'none';
    nameText.style.display = 'inline-block';
  }

  async deleteCollectionRequest(collectionId, requestId) {
    // Convert IDs to numbers for comparison since DOM attributes return strings
    const numCollectionId = parseInt(collectionId);
    const numRequestId = parseInt(requestId);
    
    const collection = this.collections.find(c => c.id === numCollectionId || c.id === collectionId);
    if (!collection) return;

    const request = collection.requests.find(r => r.id === numRequestId || r.id === requestId);
    if (!request) return;

    // Use themed modal for delete confirmation
    const confirmDelete = await window.modalManager.confirm(
      'Delete Request',
      `Are you sure you want to delete the request "${request.name}"?`,
      'This action cannot be undone.'
    );
    if (!confirmDelete) return;

    try {
      // Delete from database first
      await window.electronAPI.db.deleteRequest(requestId);
      
      // Remove the request from the local collection
      collection.requests = collection.requests.filter(r => r.id !== requestId);
      
      // Remove the DOM element directly instead of re-rendering everything
      const requestElement = document.querySelector(`.collection-request[data-request-id="${requestId}"][data-collection-id="${collectionId}"]`);
      if (requestElement) {
        requestElement.remove();
      }
      
      // Add to console
      if (window.postboy) {
        window.postboy.addConsoleLog(`Request "${request.name}" deleted from collection "${collection.name}"`);
      }
    } catch (error) {
      console.error('Failed to delete request:', error);
    }
  }

  async deleteCollection(collectionId) {
    // Convert ID for comparison since DOM attributes return strings
    const numCollectionId = parseInt(collectionId);
    const collection = this.collections.find(c => c.id === numCollectionId || c.id === collectionId);
    if (!collection) return;

    try {
      // Get request count for confirmation
      const requests = await window.electronAPI.db.getRequests(collectionId);
      
      // Use themed modal for delete confirmation
      const message = requests.length > 0 
        ? `Are you sure you want to delete the collection "${collection.name}"?`
        : `Are you sure you want to delete the empty collection "${collection.name}"?`;
      const warning = requests.length > 0 
        ? `This will also delete all ${requests.length} request${requests.length > 1 ? 's' : ''} in this collection. This action cannot be undone.`
        : 'This action cannot be undone.';
      
      const confirmDelete = await window.modalManager.confirm(
        'Delete Collection',
        message,
        warning
      );
      if (!confirmDelete) return;

      await window.electronAPI.db.deleteCollection(collectionId);
      
      // Remove the collection from local array
      const collectionIndex = this.collections.findIndex(c => c.id === collectionId);
      if (collectionIndex !== -1) {
        this.collections.splice(collectionIndex, 1);
      }
      
      // Remove the DOM element directly
      const collectionElement = document.querySelector(`.collection-item[data-collection-id="${collectionId}"]`);
      if (collectionElement) {
        collectionElement.remove();
      }
      
      // If no collections left, show empty state
      if (this.collections.length === 0) {
        const collectionsList = document.getElementById('collections-list');
        if (collectionsList) {
          collectionsList.innerHTML = `
            <div class="empty-collections">
              <p>No collections yet</p>
              <p>Click "+" to create your first collection</p>
            </div>
          `;
        }
      }
      
      if (window.postboy) {
        window.postboy.addConsoleLog(`Collection "${collection.name}" deleted`);
      }
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  }

  async exportCollections() {
    try {
      if (this.collections.length === 0) {
        await window.modalManager.showWarning('No Collections', 'There are no collections to export.');
        return;
      }

      // First, ask user which format they want
      const formatModalContent = `
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 16px;">Choose export format:</p>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <label style="display: flex; align-items: flex-start; cursor: pointer; padding: 12px; border: 1px solid #444; border-radius: 6px; transition: all 0.2s;">
              <input type="radio" name="export-format" value="postman" checked style="margin-right: 12px; margin-top: 2px;">
              <div>
                <strong>Postman Format (v2.1.0)</strong>
                <p style="margin: 4px 0 0 0; font-size: 0.9em; color: #999;">
                  Compatible with Postman, Insomnia, and other API tools. Recommended for sharing.
                </p>
              </div>
            </label>
            <label style="display: flex; align-items: flex-start; cursor: pointer; padding: 12px; border: 1px solid #444; border-radius: 6px; transition: all 0.2s;">
              <input type="radio" name="export-format" value="postboy" style="margin-right: 12px; margin-top: 2px;">
              <div>
                <strong>PostBoy Format</strong>
                <p style="margin: 4px 0 0 0; font-size: 0.9em; color: #999;">
                  Simple JSON format, optimized for PostBoy. Smaller file size.
                </p>
              </div>
            </label>
          </div>
        </div>
      `;

      const formatResult = await window.modalManager.showModal({
        title: 'Select Export Format',
        message: formatModalContent,
        buttons: ['Next', 'Cancel'],
        defaultButton: 0,
        cancelable: true
      });

      if (formatResult.response !== 0) {
        return; // User cancelled
      }

      // Get selected format
      const formatRadio = document.querySelector('input[name="export-format"]:checked');
      const exportFormat = formatRadio ? formatRadio.value : 'postman';

      // Ask user which collections to export
      const modalContent = `
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px;">Select collections to export:</p>
          <div style="max-height: 300px; overflow-y: auto; border: 1px solid #444; border-radius: 4px; padding: 8px;">
            <label style="display: block; margin-bottom: 8px;">
              <input type="checkbox" id="export-all-collections" checked> 
              <strong>All Collections</strong>
            </label>
            <hr style="margin: 8px 0; border-color: #444;">
            ${this.collections.map((collection, index) => `
              <label style="display: block; margin-bottom: 8px;">
                <input type="checkbox" class="export-collection-checkbox" data-collection-id="${collection.id}" checked> 
                ${collection.name} (${collection.requests ? collection.requests.length : 0} requests)
              </label>
            `).join('')}
          </div>
        </div>
      `;

      const modalPromise = window.modalManager.showModal({
        title: 'Export Collections',
        message: modalContent,
        buttons: ['Export', 'Cancel'],
        defaultButton: 0,
        cancelable: true
      });

      // Setup checkbox logic after modal is shown
      setTimeout(() => {
        const allCheckbox = document.getElementById('export-all-collections');
        const collectionCheckboxes = document.querySelectorAll('.export-collection-checkbox');
        
        if (allCheckbox) {
          allCheckbox.addEventListener('change', () => {
            collectionCheckboxes.forEach(cb => cb.checked = allCheckbox.checked);
          });
        }
        
        collectionCheckboxes.forEach(cb => {
          cb.addEventListener('change', () => {
            const allChecked = Array.from(collectionCheckboxes).every(c => c.checked);
            if (allCheckbox) allCheckbox.checked = allChecked;
          });
        });
      }, 100);

      const result = await modalPromise;
      
      if (result.response === 0) {
        // Get selected collection IDs
        const selectedIds = [];
        document.querySelectorAll('.export-collection-checkbox:checked').forEach(cb => {
          selectedIds.push(parseInt(cb.getAttribute('data-collection-id')));
        });
        
        if (selectedIds.length === 0) {
          await window.modalManager.showWarning('No Selection', 'Please select at least one collection to export.');
          return this.exportCollections();
        }

        // Export the selected collections with the chosen format
        const exportData = await window.electronAPI.db.exportCollections(
          selectedIds.length === this.collections.length ? null : selectedIds,
          exportFormat
        );

        // Show save dialog
        const saveResult = await window.electronAPI.showSaveDialog({
          title: 'Export Collections',
          defaultPath: `postboy-collections-${new Date().toISOString().split('T')[0]}.json`,
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (!saveResult.canceled && saveResult.filePath) {
          const writeResult = await window.electronAPI.writeFile(
            saveResult.filePath,
            JSON.stringify(exportData, null, 2)
          );

          if (writeResult.success) {
            const collectionCount = exportData.collections.length;
            const requestCount = exportData.collections.reduce((sum, c) => sum + c.requests.length, 0);
            
            await window.modalManager.showSuccess(
              'Export Successful',
              `Exported ${collectionCount} collection${collectionCount !== 1 ? 's' : ''} with ${requestCount} request${requestCount !== 1 ? 's' : ''}.`,
              `File saved to: ${saveResult.filePath}`
            );
            
            if (window.postboy) {
              window.postboy.addConsoleLog(`Exported ${collectionCount} collections to ${saveResult.filePath}`);
            }
          } else {
            await window.modalManager.showError('Export Failed', `Failed to save file: ${writeResult.error}`);
          }
        }
      }
    } catch (error) {
      console.error('Export collections error:', error);
      await window.modalManager.showError('Export Error', `Failed to export collections: ${error.message}`);
    }
  }

  async importCollections() {
    try {
      // Show file open dialog
      const openResult = await window.electronAPI.showOpenDialog({
        title: 'Import Collections',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (openResult.canceled || !openResult.filePaths || openResult.filePaths.length === 0) {
        return;
      }

      const filePath = openResult.filePaths[0];
      const readResult = await window.electronAPI.readFile(filePath);

      if (!readResult.success) {
        await window.modalManager.showError('Import Failed', `Failed to read file: ${readResult.error}`);
        return;
      }

      let importData;
      try {
        importData = JSON.parse(readResult.data);
      } catch (error) {
        await window.modalManager.showError('Import Failed', 'Invalid JSON file format.');
        return;
      }

      // Check if it's Postman format or legacy PostBoy format
      const isPostmanFormat = importData.info && importData.item;
      if (!isPostmanFormat && (!importData.collections || !Array.isArray(importData.collections))) {
        await window.modalManager.showError('Import Failed', 'Invalid collections file format. Expected Postman v2.1.0 or PostBoy format.');
        return;
      }

      // Check for existing collections with same names
      const existingNames = new Set(this.collections.map(c => c.name));
      let conflictingCollections = [];
      
      if (isPostmanFormat) {
        // For Postman format, check the collection name or folder names
        const collectionName = importData.info?.name || 'Imported Collection';
        if (existingNames.has(collectionName)) {
          conflictingCollections.push({ name: collectionName });
        }
        // Check for folders that might become collections
        importData.item?.forEach(item => {
          if (item.item && item.name && existingNames.has(item.name)) {
            conflictingCollections.push({ name: item.name });
          }
        });
      } else {
        // Legacy format
        conflictingCollections = importData.collections.filter(c => existingNames.has(c.name));
      }
      
      let overwrite = false;
      if (conflictingCollections.length > 0) {
        const modalContent = `
          <div>
            <p style="margin-bottom: 12px;">The following collections already exist:</p>
            <ul style="margin: 12px 0; padding-left: 20px;">
              ${conflictingCollections.map(c => `<li>${c.name}</li>`).join('')}
            </ul>
            <p>What would you like to do?</p>
          </div>
        `;

        const conflictResult = await window.modalManager.showModal({
          title: 'Collections Already Exist',
          message: modalContent,
          buttons: ['Merge (Keep Both)', 'Replace Existing', 'Cancel'],
          defaultButton: 0,
          cancelable: true
        });

        if (conflictResult.response === 2) {
          return; // User cancelled
        }
        
        overwrite = conflictResult.response === 1;
      }

      // Show progress - count collections and requests based on format
      let collectionCount = 0;
      let requestCount = 0;
      
      if (isPostmanFormat) {
        // Count folders as collections, or 1 if no folders
        const folders = importData.item?.filter(item => item.item) || [];
        collectionCount = folders.length > 0 ? folders.length : 1;
        
        // Count all requests
        const countRequests = (items) => {
          let count = 0;
          items?.forEach(item => {
            if (item.request) count++;
            if (item.item) count += countRequests(item.item);
          });
          return count;
        };
        requestCount = countRequests(importData.item);
      } else {
        // Legacy format
        collectionCount = importData.collections.length;
        requestCount = importData.collections.reduce((sum, c) => sum + (c.requests ? c.requests.length : 0), 0);
      }
      
      // Import the collections
      const results = await window.electronAPI.db.importCollections(importData, overwrite);

      // Reload collections to show imported data
      await this.loadCollections();
      this.renderCollections();

      // Show results
      if (results.errors && results.errors.length > 0) {
        const errorDetails = results.errors.length > 5 
          ? results.errors.slice(0, 5).join('\n') + `\n... and ${results.errors.length - 5} more errors`
          : results.errors.join('\n');
          
        await window.modalManager.showWarning(
          'Import Completed with Errors',
          `Imported ${results.collectionsImported} collections and ${results.requestsImported} requests.`,
          `Errors:\n${errorDetails}`
        );
      } else {
        await window.modalManager.showSuccess(
          'Import Successful',
          `Successfully imported ${results.collectionsImported} collection${results.collectionsImported !== 1 ? 's' : ''} with ${results.requestsImported} request${results.requestsImported !== 1 ? 's' : ''}.`
        );
      }

      if (window.postboy) {
        window.postboy.addConsoleLog(`Imported ${results.collectionsImported} collections from ${filePath}`);
      }
    } catch (error) {
      console.error('Import collections error:', error);
      await window.modalManager.showError('Import Error', `Failed to import collections: ${error.message}`);
    }
  }
}

// Export for use in other modules
window.CollectionsManager = CollectionsManager;

