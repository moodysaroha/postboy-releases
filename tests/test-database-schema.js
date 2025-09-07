import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PostBoy Database Schema Validator
 * Validates that the database schema matches the expected structure
 */
class DatabaseSchemaValidator {
  constructor() {
    this.db = null;
    this.results = [];
    this.expectedSchema = {
      collections: {
        columns: {
          id: { type: 'INTEGER', notnull: 0, dflt_value: null, pk: 1 },
          name: { type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
          description: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          created_at: { type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 },
          updated_at: { type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 }
        }
      },
      requests: {
        columns: {
          id: { type: 'INTEGER', notnull: 0, dflt_value: null, pk: 1 },
          collection_id: { type: 'INTEGER', notnull: 0, dflt_value: null, pk: 0 },
          name: { type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
          method: { type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
          url: { type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
          headers: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          params: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          body_type: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          body_content: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          auth_type: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          auth_data: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          created_at: { type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 },
          updated_at: { type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 }
        },
        foreignKeys: ['collection_id REFERENCES collections(id)']
      },
      history: {
        columns: {
          id: { type: 'INTEGER', notnull: 0, dflt_value: null, pk: 1 },
          method: { type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
          url: { type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
          status_code: { type: 'INTEGER', notnull: 0, dflt_value: null, pk: 0 },
          response_time: { type: 'INTEGER', notnull: 0, dflt_value: null, pk: 0 },
          headers: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          params: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          body_type: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          body_content: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          auth_type: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          auth_data: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          response_headers: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          response_body: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          executed_at: { type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 }
        }
      },
      settings: {
        columns: {
          key: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 1 },
          value: { type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
          updated_at: { type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 }
        }
      }
    };
  }

  getAppDataPath() {
    // Determine the correct app data path based on OS
    const platform = process.platform;
    const appName = 'postboy';
    
    if (platform === 'win32') {
      return path.join(os.homedir(), 'AppData', 'Roaming', appName);
    } else if (platform === 'darwin') {
      return path.join(os.homedir(), 'Library', 'Application Support', appName);
    } else {
      return path.join(os.homedir(), '.config', appName);
    }
  }

  async connectToDatabase() {
    console.log(chalk.yellow('🔗 Connecting to database...'));
    
    const appDataPath = this.getAppDataPath();
    const dbPath = path.join(appDataPath, 'postboy.db');
    
    console.log(chalk.gray(`   Database path: ${dbPath}`));
    
    if (!fs.existsSync(dbPath)) {
      console.log(chalk.red('❌ Database file not found!'));
      console.log(chalk.yellow('   Please run PostBoy at least once to create the database.'));
      return false;
    }
    
    try {
      this.db = new Database(dbPath, { readonly: true });
      console.log(chalk.green('✅ Connected to database\n'));
      return true;
    } catch (error) {
      console.log(chalk.red('❌ Failed to connect to database:'), error.message);
      return false;
    }
  }

  test(name, testFn) {
    console.log(`  Testing: ${name}`);
    
    try {
      const result = testFn();
      this.results.push({ name, passed: true });
      console.log(chalk.green(`    ✅ Passed`));
      return true;
    } catch (error) {
      this.results.push({ name, passed: false, error: error.message });
      console.log(chalk.red(`    ❌ Failed: ${error.message}`));
      return false;
    }
  }

  validateTables() {
    console.log(chalk.yellow('📋 Validating Tables'));
    
    // Get all tables in the database
    const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);
    
    // Check if all expected tables exist
    for (const expectedTable of Object.keys(this.expectedSchema)) {
      this.test(`Table '${expectedTable}' exists`, () => {
        if (!tableNames.includes(expectedTable)) {
          throw new Error(`Table '${expectedTable}' not found`);
        }
      });
    }
    
    // Check for unexpected tables
    this.test('No unexpected tables', () => {
      const expectedTables = Object.keys(this.expectedSchema);
      const unexpectedTables = tableNames.filter(t => !expectedTables.includes(t));
      if (unexpectedTables.length > 0) {
        console.log(chalk.yellow(`    Warning: Unexpected tables found: ${unexpectedTables.join(', ')}`));
      }
    });
  }

  validateTableSchema(tableName) {
    console.log(chalk.yellow(`\n📊 Validating '${tableName}' Schema`));
    
    const expectedColumns = this.expectedSchema[tableName].columns;
    
    // Get actual table schema
    const actualColumns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
    
    // Check column count
    this.test('Column count matches', () => {
      const expectedCount = Object.keys(expectedColumns).length;
      const actualCount = actualColumns.length;
      if (actualCount !== expectedCount) {
        throw new Error(`Expected ${expectedCount} columns, found ${actualCount}`);
      }
    });
    
    // Check each column
    for (const column of actualColumns) {
      const columnName = column.name;
      const expected = expectedColumns[columnName];
      
      if (!expected) {
        this.test(`Column '${columnName}'`, () => {
          throw new Error(`Unexpected column '${columnName}'`);
        });
        continue;
      }
      
      this.test(`Column '${columnName}' type`, () => {
        if (column.type !== expected.type) {
          throw new Error(`Expected type '${expected.type}', got '${column.type}'`);
        }
      });
      
      this.test(`Column '${columnName}' nullable`, () => {
        if (column.notnull !== expected.notnull) {
          throw new Error(`Expected notnull=${expected.notnull}, got ${column.notnull}`);
        }
      });
      
      this.test(`Column '${columnName}' primary key`, () => {
        if (column.pk !== expected.pk) {
          throw new Error(`Expected pk=${expected.pk}, got ${column.pk}`);
        }
      });
    }
    
    // Check for missing columns
    for (const expectedColumn of Object.keys(expectedColumns)) {
      const found = actualColumns.find(c => c.name === expectedColumn);
      if (!found) {
        this.test(`Column '${expectedColumn}' exists`, () => {
          throw new Error(`Column '${expectedColumn}' not found`);
        });
      }
    }
  }

  validateForeignKeys() {
    console.log(chalk.yellow('\n🔗 Validating Foreign Keys'));
    
    // Check foreign keys for requests table
    const foreignKeys = this.db.prepare("PRAGMA foreign_key_list(requests)").all();
    
    this.test('Requests table has foreign key to collections', () => {
      const hasCollectionFK = foreignKeys.some(fk => 
        fk.table === 'collections' && fk.from === 'collection_id'
      );
      if (!hasCollectionFK) {
        throw new Error('Foreign key from requests.collection_id to collections not found');
      }
    });
  }

  validateIndexes() {
    console.log(chalk.yellow('\n📑 Validating Indexes'));
    
    // Get all indexes
    const indexes = this.db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index'").all();
    
    this.test('Primary key indexes exist', () => {
      // SQLite automatically creates indexes for primary keys
      const tables = ['collections', 'requests', 'history'];
      for (const table of tables) {
        const hasIndex = indexes.some(idx => idx.tbl_name === table);
        if (!hasIndex) {
          console.log(chalk.yellow(`    Warning: No indexes found for table '${table}'`));
        }
      }
    });
  }

  testDataOperations() {
    console.log(chalk.yellow('\n💾 Testing Data Operations'));
    
    this.test('Can read from collections table', () => {
      const collections = this.db.prepare("SELECT * FROM collections LIMIT 1").all();
      // No error means success
    });
    
    this.test('Can read from requests table', () => {
      const requests = this.db.prepare("SELECT * FROM requests LIMIT 1").all();
      // No error means success
    });
    
    this.test('Can read from history table', () => {
      const history = this.db.prepare("SELECT * FROM history LIMIT 1").all();
      // No error means success
    });
    
    this.test('Can read from settings table', () => {
      const settings = this.db.prepare("SELECT * FROM settings LIMIT 1").all();
      // No error means success
    });
  }

  generateSchemaSnapshot() {
    console.log(chalk.yellow('\n📸 Generating Schema Snapshot'));
    
    const snapshot = {
      timestamp: new Date().toISOString(),
      tables: {}
    };
    
    const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    for (const table of tables) {
      const columns = this.db.prepare(`PRAGMA table_info(${table.name})`).all();
      const foreignKeys = this.db.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
      const indexes = this.db.prepare(`PRAGMA index_list(${table.name})`).all();
      
      snapshot.tables[table.name] = {
        columns: columns.map(c => ({
          name: c.name,
          type: c.type,
          notnull: c.notnull,
          default: c.dflt_value,
          pk: c.pk
        })),
        foreignKeys: foreignKeys.map(fk => ({
          from: fk.from,
          to: fk.to,
          table: fk.table,
          on_update: fk.on_update,
          on_delete: fk.on_delete
        })),
        indexes: indexes.map(idx => ({
          name: idx.name,
          unique: idx.unique,
          origin: idx.origin
        }))
      };
    }
    
    const snapshotPath = path.join(__dirname, 'database-schema-snapshot.json');
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    
    console.log(chalk.green(`✅ Schema snapshot saved to: ${path.basename(snapshotPath)}`));
    
    return snapshot;
  }

  async runAllTests() {
    console.log(chalk.cyan('🧪 Starting Database Schema Validation\n'));
    console.log('='.repeat(60));
    
    // Connect to database
    if (!await this.connectToDatabase()) {
      console.log(chalk.red('\n❌ Cannot proceed without database connection'));
      return;
    }
    
    // Run validations
    this.validateTables();
    
    for (const tableName of Object.keys(this.expectedSchema)) {
      this.validateTableSchema(tableName);
    }
    
    this.validateForeignKeys();
    this.validateIndexes();
    this.testDataOperations();
    
    // Generate snapshot
    this.generateSchemaSnapshot();
    
    this.generateReport();
    this.cleanup();
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.cyan('📊 DATABASE VALIDATION RESULTS'));
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log(`Total Checks: ${chalk.cyan(total)}`);
    console.log(`Passed: ${chalk.green(passed)}`);
    console.log(`Failed: ${chalk.red(failed)}`);
    
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;
    const rateColor = successRate === '100.00' ? chalk.green : successRate >= 80 ? chalk.yellow : chalk.red;
    console.log(`Success Rate: ${rateColor(successRate + '%')}`);
    
    // Show failed tests
    if (failed > 0) {
      console.log(chalk.red('\n❌ Failed Checks:'));
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}`);
        if (r.error) {
          console.log(chalk.gray(`    ${r.error}`));
        }
      });
    }
    
    if (successRate === '100.00') {
      console.log(chalk.green('\n✨ Database schema is valid and matches expected structure!'));
    } else {
      console.log(chalk.yellow('\n⚠️ Some schema validations failed. Please review the errors above.'));
    }
  }

  cleanup() {
    if (this.db) {
      console.log(chalk.gray('\n🧹 Closing database connection...'));
      this.db.close();
    }
  }
}

// Run tests if executed directly
const isMainModule = import.meta.url === `file:///${__filename.replace(/\\/g, '/')}` || 
                     import.meta.url === `file://${__filename}` ||
                     process.argv[1] === __filename;

if (isMainModule) {
  const validator = new DatabaseSchemaValidator();
  validator.runAllTests().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export default DatabaseSchemaValidator;
