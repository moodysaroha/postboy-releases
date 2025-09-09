const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = null;
  }

  init() {
    try {
      // Store database in user data directory
      const userDataPath = app.getPath('userData');
      this.dbPath = path.join(userDataPath, 'postboy.db');
      
      console.log('Initializing database at:', this.dbPath);
      
      // Open database connection
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL'); // Better performance
      
      // Create tables
      this.createTables();
      
      console.log('Database initialized successfully');
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      return false;
    }
  }

  createTables() {
    // Collections table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Requests table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_id INTEGER,
        name TEXT NOT NULL,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        headers TEXT,
        params TEXT,
        body_type TEXT,
        body_content TEXT,
        auth_type TEXT,
        auth_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE
      )
    `);

    // History table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        status_code INTEGER,
        response_time INTEGER,
        headers TEXT,
        params TEXT,
        body_type TEXT,
        body_content TEXT,
        auth_type TEXT,
        auth_data TEXT,
        response_headers TEXT,
        response_body TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Collections CRUD
  createCollection(name, description = '') {
    const stmt = this.db.prepare(`
      INSERT INTO collections (name, description) 
      VALUES (?, ?)
    `);
    const result = stmt.run(name, description);
    return result.lastInsertRowid;
  }

  getCollections() {
    const stmt = this.db.prepare('SELECT * FROM collections ORDER BY created_at DESC');
    return stmt.all();
  }

  getCollection(id) {
    const stmt = this.db.prepare('SELECT * FROM collections WHERE id = ?');
    return stmt.get(id);
  }

  updateCollection(id, name, description) {
    const stmt = this.db.prepare(`
      UPDATE collections 
      SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    return stmt.run(name, description, id);
  }

  deleteCollection(id) {
    const stmt = this.db.prepare('DELETE FROM collections WHERE id = ?');
    return stmt.run(id);
  }

  // Requests CRUD
  createRequest(collectionId, requestData) {
    const stmt = this.db.prepare(`
      INSERT INTO requests (
        collection_id, name, method, url, headers, params, 
        body_type, body_content, auth_type, auth_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      collectionId,
      requestData.name,
      requestData.method,
      requestData.url,
      JSON.stringify(requestData.headers || []),
      JSON.stringify(requestData.params || []),
      requestData.bodyType || 'json',
      requestData.bodyContent || '',
      requestData.authType || 'none',
      JSON.stringify(requestData.authData || {})
    );
    
    return result.lastInsertRowid;
  }

  getRequests(collectionId) {
    const stmt = this.db.prepare('SELECT * FROM requests WHERE collection_id = ? ORDER BY created_at DESC');
    const requests = stmt.all(collectionId);
    
    // Parse JSON fields
    return requests.map(req => ({
      ...req,
      headers: JSON.parse(req.headers || '[]'),
      params: JSON.parse(req.params || '[]'),
      authData: JSON.parse(req.auth_data || '{}')
    }));
  }

  getRequest(id) {
    const stmt = this.db.prepare('SELECT * FROM requests WHERE id = ?');
    const request = stmt.get(id);
    
    if (request) {
      request.headers = JSON.parse(request.headers || '[]');
      request.params = JSON.parse(request.params || '[]');
      request.authData = JSON.parse(request.auth_data || '{}');
    }
    
    return request;
  }

  updateRequest(id, requestData) {
    const stmt = this.db.prepare(`
      UPDATE requests 
      SET name = ?, method = ?, url = ?, headers = ?, params = ?, 
          body_type = ?, body_content = ?, auth_type = ?, auth_data = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(
      requestData.name,
      requestData.method,
      requestData.url,
      JSON.stringify(requestData.headers || []),
      JSON.stringify(requestData.params || []),
      requestData.bodyType || 'json',
      requestData.bodyContent || '',
      requestData.authType || 'none',
      JSON.stringify(requestData.authData || {}),
      id
    );
  }

  deleteRequest(id) {
    const stmt = this.db.prepare('DELETE FROM requests WHERE id = ?');
    return stmt.run(id);
  }

  // History CRUD
  addHistory(requestData, responseData) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO history (
          method, url, status_code, response_time, headers, params,
          body_type, body_content, auth_type, auth_data,
          response_headers, response_body
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Ensure all required fields are present and not undefined
      const method = requestData?.method || 'GET';
      const url = requestData?.url || '';
      const status = responseData?.status || 0;
      const responseTime = responseData?.responseTime || 0;
      const headers = JSON.stringify(requestData?.headers || []);
      const requestParams = JSON.stringify(requestData?.params || []);
      const bodyType = requestData?.bodyType || requestData?.body_type || 'json';
      const bodyContent = requestData?.bodyContent || requestData?.body_content || requestData?.body || '';
      const authType = requestData?.authType || requestData?.auth_type || 'none';
      const authData = JSON.stringify(requestData?.authData || requestData?.auth_data || {});
      const responseHeaders = JSON.stringify(responseData?.headers || {});
      
      // Handle response body - it could be an object or string
      let responseBody = responseData?.body || responseData?.data || '';
      if (typeof responseBody === 'object') {
        responseBody = JSON.stringify(responseBody);
      }
      
      const sqlParams = [
        method, url, status, responseTime, headers, requestParams,
        bodyType, bodyContent, authType, authData,
        responseHeaders, responseBody
      ];
      
      return stmt.run(...sqlParams);
    } catch (error) {
      console.error('Database addHistory error:', error);
      throw error;
    }
  }

  getHistory(limit = 100) {
    const stmt = this.db.prepare('SELECT * FROM history ORDER BY executed_at DESC LIMIT ?');
    const history = stmt.all(limit);
    
    // Parse JSON fields
    return history.map(item => ({
      ...item,
      headers: JSON.parse(item.headers || '[]'),
      params: JSON.parse(item.params || '[]'),
      authData: JSON.parse(item.auth_data || '{}'),
      responseHeaders: JSON.parse(item.response_headers || '{}')
    }));
  }

  clearHistory() {
    const stmt = this.db.prepare('DELETE FROM history');
    return stmt.run();
  }

  // Settings CRUD
  setSetting(key, value) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(key, JSON.stringify(value));
  }

  getSetting(key, defaultValue = null) {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key);
    
    if (result) {
      try {
        return JSON.parse(result.value);
      } catch (e) {
        return result.value;
      }
    }
    
    return defaultValue;
  }

  getAllSettings() {
    const stmt = this.db.prepare('SELECT * FROM settings');
    const settings = stmt.all();
    
    const result = {};
    settings.forEach(setting => {
      try {
        result[setting.key] = JSON.parse(setting.value);
      } catch (e) {
        result[setting.key] = setting.value;
      }
    });
    
    return result;
  }

  // Import/Export methods (supports both Postman v2.1.0 and PostBoy formats)
  async exportCollections(collectionIds = null, format = 'postman') {
    try {
      // If no specific collections specified, export all
      const collections = collectionIds 
        ? this.db.prepare('SELECT * FROM collections WHERE id IN (' + collectionIds.map(() => '?').join(',') + ')').all(...collectionIds)
        : this.db.prepare('SELECT * FROM collections').all();
      
      // Export in the requested format
      if (format === 'postboy') {
        return this.exportPostBoyFormat(collections);
      } else {
        return this.exportPostmanFormat(collections);
      }
    } catch (error) {
      console.error('Export collections failed:', error);
      throw error;
    }
  }
  
  async exportPostBoyFormat(collections) {
    // Simple PostBoy format - more compact and straightforward
    const exportData = {
      version: '1.0',
      format: 'postboy',
      exportedAt: new Date().toISOString(),
      collections: []
    };
    
    for (const collection of collections) {
      const requests = this.db.prepare('SELECT * FROM requests WHERE collection_id = ?').all(collection.id);
      
      // Parse JSON fields in requests
      const parsedRequests = requests.map(req => ({
        name: req.name,
        method: req.method,
        url: req.url,
        headers: JSON.parse(req.headers || '[]'),
        params: JSON.parse(req.params || '[]'),
        bodyType: req.body_type,
        bodyContent: req.body_content,
        authType: req.auth_type,
        authData: JSON.parse(req.auth_data || '{}')
      }));
      
      exportData.collections.push({
        name: collection.name,
        description: collection.description,
        requests: parsedRequests
      });
    }
    
    return exportData;
  }
  
  async exportPostmanFormat(collections) {
    try {
      // If no specific collections specified, export all already done above
      const exportData = {
        info: {
          _postboy_id: require('crypto').randomUUID(),
          name: collections.length === 1 ? collections[0].name : 'PostBoy Collection Export',
          description: collections.length === 1 ? collections[0].description : `Exported ${collections.length} collections from PostBoy`,
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
          _exporter_id: 'postboy'
        },
        item: []
      };
      
      for (const collection of collections) {
        const requests = this.db.prepare('SELECT * FROM requests WHERE collection_id = ?').all(collection.id);
        
        // If multiple collections, create folders
        if (collections.length > 1) {
          const folder = {
            name: collection.name,
            description: collection.description,
            item: []
          };
          
          // Convert requests to Postman format
          for (const req of requests) {
            folder.item.push(this.convertRequestToPostmanFormat(req));
          }
          
          exportData.item.push(folder);
        } else {
          // Single collection - add requests directly
          for (const req of requests) {
            exportData.item.push(this.convertRequestToPostmanFormat(req));
          }
        }
      }
      
      return exportData;
    } catch (error) {
      console.error('Export Postman format failed:', error);
      throw error;
    }
  }
  
  convertRequestToPostmanFormat(req) {
    const headers = JSON.parse(req.headers || '[]');
    const params = JSON.parse(req.params || '[]');
    const authData = JSON.parse(req.auth_data || '{}');
    
    let urlObj;
    try {
      urlObj = new URL(req.url);
    } catch {
      // If URL parsing fails, use raw format
      return {
        name: req.name,
        request: {
          method: req.method,
          header: headers.map(h => ({ key: h.key, value: h.value })),
          url: {
            raw: req.url
          }
        },
        response: []
      };
    }
    
    // Build query parameters
    const query = [];
    // Add params from URL
    urlObj.searchParams.forEach((value, key) => {
      query.push({ key, value });
    });
    // Add stored params
    params.forEach(p => {
      if (!query.find(q => q.key === p.key)) {
        query.push({ key: p.key, value: p.value });
      }
    });
    
    const requestObj = {
      name: req.name,
      request: {
        method: req.method,
        header: headers.map(h => ({ key: h.key, value: h.value })),
        url: {
          raw: req.url,
          protocol: urlObj.protocol.replace(':', ''),
          host: urlObj.hostname.split('.'),
          port: urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'),
          path: urlObj.pathname.split('/').filter(p => p),
          query: query
        }
      },
      response: []
    };
    
    // Add auth if present
    if (req.auth_type && req.auth_type !== 'none') {
      if (req.auth_type === 'basic') {
        requestObj.request.auth = {
          type: 'basic',
          basic: [
            { key: 'username', value: authData.username || '', type: 'string' },
            { key: 'password', value: authData.password || '', type: 'string' }
          ]
        };
      } else if (req.auth_type === 'bearer') {
        requestObj.request.auth = {
          type: 'bearer',
          bearer: [
            { key: 'token', value: authData.token || '', type: 'string' }
          ]
        };
      } else if (req.auth_type === 'apikey') {
        requestObj.request.auth = {
          type: 'apikey',
          apikey: [
            { key: 'key', value: authData.key || '', type: 'string' },
            { key: 'value', value: authData.value || '', type: 'string' },
            { key: 'in', value: authData.in || 'header', type: 'string' }
          ]
        };
      }
    } else {
      requestObj.request.auth = { type: 'noauth' };
    }
    
    // Add body if present
    if (req.body_content && req.body_type !== 'none') {
      if (req.body_type === 'json' || req.body_type === 'xml' || req.body_type === 'text') {
        requestObj.request.body = {
          mode: 'raw',
          raw: req.body_content,
          options: {
            raw: {
              language: req.body_type
            }
          }
        };
      } else if (req.body_type === 'form-urlencoded') {
        // Parse URL encoded data
        const formData = [];
        const params = new URLSearchParams(req.body_content);
        params.forEach((value, key) => {
          formData.push({ key, value, type: 'text' });
        });
        requestObj.request.body = {
          mode: 'urlencoded',
          urlencoded: formData
        };
      } else if (req.body_type === 'form-data') {
        // For form-data, we'd need to parse it properly
        // For now, store as raw
        requestObj.request.body = {
          mode: 'formdata',
          formdata: []
        };
      }
    }
    
    return requestObj;
  }
  
  async importCollections(importData, overwrite = false) {
    try {
      const isPostmanFormat = importData.info && importData.item;
      
      if (!isPostmanFormat && !importData.collections) {
        throw new Error('Invalid import data format. Expected Postman v2.1.0 format or PostBoy format.');
      }
      
      // No need for results object here since we're just delegating to other methods
      if (isPostmanFormat) {
        // Handle Postman format import
        return this.importPostmanCollection(importData, overwrite);
      } else {
        // Handle legacy PostBoy format (backward compatibility)
        return this.importLegacyFormat(importData, overwrite);
      }
    } catch (error) {
      console.error('Import collections failed:', error);
      throw error;
    }
  }
  
  async importPostmanCollection(postmanData, overwrite = false) {
    const results = {
      collectionsImported: 0,
      requestsImported: 0,
      errors: []
    };
    
    try {
      // Replace _postman_id with _postboy_id if present
      if (postmanData.info._postman_id) {
        postmanData.info._postboy_id = postmanData.info._postman_id;
        delete postmanData.info._postman_id;
      }
      
      const collectionName = postmanData.info.name || 'Imported Collection';
      const collectionDescription = postmanData.info.description || '';
      
      // Process items (can be folders or requests)
      const folders = [];
      const rootRequests = [];
      
      postmanData.item.forEach(item => {
        if (item.item) {
          // It's a folder
          folders.push(item);
        } else if (item.request) {
          // It's a request
          rootRequests.push(item);
        }
      });
      
      // If we have folders, create a collection for each folder
      // If we only have requests, create a single collection
      if (folders.length > 0) {
        for (const folder of folders) {
          const collectionId = await this.createOrUpdateCollection(
            folder.name || collectionName,
            folder.description || collectionDescription,
            overwrite
          );
          
          if (collectionId) {
            results.collectionsImported++;
            
            // Import requests in this folder
            if (folder.item && Array.isArray(folder.item)) {
              for (const item of folder.item) {
                if (item.request) {
                  const imported = await this.importPostmanRequest(collectionId, item);
                  if (imported) {
                    results.requestsImported++;
                  } else {
                    results.errors.push(`Failed to import request "${item.name}"`);
                  }
                }
              }
            }
          }
        }
      }
      
      // Import root-level requests (or all requests if no folders)
      if (rootRequests.length > 0 || (folders.length === 0 && postmanData.item.length > 0)) {
        const collectionId = await this.createOrUpdateCollection(
          collectionName,
          collectionDescription,
          overwrite
        );
        
        if (collectionId) {
          results.collectionsImported++;
          
          const itemsToImport = rootRequests.length > 0 ? rootRequests : postmanData.item;
          for (const item of itemsToImport) {
            if (item.request) {
              const imported = await this.importPostmanRequest(collectionId, item);
              if (imported) {
                results.requestsImported++;
              } else {
                results.errors.push(`Failed to import request "${item.name}"`);
              }
            }
          }
        }
      }
      
      return results;
    } catch (error) {
      results.errors.push(`Import error: ${error.message}`);
      return results;
    }
  }
  
  async createOrUpdateCollection(name, description, overwrite) {
    try {
      const existingCollection = this.db.prepare('SELECT * FROM collections WHERE name = ?').get(name);
      
      let collectionId;
      if (existingCollection) {
        if (overwrite) {
          // Delete existing requests first
          this.db.prepare('DELETE FROM requests WHERE collection_id = ?').run(existingCollection.id);
          collectionId = existingCollection.id;
          
          // Update collection description
          this.db.prepare('UPDATE collections SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(description || '', collectionId);
        } else {
          // Create new collection with modified name
          const newName = `${name} (Imported ${new Date().toLocaleDateString()})`;
          const result = this.db.prepare('INSERT INTO collections (name, description) VALUES (?, ?)')
            .run(newName, description || '');
          collectionId = result.lastInsertRowid;
        }
      } else {
        // Create new collection
        const result = this.db.prepare('INSERT INTO collections (name, description) VALUES (?, ?)')
          .run(name, description || '');
        collectionId = result.lastInsertRowid;
      }
      
      return collectionId;
    } catch (error) {
      console.error('Failed to create/update collection:', error);
      return null;
    }
  }
  
  async importPostmanRequest(collectionId, postmanRequest) {
    try {
      const request = postmanRequest.request;
      const name = postmanRequest.name || 'Unnamed Request';
      const method = request.method || 'GET';
      
      // Build URL from Postman format
      let url = '';
      if (typeof request.url === 'string') {
        url = request.url;
      } else if (request.url) {
        if (request.url.raw) {
          url = request.url.raw;
        } else {
          // Build URL from components
          const protocol = request.url.protocol || 'http';
          const host = Array.isArray(request.url.host) ? request.url.host.join('.') : (request.url.host || 'localhost');
          const port = request.url.port ? `:${request.url.port}` : '';
          const path = Array.isArray(request.url.path) ? '/' + request.url.path.join('/') : '';
          const query = request.url.query && request.url.query.length > 0
            ? '?' + request.url.query.map(q => `${q.key}=${q.value}`).join('&')
            : '';
          url = `${protocol}://${host}${port}${path}${query}`;
        }
      }
      
      // Convert headers
      const headers = [];
      if (request.header && Array.isArray(request.header)) {
        request.header.forEach(h => {
          if (h.key) {
            headers.push({ key: h.key, value: h.value || '' });
          }
        });
      }
      
      // Extract query params
      const params = [];
      if (request.url && request.url.query && Array.isArray(request.url.query)) {
        request.url.query.forEach(q => {
          if (q.key) {
            params.push({ key: q.key, value: q.value || '' });
          }
        });
      }
      
      // Convert auth
      let authType = 'none';
      let authData = {};
      if (request.auth) {
        if (request.auth.type === 'basic' && request.auth.basic) {
          authType = 'basic';
          const username = request.auth.basic.find(item => item.key === 'username');
          const password = request.auth.basic.find(item => item.key === 'password');
          authData = {
            username: username ? username.value : '',
            password: password ? password.value : ''
          };
        } else if (request.auth.type === 'bearer' && request.auth.bearer) {
          authType = 'bearer';
          const token = request.auth.bearer.find(item => item.key === 'token');
          authData = {
            token: token ? token.value : ''
          };
        } else if (request.auth.type === 'apikey' && request.auth.apikey) {
          authType = 'apikey';
          const key = request.auth.apikey.find(item => item.key === 'key');
          const value = request.auth.apikey.find(item => item.key === 'value');
          const inLocation = request.auth.apikey.find(item => item.key === 'in');
          authData = {
            key: key ? key.value : '',
            value: value ? value.value : '',
            in: inLocation ? inLocation.value : 'header'
          };
        }
      }
      
      // Convert body
      let bodyType = 'none';
      let bodyContent = '';
      if (request.body) {
        if (request.body.mode === 'raw') {
          bodyContent = request.body.raw || '';
          if (request.body.options && request.body.options.raw && request.body.options.raw.language) {
            bodyType = request.body.options.raw.language;
          } else {
            bodyType = 'json'; // Default to JSON for raw
          }
        } else if (request.body.mode === 'urlencoded' && request.body.urlencoded) {
          bodyType = 'form-urlencoded';
          const formParams = request.body.urlencoded.map(item => 
            `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value || '')}`
          );
          bodyContent = formParams.join('&');
        } else if (request.body.mode === 'formdata') {
          bodyType = 'form-data';
          // Store form data as JSON for now
          bodyContent = JSON.stringify(request.body.formdata || []);
        }
      }
      
      // Insert request into database
      this.db.prepare(`
        INSERT INTO requests (
          collection_id, name, method, url, headers, params, 
          body_type, body_content, auth_type, auth_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        collectionId,
        name,
        method,
        url,
        JSON.stringify(headers),
        JSON.stringify(params),
        bodyType,
        bodyContent,
        authType,
        JSON.stringify(authData)
      );
      
      return true;
    } catch (error) {
      console.error('Failed to import Postman request:', error);
      return false;
    }
  }
  
  async importLegacyFormat(importData, overwrite) {
    // Keep backward compatibility with old format
    const results = {
      collectionsImported: 0,
      requestsImported: 0,
      errors: []
    };
    
    for (const collectionData of importData.collections) {
      try {
        const collectionId = await this.createOrUpdateCollection(
          collectionData.name,
          collectionData.description,
          overwrite
        );
        
        if (collectionId) {
          results.collectionsImported++;
          
          // Import requests
          if (collectionData.requests && Array.isArray(collectionData.requests)) {
            for (const requestData of collectionData.requests) {
              try {
                this.db.prepare(`
                  INSERT INTO requests (
                    collection_id, name, method, url, headers, params, 
                    body_type, body_content, auth_type, auth_data
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                  collectionId,
                  requestData.name || 'Unnamed Request',
                  requestData.method || 'GET',
                  requestData.url || '',
                  JSON.stringify(requestData.headers || []),
                  JSON.stringify(requestData.params || []),
                  requestData.bodyType || requestData.body_type || 'json',
                  requestData.bodyContent || requestData.body_content || '',
                  requestData.authType || requestData.auth_type || 'none',
                  JSON.stringify(requestData.authData || requestData.auth_data || {})
                );
                
                results.requestsImported++;
              } catch (error) {
                results.errors.push(`Failed to import request "${requestData.name}": ${error.message}`);
              }
            }
          }
        }
      } catch (error) {
        results.errors.push(`Failed to import collection "${collectionData.name}": ${error.message}`);
      }
    }
    
    return results;
  }

  // Utility methods
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  backup(backupPath) {
    if (!this.db) return false;
    
    try {
      this.db.backup(backupPath);
      return true;
    } catch (error) {
      console.error('Backup failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const dbManager = new DatabaseManager();
module.exports = dbManager;
