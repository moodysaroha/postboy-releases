// Body Editor Module
PostBoy.prototype.setupBodyEditor = function() {
  this.setupBodyTypeSelector();
  this.setupFileUpload();
  this.setupFormDataHandlers();
  
  const formatJsonBtn = document.getElementById('body-format-json');
  const toggleViewBtn = document.getElementById('body-toggle-view');
  const bodyInput = document.querySelector('#body-json .body-input');
  const bodyJsonViewer = document.getElementById('body-json-viewer');
  
  let isViewerMode = false;

  // Format JSON button
  if (formatJsonBtn) {
    formatJsonBtn.addEventListener('click', () => {
      this.beautifyJSON(); // Use existing method that includes syntax highlighting
    });
  }

  // Toggle view button
  if (toggleViewBtn) {
    toggleViewBtn.addEventListener('click', () => {
      const content = bodyInput ? bodyInput.textContent.trim() : '';
      
      if (!isViewerMode) {
        // Switch to viewer mode
        if (content) {
          try {
            const parsed = JSON.parse(content);
            this.renderBodyJson(parsed);
            bodyInput.style.display = 'none';
            bodyJsonViewer.style.display = 'block';
            toggleViewBtn.textContent = '📝';
            toggleViewBtn.title = 'Switch to Edit Mode';
            isViewerMode = true;
          } catch (e) {
            // Not valid JSON, can't switch to viewer
            console.warn('Invalid JSON for viewer mode');
          }
        }
      } else {
        // Switch to edit mode
        bodyInput.style.display = 'block';
        bodyJsonViewer.style.display = 'none';
        toggleViewBtn.textContent = '👁️';
        toggleViewBtn.title = 'Switch to View Mode';
        isViewerMode = false;
      }
    });
  }
};

PostBoy.prototype.beautifyJSON = function() {
  const bodyInput = document.querySelector('#body-json .body-input');
  if (!bodyInput) return;
  
  const content = bodyInput.textContent.trim();
  
  if (!content) return;
  
  try {
    const parsed = JSON.parse(content);
    const beautified = JSON.stringify(parsed, null, 2);
    bodyInput.textContent = beautified;
    this.highlightBodyJSON();
    this.updateTabIndicators(); // Update tab indicators after formatting
  } catch (err) {
    // If it's not valid JSON, just format it nicely
    console.log('Not valid JSON, keeping as is');
  }
};

PostBoy.prototype.autoFormatBodyContent = function(bodyType, content) {
  if (!content || !content.trim()) return content;

  try {
    switch (bodyType) {
      case 'json':
        // Try to parse and format JSON
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      case 'xml':
        return this.formatXML(content);
      case 'html':
        return this.formatHTML(content);
      default:
        return content;
    }
  } catch (err) {
    // If formatting fails, return original content
    return content;
  }
};

PostBoy.prototype.formatXML = function(xml) {
  const formatted = xml.replace(/></g, '>\n<');
  const lines = formatted.split('\n');
  let indent = 0;
  const indentStr = '  ';
  
  return lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('</')) {
      indent--;
    }
    const result = indentStr.repeat(Math.max(0, indent)) + trimmed;
    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
      indent++;
    }
    return result;
  }).join('\n');
};

PostBoy.prototype.formatHTML = function(html) {
  return this.formatXML(html); // Use same logic as XML
};

PostBoy.prototype.setBodyContentWithFormatting = function(bodyType, content) {
  const formattedContent = this.autoFormatBodyContent(bodyType, content);
  
  const bodyInput = document.querySelector(`#body-${bodyType} .body-input`);
  if (bodyInput) {
    bodyInput.textContent = formattedContent;
    
    if (bodyType === 'json') {
      this.highlightBodyJSON();
    }
  }
};

PostBoy.prototype.highlightBodyJSON = function() {
  const bodyInput = document.querySelector('#body-json .body-input');
  if (!bodyInput) return;

  const content = bodyInput.textContent;
  if (!content.trim()) return;

  try {
    JSON.parse(content); // Validate JSON first
    const highlighted = this.syntaxHighlightJSON(content);
    
    // Store cursor position
    const selection = window.getSelection();
    let startOffset = 0;
    let endOffset = 0;
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      startOffset = this.getTextOffset(bodyInput, range.startContainer, range.startOffset);
      endOffset = this.getTextOffset(bodyInput, range.endContainer, range.endOffset);
    }
    
    // Apply highlighting
    bodyInput.innerHTML = highlighted;
    
    // Restore cursor position
    this.setTextOffset(bodyInput, startOffset, endOffset);
  } catch (err) {
    // Invalid JSON, don't highlight
  }
};

PostBoy.prototype.getTextOffset = function(container, node, offset) {
  let textOffset = 0;
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let currentNode;
  while (currentNode = walker.nextNode()) {
    if (currentNode === node) {
      return textOffset + offset;
    }
    textOffset += currentNode.textContent.length;
  }
  
  return textOffset;
};

PostBoy.prototype.setTextOffset = function(container, startOffset, endOffset) {
  const range = document.createRange();
  const selection = window.getSelection();
  
  let currentOffset = 0;
  const textNodes = this.getTextNodes(container);
  
  let startNode = null, endNode = null;
  let startNodeOffset = 0, endNodeOffset = 0;
  
  for (const node of textNodes) {
    if (currentOffset + node.textContent.length >= startOffset) {
      if (!startNode) {
        startNode = node;
        startNodeOffset = startOffset - currentOffset;
      }
      
      if (currentOffset + node.textContent.length >= endOffset) {
        endNode = node;
        endNodeOffset = endOffset - currentOffset;
        break;
      }
    }
    currentOffset += node.textContent.length;
  }
  
  if (startNode && endNode) {
    try {
      range.setStart(startNode, startNodeOffset);
      range.setEnd(endNode, endNodeOffset);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (err) {
      // Ignore cursor positioning errors
    }
  }
};

PostBoy.prototype.getTextNodes = function(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  return textNodes;
};

PostBoy.prototype.setupBodyTypeSelector = function() {
  // Setup custom dropdown for body type
  this.setupBodyTypeDropdown();
  
  // Initialize with JSON as default for new requests
  this.switchBodyType('json');
};

PostBoy.prototype.setupBodyTypeDropdown = function() {
  const dropdown = document.getElementById('body-type-dropdown');
  const selected = dropdown?.querySelector('.dropdown-selected');
  const options = dropdown?.querySelector('.dropdown-options');
  
  if (!dropdown || !selected || !options) return;
  
  // Toggle dropdown
  selected.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  
  // Handle option selection
  options.addEventListener('click', (e) => {
    if (e.target.classList.contains('dropdown-option')) {
      const value = e.target.getAttribute('data-value');
      const text = e.target.textContent;
      
      // Update selected display
      selected.setAttribute('data-value', value);
      selected.querySelector('.dropdown-text').textContent = text;
      
      // Close dropdown
      dropdown.classList.remove('open');
      
      // Switch body type
      this.switchBodyType(value);
    }
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
};

PostBoy.prototype.switchBodyType = function(type) {
  // Hide all body content sections
  document.querySelectorAll('.body-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Show selected body type
  const selectedContent = document.getElementById(`body-${type}`);
  if (selectedContent) {
    selectedContent.classList.add('active');
  }
  
  // Show/hide body actions for JSON type
  const bodyActions = document.getElementById('body-actions');
  if (type === 'json') {
    bodyActions.style.display = 'flex';
  } else {
    bodyActions.style.display = 'none';
  }
  
  // Update tab indicators
  this.updateTabIndicators();
};

PostBoy.prototype.setupFileUpload = function() {
  const fileInput = document.getElementById('binary-file-input');
  const selectFileBtn = document.querySelector('.select-file-btn');
  const removeFileBtn = document.querySelector('.remove-file-btn');
  const fileInfo = document.getElementById('file-info');
  const filePlaceholder = document.querySelector('.file-upload-placeholder');
  
  if (selectFileBtn) {
    selectFileBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.displayFileInfo(file);
      }
    });
  }
  
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
      fileInput.value = '';
      this.displayFileInfo(null);
    });
  }
};

PostBoy.prototype.displayFileInfo = function(file) {
  const placeholder = document.querySelector('.file-upload-placeholder');
  const fileInfo = document.querySelector('.file-info');
  
  if (file) {
    placeholder.style.display = 'none';
    fileInfo.style.display = 'flex';
    document.querySelector('.file-name').textContent = file.name;
    document.querySelector('.file-size').textContent = this.formatFileSize(file.size);
  } else {
    placeholder.style.display = 'block';
    fileInfo.style.display = 'none';
  }
};

PostBoy.prototype.formatFileSize = function(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

PostBoy.prototype.setupFormDataHandlers = function() {
  // Form data type change handlers
  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('body-type-selector')) {
      const target = e.target.value;
      if (target === 'form-data' || target === 'form-urlencoded') {
        this.addFormField(target);
      }
    }
  });
};

PostBoy.prototype.addFormField = function(type) {
  const containerId = type === 'form-data' ? 'form-data-container' : 'form-urlencoded-container';
  const container = document.getElementById(containerId);
  
  if (!container) return;
  
  const row = document.createElement('div');
  row.className = 'key-value-row';
  
  if (type === 'form-data') {
    row.innerHTML = `
      <input type="text" placeholder="Key" class="key-input" />
      <input type="text" placeholder="Value" class="value-input" />
      <select class="type-select">
        <option value="text">Text</option>
        <option value="file">File</option>
      </select>
      <button class="remove-btn">×</button>
    `;
  } else {
    row.innerHTML = `
      <input type="text" placeholder="Key" class="key-input" />
      <input type="text" placeholder="Value" class="value-input" />
      <button class="remove-btn">×</button>
    `;
  }
  
  container.appendChild(row);
  
  const keyInput = row.querySelector('.key-input');
  if (keyInput) {
    keyInput.focus();
  }
};

PostBoy.prototype.getRequestBody = function() {
  const bodyType = this.getCurrentBodyType();
  
  switch (bodyType) {
    case 'json':
    case 'xml':
    case 'yaml':
    case 'html':
    case 'text':
      const bodyInput = document.querySelector(`#body-${bodyType} .body-input`);
      return {
        body: bodyInput ? bodyInput.textContent.trim() : '',
        contentType: this.getContentTypeForBodyType(bodyType)
      };
      
    case 'form-urlencoded':
      const formData = this.getKeyValuePairs('form-urlencoded-container');
      const formDataString = new URLSearchParams(formData).toString();
      return {
        body: formDataString,
        contentType: 'application/x-www-form-urlencoded'
      };
      
    case 'form-data':
      const formDataPairs = this.getFormDataPairs('form-data-container');
      const formDataObj = new FormData();
      
      for (const [key, value, type] of formDataPairs) {
        if (key) {
          if (type === 'file') {
            const fileInput = document.getElementById('file-input');
            if (fileInput && fileInput.files[0]) {
              formDataObj.append(key, fileInput.files[0]);
            }
          } else {
            formDataObj.append(key, value);
          }
        }
      }
      
      return {
        body: formDataObj,
        contentType: null // Let browser set multipart boundary
      };
      
    case 'binary':
      const fileInput = document.getElementById('file-input');
      if (fileInput && fileInput.files[0]) {
        return {
          body: fileInput.files[0],
          contentType: 'application/octet-stream'
        };
      }
      return { body: '', contentType: null };
      
    case 'graphql':
      const queryInput = document.querySelector('#body-graphql .graphql-query');
      const variablesInput = document.querySelector('#body-graphql .graphql-variables');
      
      const graphqlBody = {
        query: queryInput ? queryInput.textContent.trim() : '',
        variables: {}
      };
      
      if (variablesInput && variablesInput.textContent.trim()) {
        try {
          graphqlBody.variables = JSON.parse(variablesInput.textContent.trim());
        } catch (err) {
          console.warn('Invalid JSON in GraphQL variables');
        }
      }
      
      return {
        body: JSON.stringify(graphqlBody),
        contentType: 'application/json'
      };
      
    default:
      return { body: '', contentType: null };
  }
};

PostBoy.prototype.getFormDataPairs = function(containerId) {
  const container = document.getElementById(containerId);
  const pairs = [];
  const rows = container.querySelectorAll('.key-value-row');
  
  rows.forEach(row => {
    const key = row.querySelector('.key-input')?.value.trim();
    const value = row.querySelector('.value-input')?.value.trim();
    const typeSelect = row.querySelector('.type-select');
    const type = typeSelect ? typeSelect.value : 'text';
    
    if (key || value) {
      pairs.push([key, value, type]);
    }
  });
  
  return pairs;
};

PostBoy.prototype.getCurrentBodyType = function() {
  const dropdown = document.getElementById('body-type-dropdown');
  const selected = dropdown?.querySelector('.dropdown-selected');
  return selected?.getAttribute('data-value') || 'none';
};

PostBoy.prototype.setBodyType = function(bodyType) {
  // Update the dropdown selection
  const dropdown = document.getElementById('body-type-dropdown');
  const selected = dropdown?.querySelector('.dropdown-selected');
  
  if (selected) {
    selected.setAttribute('data-value', bodyType);
    
    // Update display text
    const typeNames = {
      'none': 'No Body',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'html': 'HTML',
      'javascript': 'JavaScript',
      'text': 'Plain Text',
      'form-data': 'Form Data',
      'form-urlencoded': 'Form URL Encoded',
      'binary': 'File',
      'graphql': 'GraphQL'
    };
    
    selected.querySelector('.dropdown-text').textContent = typeNames[bodyType] || bodyType;
  }
  
  // Switch to the body type
  this.switchBodyType(bodyType);
};

PostBoy.prototype.getContentTypeForBodyType = function(bodyType) {
  const contentTypes = {
    'json': 'application/json',
    'xml': 'application/xml',
    'yaml': 'application/x-yaml',
    'html': 'text/html',
    'text': 'text/plain'
  };
  
  return contentTypes[bodyType] || 'text/plain';
};

PostBoy.prototype.setFormUrlEncodedData = function(formDataString) {
  const container = document.getElementById('form-urlencoded-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  try {
    const params = new URLSearchParams(formDataString);
    params.forEach((value, key) => {
      const row = document.createElement('div');
      row.className = 'key-value-row';
      row.innerHTML = `
        <input type="text" placeholder="Key" class="key-input" value="${key}" />
        <input type="text" placeholder="Value" class="value-input" value="${value}" />
        <button class="remove-btn">×</button>
      `;
      container.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to parse form data:', err);
  }
  
  // Add empty row
  this.addFormField('form-urlencoded');
};

PostBoy.prototype.renderBodyJson = function(jsonData) {
  const jsonViewer = document.getElementById('body-json-viewer');
  const bodyInput = document.querySelector('#body-json .body-input');
  
  if (!jsonViewer || !bodyInput) return;
  
  jsonViewer.innerHTML = '';
  
  // Configure renderjson for body viewer
  renderjson.set_icons('▶', '▼')
           .set_show_to_level(2)
           .set_max_string_length(100);
  
  const jsonElement = renderjson(jsonData);
  jsonViewer.appendChild(jsonElement);
  
  // Show viewer, hide input
  jsonViewer.style.display = 'block';
  bodyInput.style.display = 'none';
};
