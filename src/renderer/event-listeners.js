// Event Listeners Module
PostBoy.prototype.setupEventListeners = function() {
  const newTabBtn = document.querySelector('.new-tab-btn');
  if (newTabBtn) {
    newTabBtn.addEventListener('click', () => {
      this.createNewRequestTab();
    });
  }

  // Setup existing tab click handlers
  document.querySelectorAll('.request-tab').forEach(tab => {
    const tabId = tab.getAttribute('data-tab-id');
    if (tabId) {
      tab.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close-btn')) {
          this.switchToTab(tabId);
        }
      });
      
      const closeBtn = tab.querySelector('.tab-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeTab(tabId);
        });
      }
    }
  });

  // Setup custom dropdown
  this.setupCustomDropdown();

  // Send request
  document.getElementById('send-btn').addEventListener('click', () => {
    this.sendRequest();
  });

  // Clear history
  document.getElementById('clear-history').addEventListener('click', () => {
    this.clearHistory();
  });

  // URL input enter key
  document.getElementById('url-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      this.sendRequest();
    }
  });

  // Global Ctrl+Enter shortcut to send request from anywhere
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      this.sendRequest();
    }
  });

  this.setupHelpShortcut();

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+I: Focus URL input (but not Ctrl+Shift+I)
    if (e.ctrlKey && !e.shiftKey && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault();
      const urlInput = document.getElementById('url-input');
      if (urlInput) {
        urlInput.focus();
        urlInput.select(); // Also select all text for easy replacement
      }
    }
    
    // Ctrl+S: Save request
    else if (e.ctrlKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      if (window.collectionsManager) {
        window.collectionsManager.saveCurrentRequest();
      }
    }
    
    // Ctrl+H: Focus headers tab
    else if (e.ctrlKey && !e.shiftKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      this.switchTab('request', 'headers');
      setTimeout(() => {
        const firstHeaderInput = document.querySelector('#headers-container .key-input');
        if (firstHeaderInput) {
          firstHeaderInput.focus();
        }
      }, 50);
    }
    
    // Ctrl+B: Focus body tab and enable body type shortcuts
    else if (e.ctrlKey && !e.shiftKey && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      this.switchTab('request', 'body');
      
      // Enable body type shortcuts for a short period
      this.enableBodyTypeShortcuts();
      
      setTimeout(() => {
        // Focus the currently active body input
        const activeBodyInput = document.querySelector('.body-content.active .body-input');
        if (activeBodyInput) {
          activeBodyInput.focus();
        }
      }, 50);
    }
    
    // Ctrl+P: Focus params tab
    else if (e.ctrlKey && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      this.switchTab('request', 'params');
      setTimeout(() => {
        const firstParamInput = document.querySelector('#params-container .key-input');
        if (firstParamInput) {
          firstParamInput.focus();
        }
      }, 50);
    }
    
    // Ctrl+Shift+A: Focus auth tab
    else if (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      this.switchTab('request', 'auth');
      setTimeout(() => {
        // Focus the first input in auth tab if available
        const firstAuthInput = document.querySelector('#auth-tab input, #auth-tab select');
        if (firstAuthInput) {
          firstAuthInput.focus();
        }
      }, 50);
    }
    
    // Ctrl+Shift+C: Switch to Collections tab
    else if (e.ctrlKey && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      this.switchSidebarTab('collections');
    }
    
    // Ctrl+Shift+H: Switch to History tab
    else if (e.ctrlKey && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      this.switchSidebarTab('history');
    }
    
    // Body type shortcuts (only when enabled after Ctrl+B)
    else if (this.bodyTypeShortcutsEnabled && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      this.handleBodyTypeShortcut(e.key.toLowerCase());
    }
  });

  // URL input change - parse query params and mark as unsaved
  document.getElementById('url-input').addEventListener('input', () => {
    this.parseUrlParams();
    this.markTabAsUnsaved();
  });

  // URL input paste - handle curl commands
  document.getElementById('url-input').addEventListener('paste', (e) => {
    setTimeout(() => {
      this.parseUrlParams();
    }, 10); // Small delay to ensure pasted content is processed
  });



  // History item click
  document.getElementById('history-list').addEventListener('click', (e) => {
    const historyItem = e.target.closest('.history-item');
    if (historyItem) {
      const index = Array.from(historyItem.parentNode.children).indexOf(historyItem);
      this.loadFromHistory(index);
    }
  });

  // Copy to clipboard
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-btn')) {
      this.copyHeadersToClipboard();
    }
  });

  // Body input syntax highlighting and auto-beautify on paste (for JSON)
  // We'll set this up dynamically when JSON body type is selected
  this.setupBodyInputListeners();


};

PostBoy.prototype.setupBodyInputListeners = function() {
  // Setup listeners for JSON body input
  const jsonBodyInput = document.querySelector('#body-json .body-input');
  if (jsonBodyInput) {
    jsonBodyInput.addEventListener('input', () => {
    this.highlightBodyJSON();
    this.updateTabIndicators();
  });
    
    jsonBodyInput.addEventListener('paste', (e) => {
    e.preventDefault();
    
    // Get pasted text
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    
    // Try to beautify immediately if it's JSON
    let finalText = pastedText;
    try {
      const parsed = JSON.parse(pastedText.trim());
      finalText = JSON.stringify(parsed, null, 2);
    } catch (err) {
      // Not JSON, use as-is
    }
    
    // Insert the text
      jsonBodyInput.textContent = finalText;
    
    // Apply syntax highlighting
    this.highlightBodyJSON();
    this.updateTabIndicators();
  });
  }
};

PostBoy.prototype.setupModalEventListeners = function() {
  // New Collection Modal
  const newCollectionModal = document.getElementById('new-collection-modal');
  const collectionNameInput = document.getElementById('collection-name-input');
  const createCollectionBtn = document.getElementById('create-collection');
  const cancelCollectionBtn = document.getElementById('cancel-collection');
  const closeCollectionModalBtn = document.getElementById('close-collection-modal');

  // Create collection button
  if (createCollectionBtn) {
    createCollectionBtn.addEventListener('click', () => {
      this.handleCreateCollection();
    });
  }

  // Cancel/Close collection modal
  [cancelCollectionBtn, closeCollectionModalBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        this.hideNewCollectionModal();
      });
    }
  });

  // Enter key in collection name input
  if (collectionNameInput) {
    collectionNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleCreateCollection();
      }
    });
  }

  // Close modal when clicking outside
  if (newCollectionModal) {
    newCollectionModal.addEventListener('click', (e) => {
      if (e.target === newCollectionModal) {
        this.hideNewCollectionModal();
      }
    });
  }

  // Save Request Modal functionality is handled by CollectionsManager


};
