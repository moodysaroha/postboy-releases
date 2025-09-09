// Request Handler Module
PostBoy.prototype.sendRequest = async function() {
  const method = this.getMethodValue();
  const url = document.getElementById('url-input').value.trim();
  
  if (!url) {
    await window.modalManager.showWarning(
      'URL Required',
      'Please enter a URL to send the request.'
    );
    document.getElementById('url-input').focus();
    return;
  }

  // Show loading state
  document.body.classList.add('loading');
  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;

  try {
    // Get headers and params
    const headers = this.getKeyValuePairs('headers-container');
    const params = this.getKeyValuePairs('params-container');

    // Build URL with params
    let requestUrl = url;
    const urlParams = new URLSearchParams(params);
    if (urlParams.toString()) {
      requestUrl += (url.includes('?') ? '&' : '?') + urlParams.toString();
    }

    // Prepare request options
    const requestOptions = {
      method: method,
      headers: { ...headers }
    };

    // Handle different body types
    const bodyData = this.getRequestBody();
    const bodyType = this.getCurrentBodyType();
    
    if (['POST', 'PUT', 'PATCH'].includes(method) && bodyData.body) {
      requestOptions.body = bodyData.body;
      // Set content type if not already set
      if (bodyData.contentType && !requestOptions.headers['Content-Type']) {
        requestOptions.headers['Content-Type'] = bodyData.contentType;
      }
    }

    // Make request
    const startTime = Date.now();
    const response = await fetch(requestUrl, requestOptions);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Get response data
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Display response (always fully expanded)
    this.displayResponse(response, responseData, responseTime);

    // Store the response data for potential saving to collections
    this.lastResponseData = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      responseTime
    };

    // Add to history
    this.addToHistory({
      method,
      url: requestUrl,
      headers,
      params,
      body: bodyData.body || '',
      bodyType,
      response: this.lastResponseData,
      timestamp: new Date().toISOString()
    });

    // Auto-save to collection if this request came from a collection
    if (this.currentCollectionId && this.currentCollectionRequestId) {
      this.autoSaveToCollection();
    }

  } catch (error) {
    console.error('Request failed:', error);
    this.displayError(error.message);
  } finally {
    // Remove loading state
    document.body.classList.remove('loading');
    sendBtn.disabled = false;
  }
};

PostBoy.prototype.displayResponse = function(response, data, responseTime, timestamp = null) {
  // Show the status bar
  document.getElementById('response-status-bar').style.display = 'flex';

  // Make sure we're on the preview tab
  this.switchResponseTab('preview');

  // Update status badge
  const statusBadge = document.getElementById('status-badge');
  statusBadge.textContent = `${response.status} ${response.statusText}`;
  statusBadge.className = 'status-badge ' + (response.ok ? '' : 'error');

  // Update response time and size
  document.getElementById('response-time').textContent = `${responseTime} ms`;
  
  // Calculate response size
  const responseSize = new Blob([typeof data === 'string' ? data : JSON.stringify(data)]).size;
  const sizeFormatted = responseSize < 1024 ? `${responseSize} B` : `${(responseSize / 1024).toFixed(1)} KB`;
  document.getElementById('response-size').textContent = sizeFormatted;

  // Update timestamp - use provided timestamp or current time
  this.lastResponseTimestamp = timestamp || new Date().toISOString();
  this.startTimestampUpdater();

  // Hide empty state and show json container
  const emptyState = document.getElementById('response-empty-state');
  const jsonContainer = document.getElementById('json-container');
  const responseBody = document.getElementById('response-body');
  
  if (emptyState) emptyState.style.display = 'none';
  jsonContainer.style.display = 'block';
  
  // Display response body with proper formatting
  if (data && typeof data === 'object') {
    // Clear any existing content
    responseBody.innerHTML = '';
    
    // Configure original renderjson
    // Always show everything expanded for better visibility
    renderjson.set_icons('▶', '▼')
             .set_show_to_level('all')  // Always show all levels expanded
             .set_max_string_length(1000);  // Show longer strings
    
    // Render the JSON with original renderjson
    const jsonElement = renderjson(data);
    jsonElement.classList.add('renderjson-container');
    
    // Create the two-column layout with separate line numbers
    this.createTwoColumnLayout(responseBody, jsonElement);
  } else {
    // For non-JSON data, create simple line-numbered display
    responseBody.innerHTML = '';
    const textContent = String(data || 'No data');
    const lines = textContent.split('\n');
    
    lines.forEach((line, index) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'simple-line';
      
      const lineNumSpan = document.createElement('span');
      lineNumSpan.className = 'line-number';
      lineNumSpan.textContent = (index + 1).toString().padStart(3, ' ');
      
      const contentSpan = document.createElement('span');
      contentSpan.className = 'line-content';
      contentSpan.textContent = line;
      
      lineDiv.appendChild(lineNumSpan);
      lineDiv.appendChild(contentSpan);
      responseBody.appendChild(lineDiv);
    });
  }

  // Display response headers in table format
  this.displayResponseHeaders(response.headers);

  // Update response headers count
  const headersCount = response.headers ? Object.keys(Object.fromEntries(response.headers.entries())).length : 0;
  const responseHeadersCountElement = document.getElementById('response-headers-count');
  if (responseHeadersCountElement) {
    responseHeadersCountElement.textContent = headersCount.toString();
  }

  // Add to console
  this.addConsoleLog(`${response.status} ${response.statusText} • ${responseTime}ms • ${sizeFormatted}`);
};

PostBoy.prototype.displayResponseHeaders = function(headers) {
  const headersTable = document.getElementById('response-headers-table');
  headersTable.innerHTML = '';

  if (headers) {
    Object.entries(Object.fromEntries(headers.entries())).forEach(([name, value]) => {
      const row = document.createElement('div');
      row.className = 'table-row';
      row.innerHTML = `
        <div class="table-cell name">${name}</div>
        <div class="table-cell value">${value}</div>
      `;
      headersTable.appendChild(row);
    });
  }
};

PostBoy.prototype.syntaxHighlightJSON = function(json) {
  // Escape HTML first to prevent XSS
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Replace different JSON elements with styled spans
  return json
    // Property names (keys) - including quotes
    .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="json-key">$1</span>:')
    // String values - including quotes
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="json-string">$1</span>')
    // Numbers (integers and floats)
    .replace(/:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, ': <span class="json-number">$1</span>')
    // Booleans
    .replace(/:\s*(true|false)\b/g, ': <span class="json-boolean">$1</span>')
    // Null values
    .replace(/:\s*(null)\b/g, ': <span class="json-null">$1</span>')
    // Punctuation
    .replace(/([{}[\],])/g, '<span class="json-punctuation">$1</span>');
};

PostBoy.prototype.createTwoColumnLayout = function(container, jsonElement) {
  // Create wrapper for two-column layout
  const wrapper = document.createElement('div');
  wrapper.className = 'json-two-column';
  
  // Create line numbers sidebar
  const lineNumbersSidebar = document.createElement('div');
  lineNumbersSidebar.className = 'line-numbers-sidebar';
  lineNumbersSidebar.id = 'line-numbers-sidebar';
  
  // Create JSON content area
  const jsonContent = document.createElement('div');
  jsonContent.className = 'json-content-area';
  jsonContent.appendChild(jsonElement);
  
  // Add both to wrapper
  wrapper.appendChild(lineNumbersSidebar);
  wrapper.appendChild(jsonContent);
  
  // Add wrapper to container
  container.appendChild(wrapper);
  
  // Generate line numbers based on JSON content
  this.generateLineNumbers(jsonElement, lineNumbersSidebar);
  
  // Setup observers for dynamic updates
  this.setupJsonObserver(jsonElement, lineNumbersSidebar);
};

PostBoy.prototype.generateLineNumbers = function(jsonElement, lineNumbersSidebar) {
  // Get the text content and count lines
  const textContent = jsonElement.textContent || '';
  const lines = textContent.split('\n');
  const lineCount = lines.length;
  
  // Generate line numbers
  const lineNumbers = [];
  for (let i = 1; i <= lineCount; i++) {
    lineNumbers.push(`<div class="line-number-item">${i.toString().padStart(3, ' ')}</div>`);
  }
  
  lineNumbersSidebar.innerHTML = lineNumbers.join('');
};

PostBoy.prototype.setupJsonObserver = function(jsonElement, lineNumbersSidebar) {
  // Create observer to update line numbers when JSON changes
  const observer = new MutationObserver(() => {
    setTimeout(() => {
      this.generateLineNumbers(jsonElement, lineNumbersSidebar);
    }, 50); // Small delay to let renderjson finish its updates
  });
  
  // Observe changes in the JSON element
  observer.observe(jsonElement, {
    childList: true,
    subtree: true,
    attributes: true
  });
  
  // Also use ResizeObserver for height changes
  const resizeObserver = new ResizeObserver(() => {
    this.generateLineNumbers(jsonElement, lineNumbersSidebar);
  });
  
  resizeObserver.observe(jsonElement);
};

PostBoy.prototype.addConsoleLog = function(message) {
  const consoleContent = document.getElementById('console-content');
  const logEntry = document.createElement('div');
  logEntry.className = 'console-log';
  logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  consoleContent.appendChild(logEntry);
  consoleContent.scrollTop = consoleContent.scrollHeight;
};

PostBoy.prototype.displayError = function(message) {
  // Show the status bar
  document.getElementById('response-status-bar').style.display = 'flex';

  // Make sure we're on the preview tab
  this.switchResponseTab('preview');

  const statusBadge = document.getElementById('status-badge');
  statusBadge.textContent = 'Error';
  statusBadge.className = 'status-badge error';

  document.getElementById('response-time').textContent = '0 ms';
  document.getElementById('response-size').textContent = '0 B';
  
  // Set timestamp for errors too
  this.lastResponseTimestamp = new Date().toISOString();
  this.startTimestampUpdater();

  // Hide empty state and show response body
  const emptyState = document.getElementById('response-empty-state');
  const responseBody = document.getElementById('response-body');
  
  if (emptyState) emptyState.style.display = 'none';
  responseBody.style.display = 'block';
  responseBody.textContent = `Error: ${message}`;

  // Clear headers table
  document.getElementById('response-headers-table').innerHTML = '';
  const responseHeadersCountElement = document.getElementById('response-headers-count');
  if (responseHeadersCountElement) {
    responseHeadersCountElement.textContent = '0';
  }

  // Add to console
  this.addConsoleLog(`Error: ${message}`);
};

PostBoy.prototype.copyHeadersToClipboard = async function() {
  const headersTable = document.getElementById('response-headers-table');
  const rows = headersTable.querySelectorAll('.table-row');
  
  let headersText = '';
  rows.forEach(row => {
    const name = row.querySelector('.table-cell.name').textContent;
    const value = row.querySelector('.table-cell.value').textContent;
    headersText += `${name}: ${value}\n`;
  });

  try {
    await navigator.clipboard.writeText(headersText);
    this.addConsoleLog('Headers copied to clipboard');
  } catch (err) {
    console.error('Failed to copy headers:', err);
    this.addConsoleLog('Failed to copy headers to clipboard');
  }
};

PostBoy.prototype.formatRelativeTime = function(timestamp) {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

PostBoy.prototype.startTimestampUpdater = function() {
  // Clear any existing interval
  if (this.timestampUpdateInterval) {
    clearInterval(this.timestampUpdateInterval);
  }
  
  // Update timestamp immediately
  this.updateResponseTimestamp();
  
  // Update every 10 seconds
  this.timestampUpdateInterval = setInterval(() => {
    this.updateResponseTimestamp();
  }, 10000);
};

PostBoy.prototype.updateResponseTimestamp = function() {
  if (this.lastResponseTimestamp) {
    const timestampEl = document.getElementById('response-timestamp');
    if (timestampEl) {
      timestampEl.textContent = this.formatRelativeTime(this.lastResponseTimestamp);
    }
  }
};

PostBoy.prototype.autoSaveToCollection = function() {
  if (!window.collectionsManager) return;
  
  const collections = window.collectionsManager.collections;
  const collection = collections.find(c => c.id === this.currentCollectionId);
  
  if (!collection) return;
  
  const request = collection.requests.find(r => r.id === this.currentCollectionRequestId);
  
  if (!request) return;
  
  const method = this.getMethodValue();
  const baseUrl = document.getElementById('url-input')?.value.trim();
  const headers = this.getKeyValuePairs('headers-container');
  const params = this.getKeyValuePairs('params-container');
  const bodyData = this.getRequestBody();
  const body = bodyData.body || '';
  
  let fullUrl = baseUrl;
  const urlParams = new URLSearchParams(params);
  if (urlParams.toString()) {
    fullUrl += (baseUrl.includes('?') ? '&' : '?') + urlParams.toString();
  }
  
  let authData = null;
  if (window.authManager) {
    authData = window.authManager.exportAuthData();
  }
  
  request.method = method;
  request.url = fullUrl;
  request.headers = headers;
  request.params = params;
  request.body = body;
  request.auth = authData;
  request.response = this.lastResponseData;
  request.lastExecuted = new Date().toISOString();
  
  window.collectionsManager.saveCollections();
  
  this.addConsoleLog(`Request "${request.name}" in collection "${collection.name}" auto-updated with latest response`);
};
