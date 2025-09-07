# PostBoy Test Suite

Comprehensive automated testing for the PostBoy application using Playwright.

## 📋 Prerequisites

- Node.js 20.x recommended (Electron 38 uses Node.js 20.19.5)
- PostBoy application source code
- `test-apis-collection.json` in the project root

⚠️ **IMPORTANT: Node.js Version Compatibility**

This project uses native modules (like `better-sqlite3`) that need to be compiled for your specific Node.js version. The PostBoy Electron app bundles Node.js v22.18.0, but your system might have a different version.

## 🚀 Installation

```bash
cd tests
yarn install  # This automatically runs the setup script
```

If you encounter native module errors later, run:
```bash
yarn setup  # Rebuilds native modules for your Node.js version
```

## 🧪 Available Test Suites

### 1. **API Collection Tests** (`test-api-collection.js`)
Tests all curl commands from your `test-apis-collection.json` file through the PostBoy UI.
- Validates curl parsing
- Tests request execution
- Verifies response handling
- Covers 60+ different API scenarios

### 2. **UI Component Tests** (`test-ui-components.js`)
Tests all UI components and interactions:
- Method dropdown functionality
- Tab switching (Params, Body, Headers, Auth)
- Body type selection (JSON, XML, Form Data, etc.)
- Collections management
- Keyboard shortcuts
- Sidebar collapse/expand
- Key-value pair inputs
- Authentication types
- CURL command parsing

### 3. **Database Schema Validator** (`test-database-schema.js`)
Validates database integrity:
- Table structure verification
- Column types and constraints
- Foreign key relationships
- Index validation
- Data operation tests
- Generates schema snapshots

## 📦 Running Tests

### Quick Test (Pre-commit)
```bash
# Run quick test
yarn test:quick

# Run quick test with HTML report
yarn test:quick:report
```
Runs 7 critical tests in ~30 seconds:
- Simple GET request
- Method dropdown
- CURL parsing
- Tab navigation
- Keyboard shortcuts
- POST with JSON
- Geocode API (Your internal API)

### Individual Test Suites
```bash
# Test API collection
yarn test:api

# Test UI components
yarn test:ui

# Validate database schema
yarn test:db
```

### Full Test Suite
```bash
# Run all tests
yarn test

# Run all tests with HTML report
yarn test:report
```

## 📊 Test Reports

Tests generate multiple types of reports:

1. **Console Output**: Real-time colored output showing test progress
2. **JSON Reports**: Detailed test results in `test-report-*.json`
3. **HTML Reports**: Visual reports in `test-report-*.html` (when using `--report` flag)
4. **Schema Snapshots**: Database structure saved in `database-schema-snapshot.json`

## 🎯 Test Coverage

### API Testing
- ✅ Basic HTTP methods (GET, POST, PUT, PATCH, DELETE)
- ✅ Query parameters
- ✅ JSON/XML/Form data
- ✅ Authentication (Basic, Bearer, API Key)
- ✅ Headers and cookies
- ✅ Error responses
- ✅ File uploads (placeholder)
- ✅ GraphQL queries

### UI Testing
- ✅ All dropdowns and selects
- ✅ Tab navigation
- ✅ Form inputs
- ✅ Keyboard shortcuts
- ✅ Collection CRUD operations
- ✅ Request/Response handling
- ✅ Sidebar interactions
- ✅ CURL command parsing

### Database Testing
- ✅ Schema structure
- ✅ Data integrity
- ✅ Foreign key constraints
- ✅ Table relationships

## ⚙️ Configuration

### Timeouts
Default timeouts can be adjusted in test files:
- App launch: 30 seconds
- Request execution: 30 seconds
- UI interactions: 10 seconds

### Skipping Tests
Some tests are automatically skipped:
- Internal APIs (10.x.x.x addresses)
- File upload tests (require local files)

## 🔧 Troubleshooting

### App Won't Launch
- Ensure PostBoy is not already running
- Check that `src/index.js` exists
- Verify Electron is properly installed

### Tests Timing Out
- Increase timeout values in test files
- Check network connectivity for API tests
- Ensure PostBoy database exists (run app once manually)

### Database Tests Failing
- Run PostBoy at least once to create the database
- Check database path matches your OS:
  - Windows: `%APPDATA%/postboy/postboy.db`
  - macOS: `~/Library/Application Support/postboy/postboy.db`
  - Linux: `~/.config/postboy/postboy.db`

## 📈 Success Criteria

- **Excellent**: >80% pass rate ✅
- **Good**: 60-80% pass rate ⚠️
- **Needs Work**: <60% pass rate ❌

## 🛠️ Development

### Adding New Tests

1. Add test functions to relevant test file
2. Follow the existing pattern:
```javascript
await this.test('Test name', async () => {
  // Test implementation
  if (!condition) throw new Error('Test failed');
});
```

### Creating Custom Test Suites

1. Create new file in `tests/` directory
2. Import necessary modules
3. Extend or create test class
4. Add to `run-all-tests.js` if needed

## 📝 Notes

- Tests run against real APIs (not mocked)
- Each test suite can run independently
- Results are saved for historical comparison
- Tests are designed to be idempotent

## 🤝 Contributing

When adding new features to PostBoy:
1. Add corresponding tests
2. Ensure all tests pass
3. Update this README if needed

## 📝 API Endpoints Used

The tests use the following public APIs:
- **JSONPlaceholder** (https://jsonplaceholder.typicode.com) - For GET, POST, PUT, DELETE tests
- **Your Internal Geocode API** (http://10.5.5.108:9100) - For internal API testing

Note: httpbin.org alternatives are used due to organizational restrictions.

## 📄 License

Part of the PostBoy project - MIT License
