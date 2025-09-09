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
