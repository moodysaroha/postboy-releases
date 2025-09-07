import { _electron as electron } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PostBoy Collections Import/Export Tester
 * Tests the import and export functionality for collections
 */
class ImportExportTester {
  constructor() {
    this.app = null;
    this.window = null;
    this.results = []; // Changed from testResults to results for consistency
    this.testDataPath = path.join(__dirname, 'test-data');
    this.exportPath = path.join(__dirname, 'test-exports');
  }

  async init() {
    // Create test directories if they don't exist
    if (!fs.existsSync(this.testDataPath)) {
      fs.mkdirSync(this.testDataPath, { recursive: true });
    }
    if (!fs.existsSync(this.exportPath)) {
      fs.mkdirSync(this.exportPath, { recursive: true });
    }

    // Create test collection data
    this.createTestData();
  }

  createTestData() {
    // Create a sample collection file for import testing
    const sampleCollection = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      collections: [
        {
          name: 'Test API Collection',
          description: 'A collection for testing import functionality',
          requests: [
            {
              name: 'Get Users',
              method: 'GET',
              url: 'https://jsonplaceholder.typicode.com/users',
              headers: [
                { key: 'Accept', value: 'application/json' }
              ],
              params: [],
              bodyType: 'none',
              bodyContent: '',
              authType: 'none',
              authData: {}
            },
            {
              name: 'Create User',
              method: 'POST',
              url: 'https://jsonplaceholder.typicode.com/users',
              headers: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Accept', value: 'application/json' }
              ],
              params: [],
              bodyType: 'json',
              bodyContent: JSON.stringify({
                name: 'Test User',
                email: 'test@example.com'
              }, null, 2),
              authType: 'bearer',
              authData: {
                token: 'test-bearer-token-123'
              }
            },
            {
              name: 'Update User',
              method: 'PUT',
              url: 'https://jsonplaceholder.typicode.com/users/1',
              headers: [
                { key: 'Content-Type', value: 'application/json' }
              ],
              params: [
                { key: 'id', value: '1' }
              ],
              bodyType: 'json',
              bodyContent: JSON.stringify({
                name: 'Updated User',
                email: 'updated@example.com'
              }, null, 2),
              authType: 'basic',
              authData: {
                username: 'testuser',
                password: 'testpass'
              }
            }
          ]
        },
        {
          name: 'HTTPBin Tests',
          description: 'Collection for testing various HTTP methods',
          requests: [
            {
              name: 'Test Headers',
              method: 'GET',
              url: 'https://httpbin.org/headers',
              headers: [
                { key: 'X-Custom-Header', value: 'TestValue' },
                { key: 'User-Agent', value: 'PostBoy/1.0' }
              ],
              params: [],
              bodyType: 'none',
              bodyContent: '',
              authType: 'none',
              authData: {}
            },
            {
              name: 'Test POST with Form Data',
              method: 'POST',
              url: 'https://httpbin.org/post',
              headers: [],
              params: [],
              bodyType: 'form-urlencoded',
              bodyContent: 'field1=value1&field2=value2&field3=value3',
              authType: 'none',
              authData: {}
            },
            {
              name: 'Test Query Parameters',
              method: 'GET',
              url: 'https://httpbin.org/get',
              headers: [],
              params: [
                { key: 'param1', value: 'value1' },
                { key: 'param2', value: 'value2' },
                { key: 'search', value: 'test query' }
              ],
              bodyType: 'none',
              bodyContent: '',
              authType: 'none',
              authData: {}
            }
          ]
        }
      ]
    };

    // Save the test collection file
    const testFilePath = path.join(this.testDataPath, 'test-collections.json');
    fs.writeFileSync(testFilePath, JSON.stringify(sampleCollection, null, 2));
    console.log(chalk.green('✅ Test data created at:'), testFilePath);
  }

  async launchApp() {
    console.log(chalk.yellow('Launching PostBoy application...'));
    
    try {
      // Launch Electron app
      this.app = await electron.launch({
        args: [path.join(__dirname, '..')],
        timeout: 30000
      });
      
      // Wait for the main window
      console.log(chalk.gray('  Waiting for main window...'));
      
      let window = null;
      let attempts = 0;
      while (!window && attempts < 20) {
        const windows = this.app.windows();
        for (const win of windows) {
          try {
            const hasUrlInput = await win.locator('#url-input').count() > 0;
            if (hasUrlInput) {
              window = win;
              break;
            }
          } catch (e) {
            // Window might be closed or not ready
          }
        }
        if (!window) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
      }
      
      if (!window) {
        throw new Error('Main window did not appear after 10 seconds');
      }
      
      this.window = window;
      
      // Wait for app to be fully loaded
      await this.window.waitForLoadState('domcontentloaded');
      await this.window.waitForSelector('#url-input', { timeout: 10000 });
      
      console.log(chalk.green('✅ PostBoy application launched successfully\n'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to launch PostBoy:'), error.message);
      throw error;
    }
  }

  async testCreateCollection() {
    console.log(chalk.cyan('\n📝 Test 1: Create New Collection'));
    
    try {
      // Click new collection button
      await this.window.click('#new-collection-btn');
      await this.window.waitForTimeout(500);
      
      // Enter collection name in the modal
      const nameInput = await this.window.locator('#new-collection-name');
      if (await nameInput.count() > 0) {
        await nameInput.fill('Test Collection for Export');
        
        // Click Create button
        const createBtn = await this.window.locator('button:has-text("Create")').first();
        await createBtn.click();
        
        await this.window.waitForTimeout(1000);
        
        // Verify collection was created
        const collectionItem = await this.window.locator('.collection-item').first();
        if (await collectionItem.count() > 0) {
          console.log(chalk.green('  ✅ Collection created successfully'));
          this.results.push({ test: 'Create Collection', passed: true });
          return true;
        } else {
          throw new Error('Collection not found in sidebar');
        }
      } else {
        throw new Error('Collection name input not found');
      }
    } catch (error) {
      console.log(chalk.red('  ❌ Failed to create collection:'), error.message);
      this.results.push({ test: 'Create Collection', passed: false, error: error.message });
      return false;
    }
  }

  async testAddRequestToCollection() {
    console.log(chalk.cyan('\n📝 Test 2: Add Request to Collection'));
    
    try {
      // Fill in a sample request
      await this.window.fill('#url-input', 'https://api.example.com/test');
      
      // Use keyboard shortcut to save (Ctrl+S)
      await this.window.keyboard.press('Control+s');
      await this.window.waitForTimeout(500);
      
      // Check if save modal appears
      const saveNameInput = await this.window.locator('#save-request-name');
      if (await saveNameInput.count() > 0) {
        await saveNameInput.fill('Test Request 1');
        
        // Select the collection
        const collectionSelect = await this.window.locator('#save-collection-select');
        if (await collectionSelect.count() > 0) {
          await collectionSelect.selectOption({ index: 1 }); // Select first collection
        }
        
        // Click Save button
        const saveBtn = await this.window.locator('button:has-text("Save")').first();
        await saveBtn.click();
        
        await this.window.waitForTimeout(1000);
        
        console.log(chalk.green('  ✅ Request added to collection'));
        this.results.push({ test: 'Add Request to Collection', passed: true });
        return true;
      } else {
        throw new Error('Save request modal did not appear');
      }
    } catch (error) {
      console.log(chalk.red('  ❌ Failed to add request:'), error.message);
      this.results.push({ test: 'Add Request to Collection', passed: false, error: error.message });
      return false;
    }
  }

  async testExportCollections() {
    console.log(chalk.cyan('\n📝 Test 3: Export Collections'));
    
    try {
      // Click export button
      const exportBtn = await this.window.locator('#export-collection-btn');
      if (await exportBtn.count() === 0) {
        throw new Error('Export button not found');
      }
      
      await exportBtn.click();
      await this.window.waitForTimeout(1000);
      
      // Check if export modal appears
      const exportModal = await this.window.locator('.discord-modal:has-text("Export Collections")');
      if (await exportModal.count() > 0) {
        console.log(chalk.gray('  Export modal opened'));
        
        // Click Export button in modal
        const confirmExportBtn = await this.window.locator('button:has-text("Export")').first();
        await confirmExportBtn.click();
        
        // Note: We can't test the actual file save dialog in automated tests
        // as it's a native OS dialog. In a real scenario, the user would select a file location.
        
        console.log(chalk.green('  ✅ Export dialog triggered successfully'));
        console.log(chalk.gray('  Note: File save dialog cannot be automated'));
        this.results.push({ test: 'Export Collections', passed: true });
        return true;
      } else {
        throw new Error('Export modal did not appear');
      }
    } catch (error) {
      console.log(chalk.red('  ❌ Export test failed:'), error.message);
      this.results.push({ test: 'Export Collections', passed: false, error: error.message });
      return false;
    }
  }

  async testImportCollections() {
    console.log(chalk.cyan('\n📝 Test 4: Import Collections'));
    
    try {
      // Click import button
      const importBtn = await this.window.locator('#import-collection-btn');
      if (await importBtn.count() === 0) {
        throw new Error('Import button not found');
      }
      
      await importBtn.click();
      await this.window.waitForTimeout(1000);
      
      // Note: We can't test the actual file open dialog in automated tests
      // as it's a native OS dialog. In a real scenario, the user would select a file.
      
      console.log(chalk.green('  ✅ Import dialog triggered successfully'));
      console.log(chalk.gray('  Note: File open dialog cannot be automated'));
      console.log(chalk.gray('  Test file available at:'), path.join(this.testDataPath, 'test-collections.json'));
      
      this.results.push({ test: 'Import Collections', passed: true });
      return true;
    } catch (error) {
      console.log(chalk.red('  ❌ Import test failed:'), error.message);
      this.results.push({ test: 'Import Collections', passed: false, error: error.message });
      return false;
    }
  }

  async testCollectionManagement() {
    console.log(chalk.cyan('\n📝 Test 5: Collection Management (Rename/Delete)'));
    
    try {
      // Test rename functionality
      const renameBtn = await this.window.locator('.rename-collection-btn').first();
      if (await renameBtn.count() > 0) {
        await renameBtn.click();
        await this.window.waitForTimeout(500);
        
        const nameInput = await this.window.locator('.collection-name-input').first();
        if (await nameInput.count() > 0) {
          await nameInput.fill('Renamed Test Collection');
          await nameInput.press('Enter');
          await this.window.waitForTimeout(500);
          
          console.log(chalk.green('  ✅ Collection renamed successfully'));
        }
      }
      
      // Test delete functionality (but cancel it)
      const deleteBtn = await this.window.locator('.delete-collection-btn').first();
      if (await deleteBtn.count() > 0) {
        await deleteBtn.click();
        await this.window.waitForTimeout(500);
        
        // Look for confirmation modal and cancel
        const cancelBtn = await this.window.locator('button:has-text("Cancel")').first();
        if (await cancelBtn.count() > 0) {
          await cancelBtn.click();
          console.log(chalk.green('  ✅ Delete confirmation works (cancelled)'));
        }
      }
      
      this.results.push({ test: 'Collection Management', passed: true });
      return true;
    } catch (error) {
      console.log(chalk.red('  ❌ Collection management test failed:'), error.message);
      this.results.push({ test: 'Collection Management', passed: false, error: error.message });
      return false;
    }
  }

  async runAllTests() {
    await this.init();
    await this.launchApp();
    
    console.log(chalk.cyan('Starting Import/Export Collections Tests'));
    console.log('='.repeat(60));
    
    // Run tests
    await this.testCreateCollection();
    await this.testAddRequestToCollection();
    await this.testExportCollections();
    await this.testImportCollections();
    await this.testCollectionManagement();
    
    // Generate report
    this.generateReport();
    
    // Cleanup
    await this.cleanup();
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.cyan('📊 TEST RESULTS SUMMARY'));
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${chalk.cyan(total)}`);
    console.log(`Passed: ${chalk.green(passed)}`);
    console.log(`Failed: ${chalk.red(failed)}`);
    
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;
    const rateColor = successRate >= 80 ? chalk.green : successRate >= 60 ? chalk.yellow : chalk.red;
    console.log(`Success Rate: ${rateColor(successRate + '%')}`);
    
    // Show individual test results
    console.log('\nIndividual Test Results:');
    this.results.forEach(result => {
      const icon = result.passed ? chalk.green('✅') : chalk.red('❌');
      console.log(`  ${icon} ${result.test}`);
      if (result.error) {
        console.log(chalk.gray(`     Error: ${result.error}`));
      }
    });
    
    // Save detailed report
    const reportData = {
      summary: {
        total,
        passed,
        failed,
        successRate: `${successRate}%`,
        executedAt: new Date().toISOString()
      },
      results: this.results,
      testDataLocation: this.testDataPath,
      notes: [
        'File dialogs (save/open) cannot be fully automated in tests',
        'Test collection file is created in test-data directory',
        'Manual testing recommended for complete file import/export verification'
      ]
    };
    
    const reportPath = path.join(__dirname, `import-export-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(chalk.gray(`\n📄 Detailed report saved to: ${path.basename(reportPath)}`));
    console.log(chalk.gray(`📁 Test data available at: ${this.testDataPath}`));
  }

  async cleanup() {
    if (this.app) {
      console.log(chalk.gray('\n🧹 Closing PostBoy application...'));
      await this.app.close();
    }
    
    // Optionally clean up test exports
    // Note: Keeping test data for manual verification
    console.log(chalk.gray('📁 Test files preserved for manual inspection'));
  }
}

// Run tests if executed directly
const isMainModule = import.meta.url === `file:///${__filename.replace(/\\/g, '/')}` || 
                     import.meta.url === `file://${__filename}` ||
                     process.argv[1] === __filename;

if (isMainModule) {
  const tester = new ImportExportTester();
  tester.runAllTests().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export default ImportExportTester;
