// Utilities Module - Helper functions and initialization

// Load and display app version
async function loadAppVersion() {
  try {
    if (window.electronAPI && window.electronAPI.getVersion) {
      const version = await window.electronAPI.getVersion();
      const versionElement = document.getElementById('app-version');
      if (versionElement) {
        versionElement.textContent = `v${version}`;
      }
    }
  } catch (error) {
    console.error('Failed to load app version:', error);
    // Fallback: keep the placeholder text
  }
}

// Initialize function to avoid duplication
async function initializeApp() {
  // Load and display app version
  loadAppVersion();
  
  // Initialize modal manager
  window.modalManager = new ModalManager();
  
  // Initialize auth manager
  window.authManager = new AuthManager();
  window.authManager.init();
  
  // Initialize main app first (non-blocking)
  window.postboy = new PostBoy();
  
  // Initialize collections manager in background (non-blocking)
  window.collectionsManager = new CollectionsManager();
  window.collectionsManager.init(); // Remove await to make it non-blocking
  
  // Setup IPC listeners for update notifications
  if (window.electronAPI) {
    window.electronAPI.onUpdateNotification(async (data) => {
      const result = await window.modalManager.showUpdateModal(data);
      // Send response back to main process if needed
      if (result && window.electronAPI.sendUpdateResponse) {
        window.electronAPI.sendUpdateResponse(result);
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Ensure input cursor behavior
function ensureInputCursorBehavior() {
  document.querySelectorAll('input[type="text"], textarea').forEach(input => {
    if (input.readOnly || input.disabled) {
      input.style.cursor = 'default';
    } else {
      input.style.cursor = 'text';
    }
  });
}
