// History Manager Module
PostBoy.prototype.loadHistory = async function() {
  try {
    this.history = await window.electronAPI.db.getHistory(50);
  } catch (error) {
    console.error('Failed to load history:', error);
    this.history = [];
  }
};

PostBoy.prototype.addToHistory = async function(requestData) {
  try {
    // Extract response data
    const responseData = {
      status: requestData.response?.status || 0,
      responseTime: requestData.response?.responseTime || 0,
      headers: requestData.response?.headers || {},
      body: requestData.response?.data || ''
    };

    // Add to database
    await window.electronAPI.db.addHistory(requestData, responseData);
    
    // Reload history and re-render
    await this.loadHistory();
    this.renderHistory();
  } catch (error) {
    console.error('Failed to add to history:', error);
  }
};

PostBoy.prototype.renderHistory = function() {
  const historyList = document.getElementById('history-list');
  
  if (this.history.length === 0) {
    historyList.innerHTML = '<div class="no-history">No requests yet</div>';
    return;
  }

  historyList.innerHTML = this.history.map(item => {
    const statusClass = item.status_code < 400 ? 'success' : 'error';
    const methodClass = item.method.toLowerCase();
    
    return `
      <div class="history-item">
        <div class="method ${methodClass}">${item.method}</div>
        <div class="url">${item.url}</div>
        <div class="status ${statusClass}">${item.status_code}</div>
      </div>
    `;
  }).join('');
};

PostBoy.prototype.loadFromHistory = function(index) {
  const item = this.history[index];
  if (!item) return;

  // Create response data from database fields
  const responseData = {
    status: item.status_code,
    statusText: item.status_code < 400 ? 'OK' : 'Error',
    data: item.response_body,
    responseTime: item.response_time,
    headers: item.responseHeaders || {}
  };
  this.lastResponseData = responseData;
  
  this.currentCollectionId = null;
  this.currentCollectionRequestId = null;

  // Set method and URL - keep the full URL as stored
  this.setMethodValue(item.method);
  
  // Parse URL to separate base URL and query params
  const url = new URL(item.url);
  const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
  
  document.getElementById('url-input').value = baseUrl;

  // Set headers - convert array back to object
  const headersObj = {};
  if (item.headers && Array.isArray(item.headers)) {
    item.headers.forEach(header => {
      if (header.key && header.value) {
        headersObj[header.key] = header.value;
      }
    });
  }
  this.setKeyValuePairs('headers-container', headersObj);

  // Extract and set params from URL
  const urlParams = {};
  url.searchParams.forEach((value, key) => {
    urlParams[key] = value;
  });
  
  // Convert stored params array to object and merge with URL params
  const storedParamsObj = {};
  if (item.params && Array.isArray(item.params)) {
    item.params.forEach(param => {
      if (param.key && param.value) {
        storedParamsObj[param.key] = param.value;
      }
    });
  }
  
  const allParams = { ...urlParams, ...storedParamsObj };
  this.setKeyValuePairs('params-container', allParams);

  // Set body type and content
  const bodyType = item.body_type || 'json';
  this.setBodyType(bodyType);
  
  if (item.body_content && bodyType !== 'none') {
    if (bodyType === 'form-urlencoded') {
      // Handle form URL encoded data
      this.setFormUrlEncodedData(item.body_content);
    } else if (bodyType === 'form-data') {
      // Handle form data (would need more complex restoration)
      console.warn('Form data restoration not fully implemented');
    } else {
      // Handle text-based body types (json, xml, yaml, etc.) with auto-formatting
      this.setBodyContentWithFormatting(bodyType, item.body_content);
    }
  }
  this.updateTabIndicators(); // Update tab indicators after loading body

  // Load auth data if available
  if (item.auth_type && item.auth_type !== 'none' && window.authManager) {
    window.authManager.setAuthData(item.auth_type, item.authData || {});
  }

  // Display previous response
  if (responseData.status) {
    this.displayResponse({
      status: responseData.status,
      statusText: responseData.statusText,
      ok: responseData.status < 400,
      headers: new Map(Object.entries(responseData.headers || {}))
    }, responseData.data, responseData.responseTime, item.executed_at);
  }
};

PostBoy.prototype.clearHistory = async function() {
  const confirmed = await window.modalManager.confirm(
    'Clear History',
    'Are you sure you want to clear all history?',
    'This action cannot be undone.'
  );
  
  if (confirmed) {
    try {
      await window.electronAPI.db.clearHistory();
      await this.loadHistory();
      this.renderHistory();
      this.addConsoleLog('History cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
      this.addConsoleLog('Failed to clear history');
    }
  }
};
