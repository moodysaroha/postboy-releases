import { _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PostBoy UI Component Tester
 * Tests all UI components: dropdowns, tabs, shortcuts, collections, etc.
 */
class UIComponentTester {
  constructor() {
    this.app = null;
    this.window = null;
    this.results = [];
    this.startTime = Date.now();
  }

  async launchApp() {
    console.log(chalk.yellow('Launching PostBoy for UI testing...'));
    
    try {
      this.app = await electron.launch({
        args: [path.join(__dirname, '..')],
        timeout: 30000
      });
      
      // Wait for the main window (not the loading window)
      console.log(chalk.gray('  Waiting for main window...'));
      
      let window = null;
      let attempts = 0;
      while (!window && attempts < 60) {
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
        throw new Error('Main window did not appear after 30 seconds');
      }
      
      this.window = window;
      // Set default timeout for all operations to 5 seconds
      this.window.setDefaultTimeout(5000);
      await this.window.waitForLoadState('domcontentloaded');
      await this.window.waitForSelector('#url-input', { timeout: 10000 });
      
      console.log(chalk.green('✅ PostBoy launched successfully\n'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to launch PostBoy:'), error.message);
      process.exit(1);
    }
  }

  async test(name, testFn) {
    const testStart = Date.now();
    console.log(`  Testing: ${name}`);
    
    try {
      await testFn();
      const result = {
        name,
        passed: true,
        duration: Date.now() - testStart
      };
      this.results.push(result);
      console.log(chalk.green(`    ✅ Passed`));
      return result;
    } catch (error) {
      const result = {
        name,
        passed: false,
        error: error.message,
        duration: Date.now() - testStart
      };
      this.results.push(result);
      console.log(chalk.red(`    ❌ Failed: ${error.message}`));
      return result;
    }
  }

  async testMethodDropdown() {
    console.log(chalk.yellow('\n📋 Testing Method Dropdown'));
    
    await this.test('Method dropdown opens', async () => {
      await this.window.click('#method-dropdown');
      await this.window.waitForSelector('.dropdown-options', { state: 'visible' });
    });

    await this.test('Select POST method', async () => {
      await this.window.click('.dropdown-option[data-value="POST"]');
      const selectedText = await this.window.textContent('#method-dropdown .dropdown-text');
      if (selectedText !== 'POST') throw new Error(`Expected POST, got ${selectedText}`);
    });

    await this.test('Select PUT method', async () => {
      await this.window.click('#method-dropdown');
      await this.window.click('.dropdown-option[data-value="PUT"]');
      const selectedText = await this.window.textContent('#method-dropdown .dropdown-text');
      if (selectedText !== 'PUT') throw new Error(`Expected PUT, got ${selectedText}`);
    });

    await this.test('Select DELETE method', async () => {
      await this.window.click('#method-dropdown');
      await this.window.click('.dropdown-option[data-value="DELETE"]');
      const selectedText = await this.window.textContent('#method-dropdown .dropdown-text');
      if (selectedText !== 'DELETE') throw new Error(`Expected DELETE, got ${selectedText}`);
    });
  }

  async testRequestTabs() {
    console.log(chalk.yellow('\n📑 Testing Request Tabs'));
    
    await this.test('Switch to Body tab', async () => {
      await this.window.click('.tab-btn[data-tab="body"]');
      const isActive = await this.window.evaluate(() => {
        return document.querySelector('.tab-btn[data-tab="body"]').classList.contains('active');
      });
      if (!isActive) throw new Error('Body tab not active');
    });

    await this.test('Switch to Headers tab', async () => {
      await this.window.click('.tab-btn[data-tab="headers"]');
      const isActive = await this.window.evaluate(() => {
        return document.querySelector('.tab-btn[data-tab="headers"]').classList.contains('active');
      });
      if (!isActive) throw new Error('Headers tab not active');
    });

    await this.test('Switch to Auth tab', async () => {
      await this.window.click('.tab-btn[data-tab="auth"]');
      const isActive = await this.window.evaluate(() => {
        return document.querySelector('.tab-btn[data-tab="auth"]').classList.contains('active');
      });
      if (!isActive) throw new Error('Auth tab not active');
    });

    await this.test('Switch to Params tab', async () => {
      await this.window.click('.tab-btn[data-tab="params"]');
      const isActive = await this.window.evaluate(() => {
        return document.querySelector('.tab-btn[data-tab="params"]').classList.contains('active');
      });
      if (!isActive) throw new Error('Params tab not active');
    });
  }

  async testBodyTypes() {
    console.log(chalk.yellow('\n📝 Testing Body Type Dropdown'));
    
    // First switch to body tab
    await this.window.click('.tab-btn[data-tab="body"]');
    
    await this.test('Body type dropdown opens', async () => {
      await this.window.click('#body-type-dropdown');
      await this.window.waitForSelector('#body-type-dropdown .dropdown-options', { state: 'visible' });
    });

    await this.test('Select JSON body type', async () => {
      await this.window.click('.dropdown-option[data-value="json"]');
      await this.window.waitForSelector('#body-json.active');
    });

    await this.test('Select XML body type', async () => {
      await this.window.click('#body-type-dropdown');
      await this.window.click('.dropdown-option[data-value="xml"]');
      await this.window.waitForSelector('#body-xml.active');
    });

    await this.test('Select Form Data body type', async () => {
      await this.window.click('#body-type-dropdown');
      await this.window.click('.dropdown-option[data-value="form-data"]');
      await this.window.waitForSelector('#body-form-data.active');
    });

    await this.test('Select GraphQL body type', async () => {
      await this.window.click('#body-type-dropdown');
      await this.window.click('.dropdown-option[data-value="graphql"]');
      await this.window.waitForSelector('#body-graphql.active');
    });
  }

  async testCollections() {
    console.log(chalk.yellow('\n📚 Testing Collections'));
    
    await this.test('Create new collection', async () => {
      await this.window.click('#new-collection-btn');
      
      // Wait for the modal to appear - using correct modal selector
      await this.window.waitForSelector('.discord-modal', { state: 'visible', timeout: 5000 });
      
      // Wait for the input field to be available
      await this.window.waitForSelector('#new-collection-name', { timeout: 3000 });
      
      // Fill in the collection name
      await this.window.fill('#new-collection-name', 'Test Collection');
      
      // Click the Create button (first button, which is the primary/create button)
      await this.window.click('.modal-btn.create-btn');
      
      // Wait for modal to close
      await this.window.waitForSelector('.discord-modal', { state: 'hidden', timeout: 3000 });
    });

    await this.test('Switch to History tab', async () => {
      await this.window.click('.sidebar-tab-btn[data-tab="history"]');
      const isActive = await this.window.evaluate(() => {
        return document.querySelector('.sidebar-tab-btn[data-tab="history"]').classList.contains('active');
      });
      if (!isActive) throw new Error('History tab not active');
    });

    await this.test('Switch back to Collections tab', async () => {
      await this.window.click('.sidebar-tab-btn[data-tab="collections"]');
      const isActive = await this.window.evaluate(() => {
        return document.querySelector('.sidebar-tab-btn[data-tab="collections"]').classList.contains('active');
      });
      if (!isActive) throw new Error('Collections tab not active');
    });

    await this.test('Rename collection', async () => {
      // First ensure we have a collection to rename
      const hasCollection = await this.window.isVisible('.collection-item').catch(() => false);
      if (!hasCollection) {
        // Create a collection first if none exists
        await this.window.click('#new-collection-btn');
        await this.window.waitForSelector('.discord-modal', { state: 'visible', timeout: 3000 });
        await this.window.fill('#new-collection-name', 'Original Collection');
        await this.window.click('.modal-btn.create-btn');
        await this.window.waitForSelector('.discord-modal', { state: 'hidden', timeout: 3000 });
      }

      // Click the rename button for the first collection
      await this.window.click('.rename-collection-btn');
      await this.window.waitForTimeout(200);
      
      // Check if the input field is visible and focused
      const inputVisible = await this.window.isVisible('.collection-name-input');
      if (!inputVisible) throw new Error('Collection rename input not shown');
      
      // Clear and enter new name
      await this.window.fill('.collection-name-input', 'Renamed Collection');
      await this.window.press('.collection-name-input', 'Enter');
      await this.window.waitForTimeout(1000); // Increased timeout for database operation
      
      // Verify the name was changed
      const newName = await this.window.textContent('.collection-name-text');
      if (!newName.includes('Renamed Collection')) {
        throw new Error('Collection was not renamed');
      }
    });

    await this.test('Save request to collection', async () => {
      // Set up a simple request first
      await this.window.fill('#url-input', 'https://jsonplaceholder.typicode.com/posts/1');
      await this.window.waitForTimeout(200);
      
      // Save the request using keyboard shortcut (Ctrl+S)
      await this.window.keyboard.press('Control+s');
      await this.window.waitForTimeout(500);
      
      // Check if save modal appeared
      const modalVisible = await this.window.isVisible('.discord-modal').catch(() => false);
      if (modalVisible) {
        // Fill in request name
        await this.window.fill('#save-request-name', 'Test Request');
        
        // Select the first collection
        await this.window.selectOption('#save-collection-select', '0');
        
        // Click Save button (looking for the button with text 'Save')
        const saveButton = await this.window.$('button.modal-btn:has-text("Save")');
        if (saveButton) {
          await saveButton.click();
        } else {
          // Fallback to clicking first button
          await this.window.click('.modal-btn');
        }
        await this.window.waitForSelector('.discord-modal', { state: 'hidden', timeout: 3000 });
      }
    });

    await this.test('Save request with new collection creation', async () => {
      // Set up a request
      await this.window.fill('#url-input', 'https://jsonplaceholder.typicode.com/posts/2');
      await this.window.waitForTimeout(200);
      
      // Save the request using keyboard shortcut (Ctrl+S)
      await this.window.keyboard.press('Control+s');
      await this.window.waitForTimeout(500);
      
      // Check if save modal appeared
      const saveModalVisible = await this.window.isVisible('.discord-modal').catch(() => false);
      if (!saveModalVisible) {
        throw new Error('Save modal did not appear');
      }
      
      // Click on "Create New Collection" button
      await this.window.click('#create-new-collection-btn');
      await this.window.waitForTimeout(500);
      
      // The save modal should be closed and collection creation modal should appear
      await this.window.waitForSelector('#new-collection-name', { timeout: 3000 });
      
      // Enter collection name
      const testCollectionName = `Test Collection ${Date.now()}`;
      await this.window.fill('#new-collection-name', testCollectionName);
      
      // Click Create button
      const createButton = await this.window.$('button.modal-btn:has-text("Create")');
      if (createButton) {
        await createButton.click();
      } else {
        await this.window.click('.modal-btn');
      }
      await this.window.waitForTimeout(1000);
      
      // The save modal should reappear with the new collection
      await this.window.waitForSelector('#save-collection-select', { timeout: 3000 });
      
      // Verify the new collection is in the dropdown and is selected
      const selectedOption = await this.window.evaluate((collectionName) => {
        const select = document.getElementById('save-collection-select');
        if (!select) return null;
        
        // Find the option with the collection name
        const options = Array.from(select.options);
        const newOption = options.find(opt => opt.text === collectionName);
        
        return {
          exists: !!newOption,
          isSelected: newOption ? newOption.selected : false,
          value: newOption ? newOption.value : null
        };
      }, testCollectionName);
      
      if (!selectedOption || !selectedOption.exists) {
        throw new Error('Newly created collection not found in dropdown');
      }
      
      if (!selectedOption.isSelected) {
        throw new Error('Newly created collection is not selected');
      }
      
      // Fill in request name and save
      await this.window.fill('#save-request-name', 'Test Request in New Collection');
      
      // Click Save button
      const saveButton = await this.window.$('button.modal-btn:has-text("Save")');
      if (saveButton) {
        await saveButton.click();
      } else {
        await this.window.click('.modal-btn');
      }
      await this.window.waitForSelector('.discord-modal', { state: 'hidden', timeout: 3000 });
      
      // Verify the collection was created and the request was saved
      const collectionExists = await this.window.evaluate((collectionName) => {
        const collectionElements = document.querySelectorAll('.collection-name-text');
        return Array.from(collectionElements).some(el => el.textContent === collectionName);
      }, testCollectionName);
      
      if (!collectionExists) {
        throw new Error('Collection was not created in the collections list');
      }
    });

    await this.test('Rename collection request', async () => {
      // Ensure we have a request to rename
      const hasRequest = await this.window.isVisible('.collection-request').catch(() => false);
      if (!hasRequest) {
        throw new Error('No request found to rename - save request test may have failed');
      }

      // Click the rename button for the first request
      await this.window.click('.rename-request-btn');
      await this.window.waitForTimeout(200);
      
      // Check if the input field is visible
      const inputVisible = await this.window.isVisible('.request-name-input');
      if (!inputVisible) throw new Error('Request rename input not shown');
      
      // Clear and enter new name
      await this.window.fill('.request-name-input', 'Renamed Test Request');
      await this.window.press('.request-name-input', 'Enter');
      await this.window.waitForTimeout(1000); // Increased timeout for database operation
      
      // Verify the name was changed
      const newName = await this.window.textContent('.request-name-text');
      if (!newName.includes('Renamed Test Request')) {
        throw new Error('Request was not renamed');
      }
    });

    await this.test('Delete collection request', async () => {
      // Ensure we have a request to delete
      const hasRequest = await this.window.isVisible('.collection-request').catch(() => false);
      if (!hasRequest) {
        throw new Error('No request found to delete');
      }

      // Get initial request count
      const initialCount = await this.window.$$eval('.collection-request', requests => requests.length);
      
      // Click the delete button for the first request
      await this.window.click('.delete-request-btn');
      await this.window.waitForTimeout(500);
      
      // Handle the themed modal confirmation
      const deleteModal = await this.window.isVisible('.discord-modal').catch(() => false);
      if (deleteModal) {
        // Click Confirm button in the modal
        const confirmButton = await this.window.$('button.modal-btn:has-text("Confirm")');
        if (confirmButton) {
          await confirmButton.click();
        } else {
          // Fallback to clicking the second button (usually Confirm)
          const buttons = await this.window.$$('.modal-btn');
          if (buttons.length > 1) {
            await buttons[1].click();
          }
        }
        await this.window.waitForSelector('.discord-modal', { state: 'hidden', timeout: 3000 });
      }
      await this.window.waitForTimeout(500); // Wait for database operation
      
      // Verify request was deleted
      const newCount = await this.window.$$eval('.collection-request', requests => requests.length);
      if (newCount >= initialCount) {
        throw new Error('Request was not deleted');
      }
    });

    await this.test('Delete collection', async () => {
      // Ensure we have a collection to delete
      const hasCollection = await this.window.isVisible('.collection-item').catch(() => false);
      if (!hasCollection) {
        throw new Error('No collection found to delete');
      }

      // Get initial collection count
      const initialCount = await this.window.$$eval('.collection-item', collections => collections.length);

      // Click the delete button for the first collection
      await this.window.click('.delete-collection-btn');
      await this.window.waitForTimeout(500);
      
      // Handle the themed modal confirmation
      const deleteModal = await this.window.isVisible('.discord-modal').catch(() => false);
      if (deleteModal) {
        // Click Confirm button in the modal
        const confirmButton = await this.window.$('button.modal-btn:has-text("Confirm")');
        if (confirmButton) {
          await confirmButton.click();
        } else {
          // Fallback to clicking the second button (usually Confirm)
          const buttons = await this.window.$$('.modal-btn');
          if (buttons.length > 1) {
            await buttons[1].click();
          }
        }
        await this.window.waitForSelector('.discord-modal', { state: 'hidden', timeout: 3000 });
      }
      await this.window.waitForTimeout(500); // Wait for database operation
      
      // Verify collection was deleted
      const newCount = await this.window.$$eval('.collection-item', collections => collections.length);
      if (newCount >= initialCount) {
        throw new Error('Collection was not deleted');
      }
    });

    // Import/Export UI Tests
    await this.test('Export collections UI - Format selection', async () => {
      // Click export button
      const exportBtn = await this.window.$('#export-collection-btn');
      if (!exportBtn) {
        throw new Error('Export button not found');
      }
      
      await exportBtn.click();
      await this.window.waitForTimeout(500);
      
      // Check if format selection modal appears
      const formatModal = await this.window.isVisible('.discord-modal:has-text("Select Export Format")').catch(() => false);
      if (!formatModal) {
        throw new Error('Format selection modal did not appear');
      }
      
      // Verify both format options are present
      const postmanOption = await this.window.isVisible('input[value="postman"]').catch(() => false);
      const postboyOption = await this.window.isVisible('input[value="postboy"]').catch(() => false);
      
      if (!postmanOption || !postboyOption) {
        throw new Error('Export format options not found');
      }
      
      // Select PostBoy format
      await this.window.click('input[value="postboy"]');
      await this.window.waitForTimeout(200);
      
      // Click Next
      const nextBtn = await this.window.$('button:has-text("Next")');
      if (nextBtn) {
        await nextBtn.click();
      }
      await this.window.waitForTimeout(500);
      
      // Now we should see collection selection modal
      const collectionModal = await this.window.isVisible('.discord-modal:has-text("Export Collections")').catch(() => false);
      if (!collectionModal) {
        throw new Error('Collection selection modal did not appear');
      }
      
      // Cancel the export (don't actually save file)
      const cancelBtn = await this.window.$('button:has-text("Cancel")');
      if (cancelBtn) {
        await cancelBtn.click();
      }
      await this.window.waitForSelector('.discord-modal', { state: 'hidden', timeout: 3000 });
    });

    await this.test('Import collections UI - Button exists', async () => {
      // Just verify the import button exists and is clickable
      // Don't actually click it to avoid opening the file dialog
      const importBtn = await this.window.$('#import-collection-btn');
      if (!importBtn) {
        throw new Error('Import button not found');
      }
      
      // Check if button is visible and enabled
      const isVisible = await importBtn.isVisible();
      const isEnabled = await importBtn.isEnabled();
      
      if (!isVisible) {
        throw new Error('Import button is not visible');
      }
      
      if (!isEnabled) {
        throw new Error('Import button is not enabled');
      }
      
      console.log('Import button verified - visible and enabled');
      
      // We could also test hover state or other UI properties without clicking
      await importBtn.hover();
      await this.window.waitForTimeout(200);
      
      // Verify the button has the correct title/tooltip
      const title = await importBtn.getAttribute('title');
      if (title && !title.toLowerCase().includes('import')) {
        throw new Error('Import button has incorrect title attribute');
      }
    });

    await this.test('Export with no collections - Warning', async () => {
      // First ensure no collections exist
      const collections = await this.window.$$('.collection-item');
      
      // Only run this test if there are no collections
      if (collections.length === 0) {
        // Click export button
        const exportBtn = await this.window.$('#export-collection-btn');
        if (exportBtn) {
          await exportBtn.click();
          await this.window.waitForTimeout(500);
          
          // Should see warning modal
          const warningModal = await this.window.isVisible('.discord-modal:has-text("No Collections")').catch(() => false);
          if (!warningModal) {
            throw new Error('Warning modal for no collections did not appear');
          }
          
          // Close the warning
          const okBtn = await this.window.$('button:has-text("OK")');
          if (okBtn) {
            await okBtn.click();
          }
          await this.window.waitForSelector('.discord-modal', { state: 'hidden', timeout: 3000 });
        }
      } else {
        console.log('Skipping no-collections test as collections exist');
      }
    });

    await this.test('Cleanup - Delete all test collections', async () => {
      // Switch to Collections tab to ensure we can see all collections
      await this.window.click('.sidebar-tab-btn[data-tab="collections"]');
      await this.window.waitForTimeout(500);
      
      // Get all collections that were created during testing
      const testCollections = await this.window.$$eval('.collection-name-text', elements => 
        elements.map(el => ({
          text: el.textContent,
          id: el.getAttribute('data-collection-id')
        })).filter(col => 
          col.text.includes('Test Collection') || 
          col.text.includes('Test API Collection') ||
          col.text.includes('Renamed Collection') ||
          col.text.includes('SOV_Identifier_Collection')  // Also clean up imported SOV collection
        )
      );
      
      console.log(`Found ${testCollections.length} test collections to clean up`);
      
      // Delete each test collection
      for (const collection of testCollections) {
        try {          
          // Find and click the delete button for this collection
          const deleteButton = await this.window.$(`.collection-item[data-collection-id="${collection.id}"] .delete-collection-btn`);
          if (deleteButton) {
            await deleteButton.click();
            await this.window.waitForTimeout(300);
            
            // Handle the confirmation modal
            const deleteModal = await this.window.isVisible('.discord-modal').catch(() => false);
            if (deleteModal) {
              // Click Confirm button
              const confirmButton = await this.window.$('button.modal-btn:has-text("Confirm")');
              if (confirmButton) {
                await confirmButton.click();
              } else {
                const buttons = await this.window.$$('.modal-btn');
                if (buttons.length > 1) {
                  await buttons[1].click();
                }
              }
              await this.window.waitForSelector('.discord-modal', { state: 'hidden', timeout: 3000 });
              await this.window.waitForTimeout(300);
            }
          }
        } catch (error) {
          console.log(`Failed to delete collection "${collection.text}":`, error.message);
        }
      }
      
      // Verify all test collections are deleted
      const remainingCollections = await this.window.$$eval('.collection-name-text', elements => 
        elements.filter(el => 
          el.textContent.includes('Test Collection') || 
          el.textContent.includes('Test API Collection') ||
          el.textContent.includes('Renamed Collection')
        ).length
      );
      
      if (remainingCollections > 0) {
        console.log(chalk.yellow(`Warning: ${remainingCollections} test collections could not be deleted`));
      } else {
        console.log(chalk.green('All test collections cleaned up successfully'));
      }
    });
  }

  async testKeyboardShortcuts() {
    console.log(chalk.yellow('\n⌨️ Testing Keyboard Shortcuts'));
    
    await this.test('Ctrl+I focuses URL input', async () => {
      // First click somewhere else
      await this.window.click('.app-header');
      
      // Press Ctrl+I
      await this.window.keyboard.press('Control+i');
      await this.window.waitForTimeout(200);
      
      // Check if URL input is focused
      const isFocused = await this.window.evaluate(() => {
        return document.activeElement.id === 'url-input';
      });
      if (!isFocused) throw new Error('URL input not focused');
    });

    await this.test('Ctrl+B switches to Body tab', async () => {
      await this.window.keyboard.press('Control+b');
      await this.window.waitForTimeout(200);
      
      const isActive = await this.window.evaluate(() => {
        return document.querySelector('.tab-btn[data-tab="body"]').classList.contains('active');
      });
      if (!isActive) throw new Error('Body tab not active');
    });

    await this.test('Ctrl+H switches to Headers tab', async () => {
      await this.window.keyboard.press('Control+h');
      await this.window.waitForTimeout(200);
      
      const isActive = await this.window.evaluate(() => {
        return document.querySelector('.tab-btn[data-tab="headers"]').classList.contains('active');
      });
      if (!isActive) throw new Error('Headers tab not active');
    });

    await this.test('Ctrl+P switches to Params tab', async () => {
      await this.window.keyboard.press('Control+p');
      await this.window.waitForTimeout(200);
      
      const isActive = await this.window.evaluate(() => {
        return document.querySelector('.tab-btn[data-tab="params"]').classList.contains('active');
      });
      if (!isActive) throw new Error('Params tab not active');
    });

    await this.test('Ctrl+Shift+A switches to Auth tab', async () => {
      await this.window.keyboard.press('Control+Shift+A');
      await this.window.waitForTimeout(200);
      
      const isActive = await this.window.evaluate(() => {
        return document.querySelector('.tab-btn[data-tab="auth"]').classList.contains('active');
      });
      if (!isActive) throw new Error('Auth tab not active');
    });

    await this.test('Ctrl+S opens save request modal', async () => {
      // Set up a URL first
      await this.window.fill('#url-input', 'https://jsonplaceholder.typicode.com/posts/1');
      await this.window.waitForTimeout(200);
      
      // Press Ctrl+S
      await this.window.keyboard.press('Control+s');
      await this.window.waitForTimeout(500);
      
      // Check if save modal appeared
      const modalVisible = await this.window.isVisible('.discord-modal').catch(() => false);
      if (modalVisible) {
        // Close the modal by pressing Escape
        await this.window.keyboard.press('Escape');
        await this.window.waitForSelector('.discord-modal', { state: 'hidden', timeout: 3000 });
      } else {
        throw new Error('Save request modal did not appear');
      }
    });

    await this.test('Ctrl+Shift+C switches to Collections sidebar tab', async () => {
      await this.window.keyboard.press('Control+Shift+C');
      await this.window.waitForTimeout(200);
      
      const isActive = await this.window.evaluate(() => {
        return document.querySelector('.sidebar-tab-btn[data-tab="collections"]').classList.contains('active');
      });
      if (!isActive) throw new Error('Collections sidebar tab not active');
    });
  }

  async testKeyValuePairs() {
    console.log(chalk.yellow('\n🔑 Testing Key-Value Pairs'));
    
    // Test params
    await this.window.click('.tab-btn[data-tab="params"]');
    
    await this.test('Add parameter', async () => {
      const initialRows = await this.window.$$eval('#params-container .key-value-row', rows => rows.length);
      await this.window.click('.add-btn[data-target="params"]');
      await this.window.waitForTimeout(200);
      const newRows = await this.window.$$eval('#params-container .key-value-row', rows => rows.length);
      if (newRows <= initialRows) throw new Error('Parameter not added');
    });

    await this.test('Enter parameter key and value', async () => {
      const keyInputs = await this.window.$$('#params-container .key-input');
      const valueInputs = await this.window.$$('#params-container .value-input');
      
      if (keyInputs.length > 0) {
        await keyInputs[0].fill('test_key');
        await valueInputs[0].fill('test_value');
      }
    });

    // Test headers
    await this.window.click('.tab-btn[data-tab="headers"]');
    
    await this.test('Add header', async () => {
      const initialRows = await this.window.$$eval('#headers-container .key-value-row', rows => rows.length);
      await this.window.click('.add-btn[data-target="headers"]');
      await this.window.waitForTimeout(200);
      const newRows = await this.window.$$eval('#headers-container .key-value-row', rows => rows.length);
      if (newRows <= initialRows) throw new Error('Header not added');
    });
  }

  async testAuthTypes() {
    console.log(chalk.yellow('\n🔐 Testing Authentication Types'));
    
    await this.window.click('.tab-btn[data-tab="auth"]');
    
    await this.test('Select Basic Auth', async () => {
      await this.window.selectOption('#auth-type', 'basic');
      await this.window.waitForTimeout(200);
      const hasUsernameField = await this.window.isVisible('input[placeholder*="username"]').catch(() => false);
      if (!hasUsernameField) throw new Error('Basic auth fields not shown');
    });

    await this.test('Select Bearer Token', async () => {
      await this.window.selectOption('#auth-type', 'bearer');
      await this.window.waitForTimeout(200);
      const hasTokenField = await this.window.isVisible('input[placeholder*="bearer token"]').catch(() => false);
      if (!hasTokenField) throw new Error('Bearer token field not shown');
    });

    await this.test('Select API Key', async () => {
      await this.window.selectOption('#auth-type', 'api-key');
      await this.window.waitForTimeout(200);
      const hasKeyField = await this.window.isVisible('input[placeholder*="API key"]').catch(() => false);
      if (!hasKeyField) throw new Error('API key fields not shown');
    });

    await this.test('Select No Auth', async () => {
      await this.window.selectOption('#auth-type', 'none');
      await this.window.waitForTimeout(200);
      const emptyState = await this.window.isVisible('#auth-content .empty-state').catch(() => false);
      if (!emptyState) throw new Error('No auth empty state not shown');
    });
  }

  async testSidebarCollapse() {
    console.log(chalk.yellow('\n📐 Testing Sidebar Collapse'));
    
    // Clear localStorage to ensure consistent starting state
    await this.window.evaluate(() => {
      localStorage.removeItem('sidebar-states');
    });
    
    // Refresh to apply clean state
    await this.window.reload();
    await this.window.waitForTimeout(1000);
    
    await this.test('Collapse left sidebar', async () => {
      // Check initial state and ensure it's expanded
      const initialState = await this.window.evaluate(() => {
        return document.querySelector('#left-sidebar').classList.contains('collapsed');
      });
      
      if (initialState) {
        // If already collapsed, expand it first using expand button
        await this.window.click('#left-sidebar .expand-btn');
        await this.window.waitForTimeout(300);
      }
      
      // Now collapse it using collapse button
      await this.window.click('#left-sidebar .collapse-btn');
      await this.window.waitForTimeout(300);
      const isCollapsed = await this.window.evaluate(() => {
        return document.querySelector('#left-sidebar').classList.contains('collapsed');
      });
      if (!isCollapsed) throw new Error('Left sidebar not collapsed');
    });

    await this.test('Expand left sidebar', async () => {
      // Use expand button when collapsed
      await this.window.click('#left-sidebar .expand-btn');
      await this.window.waitForTimeout(300);
      const isCollapsed = await this.window.evaluate(() => {
        return document.querySelector('#left-sidebar').classList.contains('collapsed');
      });
      if (isCollapsed) throw new Error('Left sidebar still collapsed');
    });

    await this.test('Collapse right sidebar', async () => {
      // Check initial state and ensure it's expanded
      const initialState = await this.window.evaluate(() => {
        return document.querySelector('#right-sidebar').classList.contains('collapsed');
      });
      
      if (initialState) {
        // If already collapsed, expand it first using expand button
        await this.window.click('#right-sidebar .expand-btn');
        await this.window.waitForTimeout(300);
      }
      
      // Now collapse it using collapse button
      await this.window.click('#right-sidebar .collapse-btn');
      await this.window.waitForTimeout(300);
      const isCollapsed = await this.window.evaluate(() => {
        return document.querySelector('#right-sidebar').classList.contains('collapsed');
      });
      if (!isCollapsed) throw new Error('Right sidebar not collapsed');
    });

    await this.test('Expand right sidebar', async () => {
      // Use expand button when collapsed
      await this.window.click('#right-sidebar .expand-btn');
      await this.window.waitForTimeout(300);
      const isCollapsed = await this.window.evaluate(() => {
        return document.querySelector('#right-sidebar').classList.contains('collapsed');
      });
      if (isCollapsed) throw new Error('Right sidebar still collapsed');
    });
  }

  async testCurlParsing() {
    console.log(chalk.yellow('\n🔄 Testing CURL Command Parsing'));
    
    await this.test('Parse simple GET curl', async () => {
      const curl = 'curl https://jsonplaceholder.typicode.com/posts/1';
      await this.window.fill('#url-input', curl);
      await this.window.waitForTimeout(500);
      
      const urlValue = await this.window.inputValue('#url-input');
      if (!urlValue.includes('jsonplaceholder.typicode.com')) {
        throw new Error('URL not parsed correctly');
      }
    });

    await this.test('Parse curl with headers', async () => {
      const curl = `curl -H "Content-Type: application/json" -H "Authorization: Bearer token123" https://jsonplaceholder.typicode.com/posts`;
      await this.window.click('#url-input', { clickCount: 3 });
      await this.window.fill('#url-input', curl);
      await this.window.waitForTimeout(500);
      
      // Check if headers tab shows count
      const headersCount = await this.window.textContent('#headers-count');
      if (headersCount === '0') {
        throw new Error('Headers not parsed from curl');
      }
    });

    await this.test('Parse POST curl with data', async () => {
      const curl = `curl -X POST -d '{"title":"test","body":"content","userId":1}' -H "Content-Type: application/json" https://jsonplaceholder.typicode.com/posts`;
      await this.window.click('#url-input', { clickCount: 3 });
      await this.window.fill('#url-input', curl);
      await this.window.waitForTimeout(500);
      
      // Check if method changed to POST
      const methodText = await this.window.textContent('#method-dropdown .dropdown-text');
      if (methodText !== 'POST') {
        throw new Error('Method not parsed correctly from curl');
      }
    });
  }

  async runAllTests() {
    await this.launchApp();
    await this.runTestsWithExistingApp();
    await this.cleanup();
  }
  
  async runTestsWithExistingApp() {
    // This method runs tests with an already launched app
    console.log(chalk.cyan('🧪 Starting UI Component Tests\n'));
    console.log('='.repeat(60));
    
    // Run all test suites
    await this.testMethodDropdown();
    await this.testRequestTabs();
    await this.testBodyTypes();
    await this.testCollections();
    await this.testKeyboardShortcuts();
    await this.testKeyValuePairs();
    await this.testAuthTypes();
    await this.testSidebarCollapse();
    await this.testCurlParsing();
    
    await this.generateReport();
  }

  async generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.cyan('📊 UI TEST RESULTS SUMMARY'));
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
    
    const totalDuration = Date.now() - this.startTime;
    console.log(`Total Duration: ${chalk.gray(Math.floor(totalDuration / 1000) + 's')}`);
    
    // Show failed tests
    if (failed > 0) {
      console.log(chalk.red('\n❌ Failed Tests:'));
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}`);
        if (r.error) {
          console.log(chalk.gray(`    ${r.error}`));
        }
      });
    }
  }

  async cleanup() {
    console.log(chalk.gray('\n🧹 Cleaning up test data...'));
    
    // Clean up history entries created during testing
    try {
      // Switch to History tab
      await this.window.click('.sidebar-tab-btn[data-tab="history"]');
      await this.window.waitForTimeout(500);
      
      // Get all history items
      const historyItems = await this.window.$$('.history-item');
      console.log(chalk.gray(`  Found ${historyItems.length} history items to clean`));
      
      // Clear all history if there are items
      if (historyItems.length > 0) {
        // Look for a clear history button or implement clearing
        const clearHistoryBtn = await this.window.$('#clear-history-btn');
        if (clearHistoryBtn) {
          await clearHistoryBtn.click();
          await this.window.waitForTimeout(500);
          
          // Handle confirmation if there is one
          const confirmModal = await this.window.isVisible('.discord-modal').catch(() => false);
          if (confirmModal) {
            const confirmButton = await this.window.$('button.modal-btn:has-text("Confirm")');
            if (confirmButton) {
              await confirmButton.click();
              await this.window.waitForSelector('.discord-modal', { state: 'hidden', timeout: 3000 });
            }
          }
          console.log(chalk.green('  ✓ History cleared'));
        } else {
          console.log(chalk.yellow('  ⚠ Clear history button not found'));
        }
      }
    } catch (error) {
      console.log(chalk.yellow(`  ⚠ Failed to clear history: ${error.message}`));
    }
    
    if (this.app) {
      console.log(chalk.gray('\n🧹 Closing PostBoy application...'));
      await this.app.close();
    }
  }
}

// Run tests if executed directly
const isMainModule = import.meta.url === `file:///${__filename.replace(/\\/g, '/')}` || 
                     import.meta.url === `file://${__filename}` ||
                     process.argv[1] === __filename;

if (isMainModule) {
  const tester = new UIComponentTester();
  tester.runAllTests().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export default UIComponentTester;
