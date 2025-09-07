import chalk from 'chalk';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import APICollectionTester from './test-api-collection.js';
import UIComponentTester from './test-ui-components.js';
import DatabaseSchemaValidator from './test-database-schema.js';
import ImportExportTester from './test-import-export-collections.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Master Test Runner - Orchestrates all test suites
 */
class MasterTestRunner {
  constructor() {
    this.results = {
      api: null,
      ui: null,
      database: null,
      importexport: null
    };
    this.startTime = Date.now();
    this.generateHTMLReport = process.argv.includes('--report');
  }

  async runTestSuite(name, TestClass) {
    console.log('\n' + '='.repeat(70));
    console.log(chalk.cyan.bold(`🧪 ${name.toUpperCase()} TEST SUITE`));
    console.log('='.repeat(70) + '\n');
    
    const tester = new TestClass();
    
    try {
      await tester.runAllTests();
      
      // Extract results from tester
      const resultKey = name.toLowerCase().replace(/[^a-z]/g, ''); // Remove special chars and spaces
      this.results[resultKey] = {
        passed: tester.results?.filter(r => r.passed).length || 0,
        failed: tester.results?.filter(r => !r.passed).length || 0,
        total: tester.results?.length || 0,
        details: tester.results || []
      };
    } catch (error) {
      console.error(chalk.red(`\n❌ ${name} tests failed with error:`), error.message);
      const resultKey = name.toLowerCase().replace(/[^a-z]/g, ''); // Remove special chars and spaces
      this.results[resultKey] = {
        passed: 0,
        failed: 1,
        total: 1,
        error: error.message
      };
    }
  }

  async runAllTests() {
    console.log(chalk.cyan.bold('🚀 POSTBOY COMPREHENSIVE TEST SUITE'));
    console.log(chalk.gray('Testing API collection, UI components, database schema, and import/export'));
    console.log(chalk.gray(`Started at: ${new Date().toLocaleString()}\n`));
    
    // Run each test suite
    await this.runTestSuite('Database', DatabaseSchemaValidator);
    await this.runTestSuite('UI Components', UIComponentTester);
    await this.runTestSuite('API Collection', APICollectionTester);
    await this.runTestSuite('Import/Export', ImportExportTester);
    
    // Generate final report
    this.generateFinalReport();
    
    if (this.generateHTMLReport) {
      this.createHTMLReport();
    }
  }

  generateFinalReport() {
    console.log('\n' + '='.repeat(70));
    console.log(chalk.cyan.bold('📊 FINAL TEST REPORT'));
    console.log('='.repeat(70) + '\n');
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;
    
    // Individual suite results
    console.log(chalk.yellow('Test Suite Results:'));
    console.log('-'.repeat(50));
    
    for (const [suite, results] of Object.entries(this.results)) {
      if (results) {
        const successRate = results.total > 0 
          ? ((results.passed / results.total) * 100).toFixed(1)
          : '0.0';
        
        const rateColor = successRate >= 80 ? chalk.green : 
                         successRate >= 60 ? chalk.yellow : chalk.red;
        
        console.log(`${chalk.cyan(suite.padEnd(15))} | ` +
                   `Total: ${String(results.total).padStart(3)} | ` +
                   `Passed: ${chalk.green(String(results.passed).padStart(3))} | ` +
                   `Failed: ${chalk.red(String(results.failed).padStart(3))} | ` +
                   `Rate: ${rateColor(successRate.padStart(5) + '%')}`);
        
        totalPassed += results.passed || 0;
        totalFailed += results.failed || 0;
        totalTests += results.total || 0;
      }
    }
    
    console.log('-'.repeat(50));
    
    // Overall summary
    const overallRate = totalTests > 0 
      ? ((totalPassed / totalTests) * 100).toFixed(1)
      : '0.0';
    
    const overallColor = overallRate >= 80 ? chalk.green : 
                        overallRate >= 60 ? chalk.yellow : chalk.red;
    
    console.log(chalk.cyan('OVERALL'.padEnd(15)) + ' | ' +
               `Total: ${chalk.cyan(String(totalTests).padStart(3))} | ` +
               `Passed: ${chalk.green(String(totalPassed).padStart(3))} | ` +
               `Failed: ${chalk.red(String(totalFailed).padStart(3))} | ` +
               `Rate: ${overallColor(overallRate.padStart(5) + '%')}`);
    
    // Duration
    const duration = Date.now() - this.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    console.log(`\nTotal Duration: ${chalk.gray(`${minutes}m ${seconds}s`)}`);
    
    // Final verdict
    console.log('\n' + '='.repeat(70));
    if (overallRate >= 80) {
      console.log(chalk.green.bold('✅ TEST SUITE PASSED'));
      console.log(chalk.green('All critical functionality is working correctly!'));
    } else if (overallRate >= 60) {
      console.log(chalk.yellow.bold('⚠️ TEST SUITE PARTIALLY PASSED'));
      console.log(chalk.yellow('Some tests failed. Please review the failures above.'));
    } else {
      console.log(chalk.red.bold('❌ TEST SUITE FAILED'));
      console.log(chalk.red('Many tests failed. Immediate attention required!'));
    }
    console.log('='.repeat(70));
    
    // Save JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      duration: `${minutes}m ${seconds}s`,
      summary: {
        total: totalTests,
        passed: totalPassed,
        failed: totalFailed,
        successRate: overallRate + '%'
      },
      suites: this.results
    };
    
    const reportPath = path.join(__dirname, `full-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
    console.log(chalk.gray(`\n📄 Detailed JSON report saved to: ${path.basename(reportPath)}`));
  }

  createHTMLReport() {
    const totalPassed = Object.values(this.results).reduce((sum, r) => sum + (r?.passed || 0), 0);
    const totalFailed = Object.values(this.results).reduce((sum, r) => sum + (r?.failed || 0), 0);
    const totalTests = Object.values(this.results).reduce((sum, r) => sum + (r?.total || 0), 0);
    const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PostBoy Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        .container {
            max-width: 1200px;
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
        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .header p { opacity: 0.9; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
        .suite {
            padding: 2rem;
            border-bottom: 1px solid #e9ecef;
        }
        .suite:last-child { border-bottom: none; }
        .suite h2 {
            color: #495057;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .suite-stats {
            display: flex;
            gap: 2rem;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }
        .suite-stats span { color: #6c757d; }
        .progress-bar {
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }
        .footer {
            padding: 1rem;
            text-align: center;
            color: #6c757d;
            font-size: 0.875rem;
            background: #f8f9fa;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 PostBoy Test Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <div class="label">Total Tests</div>
                <div class="value">${totalTests}</div>
            </div>
            <div class="summary-card">
                <div class="label">Passed</div>
                <div class="value passed">${totalPassed}</div>
            </div>
            <div class="summary-card">
                <div class="label">Failed</div>
                <div class="value failed">${totalFailed}</div>
            </div>
            <div class="summary-card">
                <div class="label">Success Rate</div>
                <div class="value ${successRate >= 80 ? 'rate-good' : successRate >= 60 ? 'rate-warning' : 'rate-bad'}">${successRate}%</div>
            </div>
        </div>
        
        ${Object.entries(this.results).map(([suite, results]) => {
            if (!results) return '';
            const suiteRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : '0';
            return `
            <div class="suite">
                <h2>${suite.charAt(0).toUpperCase() + suite.slice(1)} Tests</h2>
                <div class="suite-stats">
                    <span>Total: <strong>${results.total}</strong></span>
                    <span>Passed: <strong class="passed">${results.passed}</strong></span>
                    <span>Failed: <strong class="failed">${results.failed}</strong></span>
                    <span>Success Rate: <strong>${suiteRate}%</strong></span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${suiteRate}%"></div>
                </div>
            </div>
            `;
        }).join('')}
        
        <div class="footer">
            <p>PostBoy Automated Test Suite v1.0.0</p>
        </div>
    </div>
</body>
</html>
    `;
    
    const htmlPath = path.join(__dirname, `test-report-${Date.now()}.html`);
    fs.writeFileSync(htmlPath, html);
    console.log(chalk.gray(`📊 HTML report saved to: ${path.basename(htmlPath)}`));
  }
}

// Run the master test suite
const isMainModule = import.meta.url === `file:///${__filename.replace(/\\/g, '/')}` || 
                     import.meta.url === `file://${__filename}` ||
                     process.argv[1] === __filename;

if (isMainModule) {
  const runner = new MasterTestRunner();
  runner.runAllTests().catch(error => {
    console.error(chalk.red('Fatal error in test runner:'), error);
    process.exit(1);
  });
}

export default MasterTestRunner;
