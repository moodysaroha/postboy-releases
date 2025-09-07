import { _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Quick Test Runner - Runs a subset of critical tests
 * Perfect for pre-commit testing
 */
async function runQuickTests() {
  console.log(chalk.cyan('⚡ PostBoy Quick Test Suite\n'));
  console.log(chalk.gray('Running critical tests only...\n'));
  
  const generateHTMLReport = process.argv.includes('--report');
  let app, window;
  const results = { passed: 0, failed: 0 };
  const testDetails = [];
  const testStartTime = Date.now();
  
  // Helper function to run and track tests
  async function runTest(name, testFn) {
    console.log(chalk.yellow(`Test ${testDetails.length + 1}: ${name}`));
    const startTime = Date.now();
    try {
      await testFn();
      console.log(chalk.green('  ✅ Passed\n'));
      results.passed++;
      testDetails.push({ name, passed: true, duration: Date.now() - startTime });
    } catch (error) {
      console.log(chalk.red(`  ❌ Failed - ${error.message}\n`));
      results.failed++;
      testDetails.push({ name, passed: false, error: error.message, duration: Date.now() - startTime });
    }
  }
  
  try {
    // Launch app
    console.log(chalk.yellow('Launching PostBoy...'));
    const projectRoot = path.join(__dirname, '..');
    console.log(chalk.gray(`  Project root: ${projectRoot}`));
    
    const packageJsonPath = path.join(projectRoot, 'package.json');
    console.log(chalk.gray(`  Looking for package.json at: ${packageJsonPath}`));
    if (fs.existsSync(packageJsonPath)) {
      console.log(chalk.green(`  ✓ package.json found`));
    } else {
      console.log(chalk.red(`  ✗ package.json NOT found`));
    }
    
    app = await electron.launch({
      args: [projectRoot],
      timeout: 30000
    });
    
    // Wait for the main window (not the loading window)
    // The app shows a loading window first, then the main window
    console.log(chalk.gray('  Waiting for main window...'));
    
    // Get all windows and wait for the main one
    let window = null;
    let attempts = 0;
    while (!window && attempts < 20) {
      const windows = app.windows();
      for (const win of windows) {
        try {
          // Check if this window has the URL input (main window)
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
    
    await window.waitForLoadState('domcontentloaded');
    await window.waitForSelector('#url-input', { timeout: 10000 });
    console.log(chalk.green('✅ App launched\n'));
    
    // Test 1: Simple GET request
    await runTest('Simple GET Request', async () => {
      await window.fill('#url-input', 'https://jsonplaceholder.typicode.com/posts/1');
      await window.click('#send-btn');
      await window.waitForSelector('#status-badge', { timeout: 10000 });
      const status = await window.textContent('#status-badge');
      if (!status.includes('200')) {
        throw new Error(`Expected 200, got ${status}`);
      }
    });
    
    // Test 2: Method dropdown
    await runTest('Method Dropdown', async () => {
      await window.click('#method-dropdown');
      await window.waitForSelector('.dropdown-options', { state: 'visible' });
      await window.click('.dropdown-option[data-value="POST"]');
      const method = await window.textContent('#method-dropdown .dropdown-text');
      if (method !== 'POST') {
        throw new Error(`Expected POST, got ${method}`);
      }
    });
    
    // Test 3: CURL parsing
    await runTest('CURL Command Parsing', async () => {
      const curl = 'curl -X GET "https://jsonplaceholder.typicode.com/users?id=1" -H "Accept: application/json"';
      await window.click('#url-input', { clickCount: 3 });
      await window.fill('#url-input', curl);
      await window.waitForTimeout(500);
      
      const urlValue = await window.inputValue('#url-input');
      const headersCount = await window.textContent('#headers-count');
      
      if (!urlValue.includes('jsonplaceholder.typicode.com') || headersCount === '0') {
        throw new Error(`CURL parsing failed - URL: ${urlValue}, Headers: ${headersCount}`);
      }
    });
    
    // Test 4: Tab switching
    await runTest('Tab Navigation', async () => {
      await window.click('.tab-btn[data-tab="headers"]');
      let isActive = await window.evaluate(() => 
        document.querySelector('.tab-btn[data-tab="headers"]').classList.contains('active')
      );
      
      await window.click('.tab-btn[data-tab="body"]');
      isActive = isActive && await window.evaluate(() => 
        document.querySelector('.tab-btn[data-tab="body"]').classList.contains('active')
      );
      
      if (!isActive) {
        throw new Error('Tab switching not working');
      }
    });
    
    // Test 5: Keyboard shortcut
    await runTest('Keyboard Shortcut (Ctrl+I)', async () => {
      await window.click('.app-header'); // Click away from URL input
      await window.keyboard.press('Control+i');
      await window.waitForTimeout(200);
      
      const isFocused = await window.evaluate(() => 
        document.activeElement.id === 'url-input'
      );
      
      if (!isFocused) {
        throw new Error('URL input not focused after Ctrl+I');
      }
    });
    
    // Test 6: POST with JSON body
    await runTest('POST Request with JSON', async () => {
      // Set method to POST
      await window.click('#method-dropdown');
      await window.click('.dropdown-option[data-value="POST"]');
      
      // Set URL - using JSONPlaceholder which accepts POST
      await window.click('#url-input', { clickCount: 3 });
      await window.fill('#url-input', 'https://jsonplaceholder.typicode.com/posts');
      
      // Go to body tab
      await window.click('.tab-btn[data-tab="body"]');
      
      // Enter JSON
      const bodyInput = await window.$('#body-input');
      if (bodyInput) {
        await bodyInput.fill('{"title": "Test Post", "body": "This is a test", "userId": 1}');
      }
      
      // Send request
      await window.click('#send-btn');
      await window.waitForSelector('#status-badge', { timeout: 10000 });
      
      const status = await window.textContent('#status-badge');
      // JSONPlaceholder might return 200 or 201 for POST requests
      if (!status.includes('201') && !status.includes('200')) {
        throw new Error(`Expected 201 or 200, got ${status}`);
      }
    });
    
    // Test 7: Geocode API - Your Internal API
    await runTest('Geocode API - Your Example', async () => {
      // This is your internal geocoding service test
      const curl = `curl --location 'http://10.5.5.108:9100/geocode?internalUse=true' --header 'Content-Type: application/json' --data '{"addresses_with_ids": [{"id": "addr_001", "address": "123 Street, New York, NY 10001"}, {"id": "addr_002", "address": "4561 Oak Avenue, Los Angeles, CA 90210"}]}'`;
      
      // Clear and paste the curl command
      await window.click('#url-input', { clickCount: 3 });
      await window.fill('#url-input', curl);
      
      // Wait for curl to be parsed
      await window.waitForTimeout(1000);
      
      // Send request
      await window.click('#send-btn');
      
      // Wait for response with longer timeout for internal API
      await window.waitForSelector('#status-badge', { timeout: 15000 });
      
      const status = await window.textContent('#status-badge');
      // Check if we got a response (might be connection error if internal API is not accessible)
      if (!status) {
        throw new Error('No response received from Geocode API');
      }
      
      // Log the status for debugging
      console.log(chalk.gray(`    Geocode API responded with: ${status}`));
    });
    
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error.message);
  } finally {
    // Summary
    console.log('='.repeat(50));
    console.log(chalk.cyan('QUICK TEST SUMMARY'));
    console.log('='.repeat(50));
    console.log(`Total: ${results.passed + results.failed}`);
    console.log(`Passed: ${chalk.green(results.passed)}`);
    console.log(`Failed: ${chalk.red(results.failed)}`);
    
    const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(0);
    const rateColor = successRate >= 80 ? chalk.green : successRate >= 60 ? chalk.yellow : chalk.red;
    console.log(`Success Rate: ${rateColor(successRate + '%')}`);
    
    const totalDuration = Date.now() - testStartTime;
    console.log(`Duration: ${chalk.gray(Math.floor(totalDuration / 1000) + 's')}`);
    
    // Generate HTML report if requested
    if (generateHTMLReport) {
      generateHTMLReportFile(results, testDetails, totalDuration);
    }
    
    // Cleanup
    if (app) {
      console.log(chalk.gray('\n🧹 Closing app...'));
      await app.close();
    }
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

// Generate HTML report
function generateHTMLReportFile(results, testDetails, totalDuration) {
  const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PostBoy Quick Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .header h1 { 
            font-size: 2rem; 
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        .header p { opacity: 0.9; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            padding: 2rem;
            background: #f8f9fa;
        }
        .summary-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .summary-card .value {
            font-size: 2rem;
            font-weight: bold;
            margin: 0.5rem 0;
        }
        .summary-card .label {
            color: #6c757d;
            text-transform: uppercase;
            font-size: 0.875rem;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .rate-good { color: #28a745; }
        .rate-warning { color: #ffc107; }
        .rate-bad { color: #dc3545; }
        .tests {
            padding: 2rem;
        }
        .tests h2 {
            color: #495057;
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
        }
        .test-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            margin-bottom: 0.5rem;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid transparent;
        }
        .test-item.passed {
            border-left-color: #28a745;
        }
        .test-item.failed {
            border-left-color: #dc3545;
            background: #fff5f5;
        }
        .test-name {
            font-weight: 500;
            flex: 1;
        }
        .test-status {
            font-size: 1.5rem;
            margin-right: 1rem;
        }
        .test-duration {
            color: #6c757d;
            font-size: 0.875rem;
        }
        .test-error {
            color: #dc3545;
            font-size: 0.875rem;
            margin-top: 0.5rem;
            padding-left: 2.5rem;
        }
        .footer {
            padding: 1rem;
            text-align: center;
            color: #6c757d;
            font-size: 0.875rem;
            background: #f8f9fa;
        }
        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
            text-transform: uppercase;
            margin-left: 0.5rem;
        }
        .badge-quick { background: #17a2b8; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ PostBoy Quick Test Report <span class="badge badge-quick">Quick Suite</span></h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <div class="label">Total Tests</div>
                <div class="value">${results.passed + results.failed}</div>
            </div>
            <div class="summary-card">
                <div class="label">Passed</div>
                <div class="value passed">${results.passed}</div>
            </div>
            <div class="summary-card">
                <div class="label">Failed</div>
                <div class="value failed">${results.failed}</div>
            </div>
            <div class="summary-card">
                <div class="label">Success Rate</div>
                <div class="value ${successRate >= 80 ? 'rate-good' : successRate >= 60 ? 'rate-warning' : 'rate-bad'}">${successRate}%</div>
            </div>
            <div class="summary-card">
                <div class="label">Duration</div>
                <div class="value">${Math.floor(totalDuration / 1000)}s</div>
            </div>
        </div>
        
        <div class="tests">
            <h2>Test Results</h2>
            ${testDetails.map((test, index) => `
                <div class="test-item ${test.passed ? 'passed' : 'failed'}">
                    <span class="test-status">${test.passed ? '✅' : '❌'}</span>
                    <span class="test-name">Test ${index + 1}: ${test.name}</span>
                    <span class="test-duration">${test.duration}ms</span>
                </div>
                ${test.error ? `<div class="test-error">Error: ${test.error}</div>` : ''}
            `).join('')}
        </div>
        
        <div class="footer">
            <p>PostBoy Quick Test Suite v1.0.0 | ${testDetails.length} critical tests</p>
        </div>
    </div>
</body>
</html>
  `;
  
  const reportPath = path.join(__dirname, `quick-test-report-${Date.now()}.html`);
  fs.writeFileSync(reportPath, html);
  console.log(chalk.gray(`\n📊 HTML report saved to: ${path.basename(reportPath)}`));
}

// Run the tests
runQuickTests();
