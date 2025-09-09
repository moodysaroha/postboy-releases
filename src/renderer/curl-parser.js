// cURL Parser Module
PostBoy.prototype.parseUrlParams = function() {
  const urlInput = document.getElementById('url-input');
  const url = urlInput.value.trim();
  
  // Check if this might be a cURL command
  if (url.toLowerCase().startsWith('curl ')) {
    this.parseCurlCommand(url);
    return;
  }
  
  // Regular URL parameter parsing
  try {
    const urlObj = new URL(url);
    const params = {};
    
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    // Update the URL input to show just the base URL
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    urlInput.value = baseUrl;
    
    // Merge with existing params
    const existingParams = this.getKeyValuePairs('params-container');
    const mergedParams = { ...existingParams, ...params };
    
    // Update params container
    this.setKeyValuePairs('params-container', mergedParams);
    
  } catch (err) {
    // Not a valid URL, ignore
  }
};

PostBoy.prototype.parseCurlCommand = function(curlCommand) {
  try {
    const parsed = this.curlParser(curlCommand);
    
    if (parsed.url) {
      // Set method
      this.setMethodValue(parsed.method || 'GET');
      
      // Set URL
      document.getElementById('url-input').value = parsed.url;
      
      // Set headers
      if (parsed.headers && Object.keys(parsed.headers).length > 0) {
        this.setKeyValuePairs('headers-container', parsed.headers);
      }
      
      // Set params if any
      if (parsed.params && Object.keys(parsed.params).length > 0) {
        this.setKeyValuePairs('params-container', parsed.params);
      }
      
      // Update tab indicators to show counts
      this.updateTabIndicators();
      
      // Set body if present
      if (parsed.body) {
        // Try to determine body type from content-type
        const contentType = parsed.headers['Content-Type'] || parsed.headers['content-type'] || '';
        let bodyType = 'json'; // default
        
        if (contentType.includes('application/x-www-form-urlencoded')) {
          bodyType = 'form-urlencoded';
          // Parse form data
          if (bodyType === 'form-urlencoded') {
            this.setBodyType('form-urlencoded');
            this.setFormUrlEncodedData(parsed.body);
          }
        } else if (contentType.includes('application/json')) {
          bodyType = 'json';
        } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
          bodyType = 'xml';
        } else {
          bodyType = 'text';
        }
        
        if (bodyType !== 'form-urlencoded') {
          this.setBodyType(bodyType);
          this.setBodyContentWithFormatting(bodyType, parsed.body);
        }
      }
      
      // Set auth if present
      if (parsed.auth && window.authManager) {
        window.authManager.setAuthData(parsed.auth.type, parsed.auth.data);
      }
      
      // Show success feedback
      this.showCurlParseSuccess();
    }
  } catch (err) {
    console.error('Failed to parse cURL command:', err);
    this.showCurlParseError();
  }
};

PostBoy.prototype.curlParser = function(curlCommand) {
  const tokens = this.tokenizeCurlCommand(curlCommand);
  const result = {
    method: 'GET',
    url: '',
    headers: {},
    body: '',
    params: {},
    auth: null
  };
  
  let i = 1; // Skip 'curl'
  
  while (i < tokens.length) {
    const token = tokens[i];
    
    if (token === '-X' || token === '--request') {
      i++;
      if (i < tokens.length) {
        result.method = tokens[i].toUpperCase();
      }
    } else if (token === '-H' || token === '--header') {
      i++;
      if (i < tokens.length) {
        const header = tokens[i];
        const colonIndex = header.indexOf(':');
        if (colonIndex > 0) {
          const key = header.substring(0, colonIndex).trim();
          const value = header.substring(colonIndex + 1).trim();
          result.headers[key] = value;
        }
      }
    } else if (token === '-d' || token === '--data') {
      i++;
      if (i < tokens.length) {
        result.body = tokens[i];
        if (result.method === 'GET') {
          result.method = 'POST';
        }
      }
    } else if (token === '--data-raw') {
      i++;
      if (i < tokens.length) {
        result.body = tokens[i];
        if (result.body) {
          // Try to parse as JSON first
          try {
            JSON.parse(result.body);
            if (!result.headers['Content-Type']) {
              result.headers['Content-Type'] = 'application/json';
            }
          } catch (e) {
            // Not JSON, leave as is
          }
        }
        if (result.method === 'GET') {
          result.method = 'POST';
        }
      }
    } else if (token === '--data-urlencode') {
      i++;
      if (i < tokens.length) {
        const data = tokens[i];
        const colonIndex = data.indexOf('=');
        if (colonIndex > 0) {
          const key = data.substring(0, colonIndex);
          const value = data.substring(colonIndex + 1);
          result.params[key] = decodeURIComponent(value);
        }
      }
    } else if (token === '-u' || token === '--user') {
      i++;
      if (i < tokens.length) {
        const auth = tokens[i];
        const colonIndex = auth.indexOf(':');
        if (colonIndex > 0) {
          result.auth = {
            type: 'basic',
            data: {
              username: auth.substring(0, colonIndex),
              password: auth.substring(colonIndex + 1)
            }
          };
        }
      }
    } else if (token === '--compressed') {
      result.headers['Accept-Encoding'] = 'gzip, deflate, br';
    } else if (token === '-A' || token === '--user-agent') {
      i++;
      if (i < tokens.length) {
        result.headers['User-Agent'] = tokens[i];
      }
    } else if (token === '-e' || token === '--referer') {
      i++;
      if (i < tokens.length) {
        result.headers['Referer'] = tokens[i];
      }
    } else if (!token.startsWith('-') && !result.url) {
      // This should be the URL
      result.url = token;
    }
    
    i++;
  }
  
  return result;
};

PostBoy.prototype.tokenizeCurlCommand = function(command) {
  const tokens = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let escaped = false;
  
  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      continue;
    }
    
    if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = '';
      continue;
    }
    
    if (!inQuotes && char === ' ') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    
    current += char;
  }
  
  if (current) {
    tokens.push(current);
  }
  
  return tokens;
};

PostBoy.prototype.showCurlParseSuccess = function() {
  const urlInput = document.getElementById('url-input');
  urlInput.classList.add('curl-success');
  
  setTimeout(() => {
    urlInput.classList.remove('curl-success');
  }, 2000);
  
  this.addConsoleLog('cURL command parsed successfully');
};

PostBoy.prototype.showCurlParseError = function() {
  const urlInput = document.getElementById('url-input');
  urlInput.classList.add('curl-error');
  
  setTimeout(() => {
    urlInput.classList.remove('curl-error');
  }, 2000);
  
  this.addConsoleLog('Failed to parse cURL command');
};
