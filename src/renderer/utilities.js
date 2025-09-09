// Utilities Module
PostBoy.prototype.setupShortcutsPopover = function() {
  const popover = document.getElementById('shortcuts-popover');
  const shortcutsBtn = document.querySelector('.shortcuts-btn');
  
  if (!popover || !shortcutsBtn) return;

  popover.addEventListener('toggle', (e) => {
    if (e.newState === 'open') {
      // Position the popover
      this.positionShortcutsPopover();
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popover.open) {
      popover.hidePopover();
    }
  });
};

PostBoy.prototype.positionShortcutsPopover = function() {
  const popover = document.getElementById('shortcuts-popover');
  const button = document.querySelector('.shortcuts-btn');
  
  if (!popover || !button) return;

  const buttonRect = button.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Calculate initial position (top-right of button)
  let left = buttonRect.right - popoverRect.width;
  let top = buttonRect.bottom + 8;

  // Adjust if popover goes off-screen horizontally
  if (left + popoverRect.width > viewportWidth - 16) {
    left = viewportWidth - popoverRect.width - 16;
  }
  
  if (left < 16) {
    left = 16;
  }

  // Adjust if popover goes off-screen vertically
  if (top + popoverRect.height > viewportHeight - 16) {
    top = buttonRect.top - popoverRect.height - 8;
  }

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
};

PostBoy.prototype.setupHelpShortcut = function() {
  let helpSequence = '';
  let helpTimeout = null;
  
  document.addEventListener('keydown', (e) => {
    if (helpTimeout) {
      clearTimeout(helpTimeout);
    }
    
    // Only process single character keys (not modifiers, arrows, etc.)
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const char = e.key.toUpperCase();
      helpSequence += char;
      
      // console.log(`HELP sequence: "${helpSequence}"`); // Debug log
      
      if (helpSequence.endsWith('PPPP')) {
        e.preventDefault();
        e.stopPropagation();
        
        // If we're in a text input, handle it specially
        const isInTextInput = e.target && (
          e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' || 
          e.target.contentEditable === 'true'
        );
        
        if (isInTextInput) {
          // Remove the last 4 characters (PPPP) from the input
          setTimeout(() => {
            const currentValue = e.target.value || e.target.textContent || '';
            if (currentValue.length >= 4) {
              if (e.target.value !== undefined) {
                e.target.value = currentValue.slice(0, -4);
              } else if (e.target.textContent !== undefined) {
                e.target.textContent = currentValue.slice(0, -4);
              }
            }
          }, 0);
        }
        
        // console.log('About to call openShortcutsPopover');
        this.openShortcutsPopover();
        helpSequence = '';
        return;
      }
      
      // Keep last 10 chars to prevent memory issues
      if (helpSequence.length > 10) {
        helpSequence = helpSequence.slice(-10);
      }
    }
    
    // Reset after 2 seconds of inactivity
    helpTimeout = setTimeout(() => {
      helpSequence = '';
      // console.log('HELP sequence reset');
    }, 2000);
  });
};

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
  
  // Initialize collections manager
  window.collectionsManager = new CollectionsManager();
  await window.collectionsManager.init();
  
  // Initialize main app
  window.postboy = new PostBoy();
  
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
