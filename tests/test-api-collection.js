import { _electron as electron } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PostBoy API Collection Tester
 * Tests all curl commands from test-apis-collection.json through the PostBoy UI
 */
class APICollectionTester {
  constructor() {
    this.testCollection = null;
    this.results = [];
    this.app = null;
    this.window = null;
    this.startTime = Date.now();
  }

  async init() {
    // Load test collection
    const collectionPath = path.join(__dirname, '..', 'test-apis-collection.json');
    if (!fs.existsSync(collectionPath)) {
      console.error(chalk.red('❌ test-apis-collection.json not found in project root'));
      process.exit(1);
    }
    
    this.testCollection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
    console.log(chalk.cyan(`📁 Loaded ${this.testCollection.name}`));
    console.log(chalk.gray(`   Version: ${this.testCollection.version}`));
    console.log(chalk.gray(`   Categories: ${this.testCollection.categories.length}`));
    
    // Count total tests
    const totalTests = this.testCollection.categories.reduce(
      (sum, cat) => sum + cat.requests.length, 0
    );
    console.log(chalk.gray(`   Total Tests: ${totalTests}\n`));
  }

  async launchApp() {
    console.log(chalk.yellow('Launching PostBoy application...'));
    
    try {
      // Launch Electron app
      this.app = await electron.launch({
        args: [path.join(__dirname, '..')],
        timeout: 30000
      });
      
      // Wait for the main window (not the loading window)
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
      process.exit(1);
    }
  }

  async testRequest(request, categoryName) {
    const testStart = Date.now();
    
    try {
      // Clear URL input and paste curl command
      await this.window.click('#url-input', { clickCount: 3 });
      await this.window.fill('#url-input', request.curl);
      
      // Click send button
      await this.window.click('#send-btn');
      
      // Wait for response (with longer timeout for slow APIs)
      await this.window.waitForSelector('#response-status-bar', { 
        state: 'visible',
        timeout: 30000 
      });
      
      // Small delay to ensure all UI updates are complete
      await this.window.waitForTimeout(500);
      
      // Get response details
      const statusText = await this.window.textContent('#status-badge');
      const responseTime = await this.window.textContent('#response-time');
      const responseSize = await this.window.textContent('#response-size');
      
      // Extract status code
      const statusCode = parseInt(statusText.match(/\d+/)?.[0] || '0');
      
      // Determine if test passed
      const passed = this.validateResponse(statusCode, request);
      
      const result = {
        category: categoryName,
        name: request.name,
        method: request.method,
        url: request.url,
        statusCode,
        statusText,
        responseTime,
        responseSize,
        passed,
        duration: Date.now() - testStart,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(result);
      
      // Log result
      const statusIcon = passed ? chalk.green('✅') : chalk.red('❌');
      const statusColor = passed ? chalk.green : chalk.red;
      console.log(`  ${statusIcon} ${request.name}`);
      console.log(chalk.gray(`     Status: ${statusColor(statusText)} | Time: ${responseTime} | Size: ${responseSize}`));
      
      return result;
      
    } catch (error) {
      const result = {
        category: categoryName,
        name: request.name,
        method: request.method,
        url: request.url,
        error: error.message,
        passed: false,
        duration: Date.now() - testStart,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(result);
      
      console.log(`  ${chalk.red('❌')} ${request.name}`);
      console.log(chalk.red(`     Error: ${error.message}`));
      
      return result;
    }
  }

  validateResponse(statusCode, request) {
    // Special handling for error testing endpoints
    if (request.url && request.url.includes('/status/')) {
      const expectedStatus = parseInt(request.url.match(/\/status\/(\d+)/)?.[1] || '0');
      return statusCode === expectedStatus;
    }
    
    // Authentication endpoints might return 401 if not authenticated
    if (request.url && (request.url.includes('/basic-auth/') || request.url.includes('/digest-auth/'))) {
      return statusCode === 200 || statusCode === 401;
    }
    
    // For normal requests, expect 2xx status codes
    return statusCode >= 200 && statusCode < 300;
  }

  async runAllTests() {
    await this.init();
    await this.launchApp();
    
    console.log(chalk.cyan('Starting API Collection Tests\n'));
    console.log('='.repeat(60));
    
    // Run tests for each category
    for (const category of this.testCollection.categories) {
      console.log(chalk.yellow(`\n📂 ${category.name}`));
      console.log(chalk.gray(`   ${category.description}`));
      console.log(chalk.gray(`   Tests: ${category.requests.length}\n`));
      
      for (const request of category.requests) {
        // Skip internal APIs if not accessible
        // if (request.url && request.url.startsWith('http://10.')) {
        //   console.log(`  ${chalk.yellow('⏭️')} ${request.name} ${chalk.gray('(Internal API - Skipped)')}`);
        //   continue;
        // }
        
        // Skip file upload tests for now
        if (request.curl && request.curl.includes('@/')) {
          console.log(`  ${chalk.yellow('⏭️')} ${request.name} ${chalk.gray('(File Upload - Skipped)')}`);
          continue;
        }
        
        await this.testRequest(request, category.name);
        
        // Small delay between requests to avoid overwhelming the app
        await this.window.waitForTimeout(1000);
      }
    }
    
    await this.generateReport();
    await this.cleanup();
  }

  async generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.cyan('📊 TEST RESULTS SUMMARY'));
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const skipped = this.results.filter(r => r.skipped).length;
    const total = this.results.length;
    
    console.log(`Total Tests Run: ${chalk.cyan(total)}`);
    console.log(`Passed: ${chalk.green(passed)}`);
    console.log(`Failed: ${chalk.red(failed)}`);
    
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;
    const rateColor = successRate >= 80 ? chalk.green : successRate >= 60 ? chalk.yellow : chalk.red;
    console.log(`Success Rate: ${rateColor(successRate + '%')}`);
    
    const totalDuration = Date.now() - this.startTime;
    console.log(`Total Duration: ${chalk.gray(this.formatDuration(totalDuration))}`);
    
    // Show failed tests
    if (failed > 0) {
      console.log(chalk.red('\n❌ Failed Tests:'));
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.category} / ${r.name}`);
        if (r.error) {
          console.log(chalk.gray(`    Error: ${r.error}`));
        } else {
          console.log(chalk.gray(`    Status: ${r.statusCode}`));
        }
      });
    }
    
    // Save detailed report
    const reportData = {
      summary: {
        total,
        passed,
        failed,
        successRate: `${successRate}%`,
        duration: this.formatDuration(totalDuration),
        executedAt: new Date().toISOString()
      },
      categories: this.groupResultsByCategory(),
      results: this.results
    };
    
    const reportPath = path.join(__dirname, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(chalk.gray(`\n📄 Detailed report saved to: ${path.basename(reportPath)}`));
  }

  groupResultsByCategory() {
    const grouped = {};
    this.results.forEach(result => {
      if (!grouped[result.category]) {
        grouped[result.category] = {
          name: result.category,
          tests: [],
          passed: 0,
          failed: 0
        };
      }
      grouped[result.category].tests.push(result);
      if (result.passed) {
        grouped[result.category].passed++;
      } else {
        grouped[result.category].failed++;
      }
    });
    return Object.values(grouped);
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  async cleanup() {
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
  const tester = new APICollectionTester();
  tester.runAllTests().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export default APICollectionTester;
