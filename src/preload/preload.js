const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Update notifications
  onUpdateNotification: (callback) => {
    ipcRenderer.on('update-notification', (event, data) => callback(data));
  },
  
  // Send update response back to main process
  sendUpdateResponse: (response) => {
    ipcRenderer.send('update-response', response);
  },
  
  // Remove listener
  removeUpdateListener: () => {
    ipcRenderer.removeAllListeners('update-notification');
  },

  // Generic modal request (for future use)
  showModal: (options) => {
    return ipcRenderer.invoke('show-modal', options);
  },

  // Get app version
  getVersion: () => {
    return ipcRenderer.invoke('get-version');
  },

  // Listen for app ready message (for loading screen)
  onAppReady: (callback) => {
    ipcRenderer.on('app-ready', callback);
  },

  // Database operations
  db: {
    // Collections
    createCollection: (name, description) => ipcRenderer.invoke('db-create-collection', name, description),
    getCollections: () => ipcRenderer.invoke('db-get-collections'),
    getCollection: (id) => ipcRenderer.invoke('db-get-collection', id),
    updateCollection: (id, name, description) => ipcRenderer.invoke('db-update-collection', id, name, description),
    deleteCollection: (id) => ipcRenderer.invoke('db-delete-collection', id),
    
    // Requests
    createRequest: (collectionId, requestData) => ipcRenderer.invoke('db-create-request', collectionId, requestData),
    getRequests: (collectionId) => ipcRenderer.invoke('db-get-requests', collectionId),
    getRequest: (id) => ipcRenderer.invoke('db-get-request', id),
    updateRequest: (id, requestData) => ipcRenderer.invoke('db-update-request', id, requestData),
    deleteRequest: (id) => ipcRenderer.invoke('db-delete-request', id),
    
    // History
    addHistory: (requestData, responseData) => ipcRenderer.invoke('db-add-history', requestData, responseData),
    getHistory: (limit) => ipcRenderer.invoke('db-get-history', limit),
    clearHistory: () => ipcRenderer.invoke('db-clear-history'),
    
    // Settings
    setSetting: (key, value) => ipcRenderer.invoke('db-set-setting', key, value),
    getSetting: (key, defaultValue) => ipcRenderer.invoke('db-get-setting', key, defaultValue),
    getAllSettings: () => ipcRenderer.invoke('db-get-all-settings'),
    
    // Import/Export
    exportCollections: (collectionIds, format) => ipcRenderer.invoke('db-export-collections', collectionIds, format),
    importCollections: (importData, overwrite) => ipcRenderer.invoke('db-import-collections', importData, overwrite)
  },
  
  // File operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath)
});