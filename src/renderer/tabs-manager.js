// Tab Management Module
PostBoy.prototype.setupTabs = function() {
  // Request tabs
  document.querySelectorAll('.request-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      this.switchTab('request', tabName);
    });
  });

  // Response tabs
  document.querySelectorAll('.response-tabs .response-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      this.switchResponseTab(tabName);
    });
  });
};

PostBoy.prototype.switchTab = function(type, tabName) {
  // Remove active class from all tabs
  document.querySelectorAll(`.${type}-tabs .tab-btn`).forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Hide all tab panes
  document.querySelectorAll(`#headers-tab, #body-tab, #params-tab, #auth-tab`).forEach(pane => {
    pane.classList.remove('active');
  });
  
  // Activate clicked tab
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-tab`).classList.add('active');
};

PostBoy.prototype.switchResponseTab = function(tabName) {
  // Remove active class from all response tabs
  document.querySelectorAll('.response-tabs .response-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Hide all response tab panes
  document.querySelectorAll('.response-tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  
  // Activate clicked tab
  const tabButton = document.querySelector(`.response-tabs [data-tab="${tabName}"]`);
  
  // Handle special case for headers tab (has different ID structure)
  let tabPane;
  if (tabName === 'headers') {
    tabPane = document.getElementById('response-headers-tab');
  } else {
    tabPane = document.getElementById(`${tabName}-tab`);
  }
  
  if (tabButton) tabButton.classList.add('active');
  if (tabPane) tabPane.classList.add('active');
};

PostBoy.prototype.updateTabIndicators = function() {
  // Update params count
  const paramsCount = this.countKeyValuePairs('params-container');
  const paramsCountElement = document.getElementById('params-count');
  if (paramsCountElement) {
    paramsCountElement.textContent = paramsCount;
    paramsCountElement.style.display = paramsCount > 0 ? 'inline' : 'none';
  }

  // Update headers count
  const headersCount = this.countKeyValuePairs('headers-container');
  const headersCountElement = document.getElementById('headers-count');
  if (headersCountElement) {
    headersCountElement.textContent = headersCount;
    headersCountElement.style.display = headersCount > 0 ? 'inline' : 'none';
  }

  // Update body indicator
  const bodyIndicator = document.getElementById('body-indicator');
  if (bodyIndicator) {
    const bodyType = this.getCurrentBodyType();
    const hasBody = bodyType !== 'none' && this.getRequestBody();
    bodyIndicator.style.display = hasBody ? 'inline' : 'none';
  }

  // Update auth indicator
  const authIndicator = document.getElementById('auth-indicator');
  if (authIndicator && window.authManager) {
    const authType = window.authManager.getCurrentAuthType();
    const hasAuth = authType && authType !== 'none';
    authIndicator.style.display = hasAuth ? 'inline-block' : 'none';
  }
};

// Tab Management Methods
PostBoy.prototype.initializeDefaultTab = function() {
  // Initialize the default tab state
  const defaultTabState = this.getCurrentTabState();
  this.tabs.set('new-request', defaultTabState);
  
  // Update the default tab title to show method
  this.updateCurrentTabTitle();
};

PostBoy.prototype.getCurrentTabState = function() {
  const currentTab = this.tabs.get(this.activeTabId);
  return {
    method: this.getMethodValue(),
    url: document.getElementById('url-input').value,
    params: this.getKeyValuePairs('params-container'),
    headers: this.getKeyValuePairs('headers-container'),
    bodyType: this.getCurrentBodyType(),
    body: this.getRequestBody(),
    auth: window.authManager ? window.authManager.exportAuthData() : { type: 'none', data: {} },
    collectionId: this.currentCollectionId,
    collectionRequestId: this.currentCollectionRequestId,
    savedName: currentTab ? currentTab.savedName : null,
    isSaved: currentTab ? currentTab.isSaved : false,
    hasUnsavedChanges: currentTab ? currentTab.hasUnsavedChanges : false
  };
};

PostBoy.prototype.saveCurrentTabState = function() {
  if (this.activeTabId) {
    const state = this.getCurrentTabState();
    this.tabs.set(this.activeTabId, state);
  }
};

PostBoy.prototype.loadTabState = function(tabId) {
  const state = this.tabs.get(tabId);
  if (!state) return;

  // Set method
  this.setMethodValue(state.method || 'GET');
  
  // Set URL
  document.getElementById('url-input').value = state.url || '';
  
  // Set params
  this.setKeyValuePairs('params-container', state.params || {});
  
  // Set headers
  this.setKeyValuePairs('headers-container', state.headers || {});
  
  // Set body type and content
  if (state.bodyType) {
    this.setBodyType(state.bodyType);
    if (state.body) {
      this.setBodyContentWithFormatting(state.bodyType, state.body);
    }
  }
  
  // Set auth
  if (state.auth && window.authManager) {
    window.authManager.setAuthData(state.auth.type, state.auth.data);
  }
  
  // Set collection tracking
  this.currentCollectionId = state.collectionId || null;
  this.currentCollectionRequestId = state.collectionRequestId || null;
  
  // Update indicators
  this.updateTabIndicators();
};

PostBoy.prototype.createNewRequestTab = function() {
  // Save current tab state before switching
  this.saveCurrentTabState();
  
  // Generate new tab ID
  this.tabCounter++;
  const newTabId = `request-${this.tabCounter}`;
  
  // Create new tab element
  this.createTabElement(newTabId, `Request ${this.tabCounter}`);
  
  // Create empty state for new tab
  const newTabState = {
    method: 'GET',
    url: '',
    params: {},
    headers: {},
    bodyType: 'json',
    body: '',
    auth: { type: 'none', data: {} },
    collectionId: null,
    collectionRequestId: null,
    savedName: null,
    isSaved: false,
    hasUnsavedChanges: false
  };
  
  // Store new tab state
  this.tabs.set(newTabId, newTabState);
  
  // Switch to new tab
  this.switchToTab(newTabId);
};

PostBoy.prototype.createTabElement = function(tabId, title) {
  const tabsList = document.querySelector('.request-tabs-list');
  
  const tabElement = document.createElement('div');
  tabElement.className = 'request-tab';
  tabElement.setAttribute('data-tab-id', tabId);
  
  // Create initial title with method
  const method = 'GET'; // New tabs default to GET
  const methodColor = this.getMethodColor(method);
  const methodSpan = `<span style="color: ${methodColor}; font-weight: 600;">${method}</span>`;
  const nameSpan = `<span>${title}</span>`;
  
  tabElement.innerHTML = `
    <span class="tab-title">${methodSpan} ${nameSpan}</span>
    <button class="tab-close-btn">&times;</button>
  `;
  
  // Add click handler for tab switching
  tabElement.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-close-btn')) {
      this.switchToTab(tabId);
    }
  });
  
  // Add close handler
  const closeBtn = tabElement.querySelector('.tab-close-btn');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    this.closeTab(tabId);
  });
  
  tabsList.appendChild(tabElement);
};

PostBoy.prototype.switchToTab = function(tabId) {
  // Save current tab state
  this.saveCurrentTabState();
  
  // Update active tab
  document.querySelectorAll('.request-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  const targetTab = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  // Update active tab ID
  this.activeTabId = tabId;
  
  // Load tab state
  this.loadTabState(tabId);
  
  // Clear response (new tab should not show previous response)
  this.clearResponse();
};

PostBoy.prototype.closeTab = function(tabId) {
  // If it's the only tab, create a new one and then close this one
  if (this.tabs.size <= 1) {
    // Create a new tab first
    this.tabCounter++;
    const newTabId = `request-${this.tabCounter}`;
    this.createTabElement(newTabId, `Request ${this.tabCounter}`);
    
    // Create empty state for new tab
    const newTabState = {
      method: 'GET',
      url: '',
      params: {},
      headers: {},
      bodyType: 'json',
      body: '',
      auth: { type: 'none', data: {} },
      collectionId: null,
      collectionRequestId: null,
      savedName: null,
      isSaved: false,
      hasUnsavedChanges: false
    };
    
    this.tabs.set(newTabId, newTabState);
    this.switchToTab(newTabId);
  }
  
  // Remove tab from DOM
  const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (tabElement) {
    tabElement.remove();
  }
  
  // Remove from tabs map
  this.tabs.delete(tabId);
  
  // If closing active tab and there are other tabs, switch to another tab
  if (this.activeTabId === tabId && this.tabs.size > 0) {
    // Switch to the first available tab
    const firstTabId = this.tabs.keys().next().value;
    if (firstTabId) {
      this.switchToTab(firstTabId);
    }
  }
};

PostBoy.prototype.clearResponse = function() {
  // Clear response display
  const responseEmptyState = document.getElementById('response-empty-state');
  const jsonContainer = document.getElementById('json-container');
  const responseHeadersTable = document.getElementById('response-headers-table');
  
  if (responseEmptyState) responseEmptyState.style.display = 'block';
  if (jsonContainer) {
    jsonContainer.style.display = 'none';
    jsonContainer.innerHTML = '';
  }
  if (responseHeadersTable) {
    responseHeadersTable.innerHTML = '';
  }
  
  // Reset response headers count
  const responseHeadersCount = document.getElementById('response-headers-count');
  if (responseHeadersCount) {
    responseHeadersCount.textContent = '0';
  }
  
  // Clear any response data
  this.lastResponseData = null;
  this.lastResponseTimestamp = null;
};

PostBoy.prototype.updateTabTitle = function(tabId, name, isSaved, hasUnsavedChanges) {
  
  const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (!tabElement) {
    console.log(`Tab element not found for tabId: ${tabId}`);
    return;
  }
  
  const titleElement = tabElement.querySelector('.tab-title');
  if (!titleElement) {
    console.log(`Title element not found for tabId: ${tabId}`);
    return;
  }
  
  // Update tab state
  const tabState = this.tabs.get(tabId);
  if (tabState) {
    tabState.savedName = name;
    tabState.isSaved = isSaved;
    tabState.hasUnsavedChanges = hasUnsavedChanges;
  }
  
  // Get current method for coloring
  const currentMethod = this.getMethodValue() || 'GET';
  const methodColor = this.getMethodColor(currentMethod);
  
  // Determine display name
  let displayName = name || this.getDefaultTabName(tabId);
  
  // Add unsaved indicator
  if (hasUnsavedChanges && !isSaved) {
    displayName = displayName + ' *';
  }
  
  // Create HTML with colored method and name
  const methodSpan = `<span style="color: ${methodColor}; font-weight: 600;">${currentMethod}</span>`;
  
  // Apply italic styling to the name span if unsaved
  const styledNameSpan = hasUnsavedChanges && !isSaved 
    ? `<span style="font-style: italic;">${displayName}</span>`
    : `<span>${displayName}</span>`;
  
  // Update title HTML with proper styling
  titleElement.innerHTML = `${methodSpan} ${styledNameSpan}`;
  
  // Also apply italic to the entire title element as backup
  if (hasUnsavedChanges && !isSaved) {
    titleElement.style.fontStyle = 'italic';
  } else {
    titleElement.style.fontStyle = 'normal';
  }
};

PostBoy.prototype.getMethodColor = function(method) {
  const colors = {
    'GET': 'var(--success-color)',
    'POST': 'var(--success-color)', 
    'PUT': '#ff9500',
    'DELETE': 'var(--error-color)',
    'PATCH': 'var(--warning-color)',
    'OPTIONS': '#17a2b8',
    'HEAD': '#6c757d'
  };
  return colors[method.toUpperCase()] || 'var(--text-primary)';
};

PostBoy.prototype.getDefaultTabName = function(tabId) {
  if (tabId === 'new-request') {
    return 'New Request';
  }
  // Extract number from request-X format
  const match = tabId.match(/request-(\d+)/);
  return match ? `Request ${match[1]}` : 'Request';
};

PostBoy.prototype.markTabAsUnsaved = function(tabId) {
  const targetTabId = tabId || this.activeTabId;
  const tabState = this.tabs.get(targetTabId);
  if (tabState) {
    const name = tabState.savedName || this.getDefaultTabName(targetTabId);
    const isSaved = false;
    this.updateTabTitle(targetTabId, name, isSaved, true);
  }
};

PostBoy.prototype.markTabAsSaved = function(tabId, savedName) {
  this.updateTabTitle(tabId || this.activeTabId, savedName, true, false);
};

PostBoy.prototype.updateCurrentTabTitle = function() {
  const tabState = this.tabs.get(this.activeTabId);
  if (tabState) {
    const name = tabState.savedName || this.getDefaultTabName(this.activeTabId);
    this.updateTabTitle(this.activeTabId, name, tabState.isSaved, tabState.hasUnsavedChanges);
  }
};

PostBoy.prototype.setupChangeDetection = function() {
  // Method dropdown change
  const methodDropdown = document.getElementById('method-dropdown');
  if (methodDropdown) {
    methodDropdown.addEventListener('click', () => {
      // Use setTimeout to detect after the value changes
      setTimeout(() => {
        this.markTabAsUnsaved();
        // Also update the tab title to reflect the new method color
        this.updateCurrentTabTitle();
      }, 10);
    });
  }
  
  // Body type dropdown change
  const bodyTypeDropdown = document.getElementById('body-type-dropdown');
  if (bodyTypeDropdown) {
    bodyTypeDropdown.addEventListener('click', () => {
      setTimeout(() => this.markTabAsUnsaved(), 10);
    });
  }
  
  // Key-value pair changes (params, headers)
  const containers = ['params-container', 'headers-container', 'form-data-container', 'form-urlencoded-container'];
  containers.forEach(containerId => {
    const container = document.getElementById(containerId);
    if (container) {
      container.addEventListener('input', () => this.markTabAsUnsaved());
      container.addEventListener('change', () => this.markTabAsUnsaved());
    }
  });
  
  // Body content changes
  const bodyInputs = document.querySelectorAll('.body-input');
  bodyInputs.forEach(input => {
    input.addEventListener('input', () => this.markTabAsUnsaved());
  });
  
  // Auth changes
  const authContent = document.getElementById('auth-content');
  if (authContent) {
    authContent.addEventListener('input', () => this.markTabAsUnsaved());
    authContent.addEventListener('change', () => this.markTabAsUnsaved());
  }
};
