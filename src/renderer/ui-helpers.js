// UI Helpers Module
PostBoy.prototype.setupKeyValuePairs = function() {
  // Add button listeners
  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      this.addKeyValuePair(target);
    });
  });

  // Remove button listeners (event delegation)
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
      e.target.parentElement.remove();
      this.updateTabIndicators();
    }
  });

  // Update indicators when inputs change
  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('key-input') || 
        e.target.classList.contains('value-input') ||
        e.target.classList.contains('body-input')) {
      this.updateTabIndicators();
    }
  });
};

PostBoy.prototype.addKeyValuePair = function(target) {
  const container = document.getElementById(`${target}-container`);
  const row = document.createElement('div');
  row.className = 'key-value-row';
  row.innerHTML = `
    <input type="text" placeholder="Key" class="key-input" />
    <input type="text" placeholder="Value" class="value-input" />
    <button class="remove-btn">×</button>
  `;
  container.appendChild(row);
  this.updateTabIndicators();
};

PostBoy.prototype.getKeyValuePairs = function(containerId) {
  const container = document.getElementById(containerId);
  const pairs = {};
  const rows = container.querySelectorAll('.key-value-row');
  
  rows.forEach(row => {
    const key = row.querySelector('.key-input').value.trim();
    const value = row.querySelector('.value-input').value.trim();
    if (key) {
      pairs[key] = value;
    }
  });
  
  return pairs;
};

PostBoy.prototype.setKeyValuePairs = function(containerId, data) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  Object.entries(data || {}).forEach(([key, value]) => {
    const row = document.createElement('div');
    row.className = 'key-value-row';
    row.innerHTML = `
      <input type="text" placeholder="Key" class="key-input" value="${key}" />
      <input type="text" placeholder="Value" class="value-input" value="${value}" />
      <button class="remove-btn">×</button>
    `;
    container.appendChild(row);
  });

  // Add empty row if no data
  if (Object.keys(data || {}).length === 0) {
    this.addKeyValuePair(containerId.replace('-container', ''));
  }
};

PostBoy.prototype.setupCustomDropdown = function() {
  const dropdown = document.getElementById('method-dropdown');
  const selected = dropdown?.querySelector('.dropdown-selected');
  const options = dropdown?.querySelector('.dropdown-options');
  
  if (!dropdown || !selected || !options) return;

  // Position dropdown options when opening
  const positionDropdown = () => {
    const rect = selected.getBoundingClientRect();
    options.style.top = `${rect.bottom}px`;
    options.style.right = `${window.innerWidth - rect.right}px`;
    options.style.left = 'auto';
    options.style.minWidth = `${Math.max(rect.width, 200)}px`;
  };

  // Click on selected to toggle dropdown
  selected.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    
    if (!isOpen) {
      positionDropdown();
    }
    
    dropdown.classList.toggle('open');
  });

  // Click on option to select it
  options.addEventListener('click', (e) => {
    const option = e.target.closest('.dropdown-option');
    if (!option) return;
    
    const value = option.dataset.value;
    this.setMethodValue(value);
    dropdown.classList.remove('open');
  });

  // Click outside to close dropdown
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });

  // Reposition on window resize
  window.addEventListener('resize', () => {
    if (dropdown.classList.contains('open')) {
      positionDropdown();
    }
  });

  // Keyboard navigation
  dropdown.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.classList.remove('open');
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (document.activeElement === selected) {
        e.preventDefault();
        const isOpen = dropdown.classList.contains('open');
        if (!isOpen) {
          positionDropdown();
        }
        dropdown.classList.toggle('open');
      }
    }
  });
};

PostBoy.prototype.setMethodValue = function(value) {
  // Update custom dropdown display
  const dropdown = document.getElementById('method-dropdown');
  const selected = dropdown?.querySelector('.dropdown-selected');
  const text = dropdown?.querySelector('.dropdown-text');
  
  if (selected && text) {
    selected.dataset.value = value;
    text.textContent = value;
  }
};

PostBoy.prototype.getMethodValue = function() {
  // Get value from custom dropdown
  const dropdown = document.getElementById('method-dropdown');
  const selected = dropdown?.querySelector('.dropdown-selected');
  return selected?.dataset.value || 'GET';
};

PostBoy.prototype.countKeyValuePairs = function(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return 0;
  
  const rows = container.querySelectorAll('.key-value-row');
  let count = 0;
  
  rows.forEach(row => {
    const key = row.querySelector('.key-input')?.value.trim();
    if (key) count++;
  });
  
  return count;
};

PostBoy.prototype.enableBodyTypeShortcuts = function() {
  // Clear any existing timeout
  if (this.bodyTypeShortcutTimeout) {
    clearTimeout(this.bodyTypeShortcutTimeout);
  }
  
  // Enable body type shortcuts for 2 seconds
  this.bodyTypeShortcutsEnabled = true;
  
  // Disable after timeout
  this.bodyTypeShortcutTimeout = setTimeout(() => {
    this.bodyTypeShortcutsEnabled = false;
  }, 2000);
};

PostBoy.prototype.handleBodyTypeShortcut = function(key) {
  // Disable shortcuts after use
  this.bodyTypeShortcutsEnabled = false;
  if (this.bodyTypeShortcutTimeout) {
    clearTimeout(this.bodyTypeShortcutTimeout);
  }

  // Map keys to body types
  const keyToBodyType = {
    'j': 'json',
    'x': 'xml', 
    'y': 'yaml',
    'h': 'html',
    't': 'text',
    'f': 'form-data',
    'u': 'form-urlencoded',
    'i': 'binary',
    'g': 'graphql',
    'n': 'none'
  };

  const bodyType = keyToBodyType[key];
  if (bodyType) {
    this.setBodyType(bodyType);
    
    // Focus the body input after switching
    setTimeout(() => {
      const activeBodyInput = document.querySelector('.body-content.active .body-input');
      if (activeBodyInput) {
        activeBodyInput.focus();
      }
    }, 50);
  }
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
          // Remove "PPP" that might have been typed before the prevented "P"
          setTimeout(() => {
            const currentValue = e.target.value || e.target.textContent || '';
            if (currentValue.toUpperCase().endsWith('PPP')) {
              if (e.target.value !== undefined) {
                e.target.value = currentValue.slice(0, -3);
              } else if (e.target.textContent !== undefined) {
                e.target.textContent = currentValue.slice(0, -3);
              }
            }
          }, 0);
        }
        
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
    }, 2000);
  });
};

PostBoy.prototype.openShortcutsPopover = function() {
  const keyboardIcon = document.querySelector('.shortcuts-btn');
  const popover = document.getElementById('shortcuts-popover');
  
  if (keyboardIcon && popover) {
    // Show the popover
    try {
      popover.showPopover();
    } catch (error) {
      console.error('Error calling showPopover:', error);
      // Fallback: just make it visible
      popover.style.display = 'block';
      popover.style.visibility = 'visible';
    }
    
    // Position it properly
    const iconRect = keyboardIcon.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    
    // Calculate position below the icon
    let top = iconRect.bottom + 8;
    let left = iconRect.left + (iconRect.width / 2) - (popoverRect.width / 2);
    
    // Ensure popover stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Adjust horizontal position if off-screen
    if (left < 10) {
      left = 10;
    } else if (left + popoverRect.width > viewportWidth - 10) {
      left = viewportWidth - popoverRect.width - 10;
    }
    
    // Adjust vertical position if off-screen
    if (top + popoverRect.height > viewportHeight - 10) {
      top = iconRect.top - popoverRect.height - 8;
    }
    
    // Apply positioning
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }
};

PostBoy.prototype.setupShortcutsPopover = function() {
  const popover = document.getElementById('shortcuts-popover');
  const button = document.querySelector('.shortcuts-btn');
  
  if (!popover || !button) return;
  
  // Position the popover below the button when it opens
  popover.addEventListener('beforetoggle', (e) => {
    if (e.newState === 'open') {
      // Small delay to ensure popover is rendered and has dimensions
      setTimeout(() => {
        const buttonRect = button.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        
        // Position below the button with some margin
        const top = buttonRect.bottom + 8;
        
        // Try to right-align with button, but ensure it stays on screen
        let left = buttonRect.right - popoverRect.width;
        
        // Check if it goes off the right edge
        if (left + popoverRect.width > window.innerWidth - 16) {
          left = window.innerWidth - popoverRect.width - 16;
        }
        
        // Check if it goes off the left edge
        if (left < 16) {
          left = 16;
        }
        
        popover.style.position = 'fixed';
        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
      }, 0);
    }
  });
};