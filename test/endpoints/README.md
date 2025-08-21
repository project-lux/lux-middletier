# LUX Endpoint Testing Framework

A comprehensive automated endpoint testing framework for the LUX MarkLogic backend API. This tool automatically discovers endpoints, generates detailed specifications, and creates ready-to-run Excel test files populated with comprehensive test data from multiple sources. Tests can be executed sequentially or in parallel, generating detailed reports with response times and status codes.

## Features

- **Automated endpoint discovery**: Creates detailed JSON specifications with parameters and handlers of endpoints found in app.js
- **Automated test generation**: Creates Excel files with ready-to-run test cases populated from multiple data sources
- **Multi-source data integration**: Automatically discovers and uses ALL available test data providers
- **Comprehensive reporting**: JSON, CSV, and HTML reports with detailed metrics
- **Report comparison**: Compare the reports from two runs to identify regressions
- **Authentication**: Optionally authenticate with digest credentials
- **Test organization**: Tag-based test filtering and test suite management
- **Performance monitoring**: Response time tracking and timeout handling
- **Error handling**: Detailed error reporting and negative test cases

## Available NPM Scripts

The framework includes several convenient npm scripts for common tasks:

| Script | Command | Description |
|--------|---------|-------------|
| `npm test` | `node run-tests.js ./configs` | Run all tests with default configuration |
| `npm run test:dev` | `node run-tests.js ./configs ./reports` | Run tests and save reports to reports directory |
| `npm run test:save` | `node run-tests.js ./configs ./reports --save-responses` | Run tests with response body saving enabled |
| `npm run create:tests` | `node create-tests.js` | Generate Excel test files from endpoints specification |
| `npm run create:spec` | `node create-endpoints-spec.js` | Analyze Express.js app and generate endpoints specification |
| `npm run compare` | `node compare-reports.js` | Interactive tool to compare two test reports |
| `npm run install-deps` | `npm install` | Install all required dependencies |

## Workflow Overview

1. **Provide test data**: Implement the TestDataProvider class for each test data source.
2. **Analyze**: Run `npm run create:spec` to discover all endpoints in your Express app
3. **Generate**: Create comprehensive test files with `npm run create:tests` (automatically discovers and uses all available data sources to populate ready-to-run test cases)
4. **Execute**: Run tests with `npm test` or `npm run test:dev` or `npm run test:save` to save the response bodies.
5. **Report**: Review detailed HTML, CSV, and JSON reports
6. **Compare**: Use `npm run compare` to analyze differences between test runs.  By default, the last two directories in the reports directory are compared.  To override, specify the reports directory, the baseline report file, and the report file to compare to.  Submit the JSON-formatted report files.
7. **Customize** (Optional): Additional test cases may be added within an existing TestDataProvider's implementation data file or directly within a new TestDataProvider's implementation that doesn't use an external data source.  Do not add them to the generated spreadsheets.

## Quick Start

### 1. Install Dependencies

```bash
cd test/endpoints
npm install
```

### 2. Configure Environment Variables

Set up the required environment variables for your target environment:

**Digest Authentication (default):**
```bash
$env:BASE_URL = "http://localhost:8003"
$env:AUTH_TYPE = "digest"
$env:AUTH_USERNAME = "your-username"
$env:AUTH_PASSWORD = "your-password"
```

**For different environments:**
```bash
# Development
$env:BASE_URL = "http://dev-server:8003"
$env:AUTH_TYPE = "digest"
$env:AUTH_USERNAME = "dev-user"
$env:AUTH_PASSWORD = "dev-password"

# Production  
$env:BASE_URL = "https://api.lux.yale.edu"
$env:AUTH_TYPE = "digest"
$env:AUTH_USERNAME = "prod-user"
$env:AUTH_PASSWORD = "secure-prod-password"
```

### 3. Implement Test Data Providers

_You can double back to this section if you would first like to see the output when only using the same test data providers._

Implement the TestDataProvider class for each data source to generate tests from.

To add a new data source, simply:

1. Create a new provider class extending TestDataProvider
2. Implement getProviderId() and extractTestData()
3. Register it in index.js

For example, to add a JSON file provider:

```javascript
export class JsonTestDataProvider extends TestDataProvider {
  constructor(options = {}) {
    super(options);
    this.sourcePath = path.resolve(__dirname, '../test-data/tests.json');
  }
  
  getProviderId() {
    return 'json-provider:tests.json';
  }
  
  async extractTestData(apiDef, endpointKey, columns) {
    // Implementation specific to JSON file
  }
}
```

### 4. Generate Endpoint Specification and Tests

First, generate the endpoint specification by analyzing the app.js file:

```bash
npm run create:spec
```

This creates an `endpoints-spec.json` file containing all discovered endpoints with their parameters, required fields, and handler information.

Then, create Excel test files based on the specification:

```bash
npm run create:tests
```

This creates comprehensive Excel test files for each endpoint in the `configs/` directory based on the endpoints found in `endpoints-spec.json`:
- Individual Excel files for each discovered endpoint with ready-to-run test cases
- Parameter-specific columns for each endpoint type  
- Pre-configured test data from all available data sources
- Multiple test scenarios including success and error cases
- No manual configuration required - files are ready to execute immediately

### 5. Run Tests

**Using npm scripts (Recommended):**
```bash
npm test
```

**With response body saving:**
```bash
npm run test:save
```

**Using Node.js directly:**
```bash
node run-tests.js ./configs
```

**With custom output directory:**
```bash
node run-tests.js ./configs ./reports
```

**With response body saving:**
```bash
node run-tests.js ./configs ./reports --save-responses
```

### 6. Compare Test Results

After running tests multiple times, you can compare results to identify regressions or changes:

```bash
npm run compare
```

This launches an interactive comparison tool that:
- Shows detailed differences between two test reports
- Identifies regressions (tests that were passing but now fail)
- Highlights performance changes (response time differences)
- Generates comparison reports in JSON, HTML, and console formats

## Endpoint Discovery and Specification Generation

The framework includes automated endpoint discovery that analyzes your Express.js application to generate detailed API specifications.

### Endpoint Analysis Script

The `create-endpoints-spec.js` script automatically analyzes your Express.js application to discover:

- All defined routes and their HTTP methods
- Path parameters and query parameters
- Required vs optional parameters
- Handler function names and middleware
- Response patterns and status codes

**Usage:**
```bash
npm run create:spec
```

**Output:** 
Creates `endpoints-spec.json` with detailed endpoint specifications in the format:
```json
{
  "/api/search/:scope": {
    "path": "/api/search/:scope",
    "method": "GET",
    "parameters": [
      {
        "name": "scope",
        "type": "path",
        "required": true,
        "description": "Search scope (work, person, place, concept)"
      },
      {
        "name": "q",
        "type": "query", 
        "required": false,
        "description": "Search query string"
      }
    ],
    "handlerName": "handleSearch",
    "middleware": ["authenticate", "validateScope"]
  }
}
```

#### Test Data Provider System

The framework includes a simplified test data provider system where each provider is specific to a single data source:

**Provider Interface (`test-data-providers/interface.js`):**
- Abstract `TestDataProvider` base class with simplified methods
- `TestDataProviderFactory` for instantiating all registered providers
- Each provider implementation is specific to one data source

**Available Providers:**
- **SampleTestDataProvider** (`test-data-providers/sample-provider.js`): Generates synthetic test data with configurable options
- **CsvTestDataProvider** (`test-data-providers/csv-provider.js`): Reads test data from `test-data/endpoint-tests.csv`
- **Extensible**: New providers can be easily added for specific data sources (JSON files, databases, APIs, etc.)

**Provider System:**
1. Each provider is registered with the `TestDataProviderFactory`
2. All registered providers are instantiated when generating tests
3. Each provider extracts test data for every endpoint
4. Data from all providers is combined into comprehensive test files
5. Provider ID is tracked in each test case for full traceability

**Provider Implementation:**
Each provider implements key methods:
- `getProviderId()`: Returns unique identifier for test traceability
- `extractTestData(apiDef, endpointKey, columns)`: Extracts test data for a specific endpoint
- Graceful error handling - returns empty arrays instead of throwing errors

**Benefits:**
- **Simple**: Each provider handles exactly one data source
- **Traceable**: Every test case includes its provider ID for debugging
- **Robust**: Providers fail gracefully without breaking the system
- **Extensible**: Adding new data sources requires only creating a new provider class
- **Ready-to-run**: Generated files contain actual test cases from all available sources

### Test File Generation with Multi-Source Data Providers

The `create-tests.js` script uses registered test data providers (implementations of the TestDataProvider class) and the generated `endpoints-spec.json` file to create endpoint-specific spreadsheets of tests.

- **Individual files**: Separate Excel file for each discovered endpoint with ready-to-run test cases
- **Parameter columns**: Dedicated columns for each endpoint's specific parameters
- **Required field highlighting**: Visual indicators for required parameters
- **Multi-source data**: Automatically discovers and uses ALL available test data providers
- **Documentation sheets**: Embedded help and parameter descriptions

**Usage:**
```bash
npm run create:tests
# or
node create-tests.js
```

### Shared Utilities

The framework includes shared utility functions in `utils.js` that provide consistent endpoint key generation and parameter handling across all tools. This ensures that endpoint naming and parameter processing is standardized across specification generation, test configuration creation, and test execution.

## Response Body Saving

The framework includes an option to save all HTTP response bodies to disk for detailed analysis, debugging, and archival purposes.

### Enable Response Body Saving

**Using npm scripts:**
```bash
npm run test:save
```

**Using command line flag:**
```bash
node run-tests.js ./configs ./reports --save-responses
```

**Using short flag:**
```bash
node run-tests.js ./configs ./reports -r
```

### Response File Organization

When response body saving is enabled, each test execution creates its own timestamped subdirectory with endpoint-specific subdirectories for response bodies:

```
reports/
└── test-run-2025-08-20_14-30-15/
    ├── endpoint-test-report.json
    ├── endpoint-test-report.csv
    ├── endpoint-test-report.html
    └── responses/                   # Only created when --save-responses is used
        ├── get-search/              # Subdirectory for get-search.xlsx tests
        │   ├── row_001_basicSearch.json
        │   ├── row_002_advancedSearch.json
        │   └── ...
        ├── get-facets/              # Subdirectory for get-facets.xlsx tests
        │   ├── row_001_agentStartDate.json
        │   └── ...
        ├── post-document-create/    # Subdirectory for post-document-create.xlsx tests
        │   ├── row_001_create.json
        │   └── ...
        └── ...                      # One subdirectory per test configuration file
└── test-run-2025-08-20_15-45-20/    # Next test execution
    ├── endpoint-test-report.json
    ├── endpoint-test-report.csv
    ├── endpoint-test-report.html
    └── responses/
        ├── get-search/
        └── ...
```

**Benefits of this structure:**
- **Complete Isolation**: Each test run is fully self-contained
- **Endpoint Organization**: Response files grouped by spreadsheet
- **Easy Navigation**: Quickly find responses for specific test
- **No Conflicts**: No filename conflicts between test runs *when using the same versions of the spreadsheets*\*
- **Selective Storage**: Response bodies only created when explicitly requested
- **Comparison**: In addition to the [report-level comparison feature](#comparison-features), a directory comparison of the response bodies of two runs may be performed
- **Easy Cleanup**: Can delete entire test execution directories or specific endpoint responses

\* We may want to change to test IDs that we do not change once "assigned" to a test.

### Response File Format

Each response file contains complete HTTP response information in JSON format:

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "content-length": "1234",
    "server": "MarkLogic"
  },
  "data": {
    "results": [...],
    "total": 42
  },
  "config": {
    "url": "http://localhost:8003/ds/lux/search.mjs",
    "method": "GET",
    "headers": {...}
  }
}
```

### Use Cases for Response Body Saving

**Debugging:** Compare actual response data when tests fail
**API Documentation:** Generate examples from real response data
**Data Analysis:** Analyze response patterns and data structures
**Regression Testing:** Compare response bodies between API versions
**Performance Analysis:** Examine response size and structure changes
**Compliance:** Archive API responses for audit purposes

### Integration with Reports

When response body saving is enabled, test reports include a `response_body_file` field that references the saved response file:

**JSON Report:**
```json
{
  "test_name": "search_basic",
  "status": "PASS",
  "response_body_file": "search_basic_2025-08-20_14-30-15.json",
  ...
}
```

**HTML Report:**
The HTML report includes a "Response File" column showing the filename for easy reference.

**CSV Report:**
The CSV includes the response file name for programmatic processing.

## Configuration

### Environment Variables

The framework uses the following environment variables:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `BASE_URL` | Base URL for the MarkLogic API | `http://localhost:8003` | `https://api.lux.yale.edu` |
| `AUTH_TYPE` | Authentication type | `digest` | `digest`, `oauth`, `none` |
| `AUTH_USERNAME` | Username for digest auth | `null` | `luxuser` |
| `AUTH_PASSWORD` | Password for digest auth | `null` | `luxpassword` |

**Setting Environment Variables:**

**PowerShell:**
```bash
$env:BASE_URL = "http://localhost:8003"
$env:AUTH_TYPE = "digest"
$env:AUTH_USERNAME = "your-username"
$env:AUTH_PASSWORD = "your-password"
```

**Command Prompt:**
```cmd
set BASE_URL=http://localhost:8003
set AUTH_TYPE=digest
set AUTH_USERNAME=your-username
set AUTH_PASSWORD=your-password
```

**Linux/macOS:**
```bash
export BASE_URL="http://localhost:8003"
export AUTH_TYPE="digest"
export AUTH_USERNAME="your-username"
export AUTH_PASSWORD="your-password"
```

### Test Configuration Spreadsheet

The endpoint-specific configuration files are automatically generated based on the `endpoints-spec.json` and contain columns tailored to each endpoint's specific parameters.

#### Standard Columns (All Endpoint Types)

| Column | Description | Example | Required |
|--------|-------------|---------|----------|
| `test_name` | Unique test identifier | "Search - Basic Query" | Yes |
| `description` | Test description | "Basic search functionality" | No |
| `enabled` | Whether to run this test | true, false | Yes |
| `expected_status` | Expected HTTP status code | 200, 404, 401 | Yes |
| `timeout_ms` | Request timeout in milliseconds | 10000 | No |
| `max_response_time` | Max acceptable response time | 3000 | No |
| `delay_after_ms` | Delay after test completion | 500 | No |
| `tags` | Comma-separated tags | "search,functional,smoke" | No |
| `provider_id` | Data source identifier | "sample-provider", "csv-provider:tests.csv" | Yes |

#### Parameter Columns (Dynamically Generated)

Each endpoint gets its own Excel file with parameter columns specific to that endpoint's requirements, automatically discovered from your Express.js application:

**Example for `/api/search/:scope` endpoint:**
- `param:scope` - Search scope (work, person, place, etc.) - **Required**
- `param:q` - Search query string
- `param:page` - Page number  
- `param:pageLength` - Results per page
- `param:sort` - Sort order

**Example for `/api/related-list/:id/:name` endpoint:**
- `param:id` - Record ID - **Required**
- `param:name` - Relationship name - **Required**
- `param:page` - Page number
- `param:pageLength` - Results per page

**Visual Indicators:**
- Required parameters are highlighted in yellow
- Optional parameters use standard formatting
- Each Excel file includes a documentation sheet explaining the endpoint's purpose and parameters

## Authentication Configuration

Authentication is configured globally using environment variables and applies to all tests. The framework supports digest authentication by default, with the ability to configure different authentication types for future OAuth support.

```bash
# Digest authentication (default)
$env:AUTH_TYPE = "digest"
$env:AUTH_USERNAME = "your-username"
$env:AUTH_PASSWORD = "your-password"
```

## Sample Test Configurations

### Basic GET Request
```csv
test_name,method,endpoint,headers,expected_status,enabled
"Health Check",GET,"/","Authorization: Basic bHV4LWVuZHBvaW50LWNvbnN1bWVyOmVuZHBvaW50",200,true
```

### POST Request with JSON Body
```csv
test_name,method,endpoint,headers,body,body_type,expected_status,enabled
"Advanced Search",POST,"/ds/lux/search.mjs","Authorization: Basic xyz; Content-Type: application/json","{\"q\": \"mona lisa\", \"scope\": \"work\"}",raw,200,true
```

### Form Data POST
```csv
test_name,method,endpoint,headers,body,body_type,expected_status,enabled
"Create Document",POST,"/ds/lux/document/create.mjs","Authorization: Basic xyz; Content-Type: multipart/form-data","unitName=ypm&doc={\"type\": \"Test\"}",formdata,200,true
```

### Negative Test Cases
```csv
test_name,method,endpoint,headers,expected_status,enabled
"Unauthorized Test",GET,"/ds/lux/search.mjs","",401,true
"Not Found Test",GET,"/ds/lux/nonexistent.mjs","Authorization: Basic xyz",404,true
```

## Reports

The framework generates three types of reports:

### 1. JSON Report
Detailed machine-readable results with full test data and summary statistics.

### 2. CSV Report  
Tabular format suitable for import into Excel or other analysis tools.

### 3. HTML Report
Human-readable report with:
- Test summary statistics
- Color-coded results (green=pass, red=fail, yellow=error)
- Response time analysis
- Individual test details

## Report Comparison Tool

The framework includes a powerful report comparison tool that helps you identify changes, regressions, and performance differences between test runs.

### Using the Comparison Tool

```bash
npm run compare
```

The tool will prompt you to:
1. Select the first report file (baseline)
2. Select the second report file (comparison target)
3. Choose output formats (JSON, HTML, console)

### Comparison Features

**Regression Detection:**
- Identifies tests that were passing but now fail
- Highlights new failures with detailed error information
- Shows tests that have been fixed (previously failing, now passing)

**Performance Analysis:**
- Compares response times between runs
- Identifies performance regressions (slower responses)
- Shows performance improvements
- Calculates statistical differences in response times

**Status Code Changes:**
- Detects when tests return different status codes
- Identifies unexpected status code changes
- Helps track API behavior changes over time

**New and Missing Tests:**
- Shows tests present in one report but not the other
- Helps track test suite evolution
- Identifies removed or renamed tests

### Sample Comparison Output

**Console Output:**
```
📊 COMPARISON SUMMARY
=====================
✅ Total Tests Compared: 45
🔴 Regressions Found: 2
🟡 Status Code Changes: 1
⚡ Performance Changes: 3
📈 New Tests: 0
📉 Missing Tests: 1

🔴 REGRESSIONS:
- get-search-basic: Was passing, now failing
  Error: Request timeout after 10000ms
  
- post-document-create: Status changed from 200 to 500
  Error: Internal server error

⚡ PERFORMANCE CHANGES:
- get-facets: Response time increased from 245ms to 1,200ms (+955ms)
- get-search-advanced: Response time improved from 1,800ms to 650ms (-1,150ms)
```

**HTML Report:**
The tool generates a comprehensive HTML report with:
- Color-coded comparison tables
- Interactive filtering and sorting
- Response time charts and graphs  
- Detailed error information
- Export capabilities for further analysis

**JSON Report:**
Machine-readable format for integration with other tools:
```json
{
  "summary": {
    "totalTests": 45,
    "regressions": 2,
    "statusChanges": 1,
    "performanceChanges": 3,
    "newTests": 0,
    "missingTests": 1
  },
  "regressions": [
    {
      "testName": "get-search-basic",
      "baseline": { "status": "pass", "responseTime": 245 },
      "comparison": { "status": "fail", "error": "Timeout" }
    }
  ],
  "performanceChanges": [...]
}
```

## Extending the Data Provider System

The framework's simplified data provider system makes it easy to add new data sources for test case generation. Each provider is specific to a single data source.

### How to Add New Providers

Adding a new data source is straightforward - each provider implementation is specific to a single source file or data source.

#### Step 1: Create a New Provider Class

Create a new provider class extending `TestDataProvider`. Each provider should be specific to one data source:

```javascript
// test-data-providers/json-provider.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TestDataProvider } from './interface.js';

/**
 * JSON Test Data Provider
 * 
 * Reads test cases from a specific JSON file: test-data/endpoint-tests.json
 * Each provider implementation should be specific to a single file
 */
export class JsonTestDataProvider extends TestDataProvider {
  /**
   * Constructor
   * @param {Object} options - Options for JSON parsing
   */
  constructor(options = {}) {
    super({
      encoding: 'utf8',
      ...options
    });
    
    // This provider is specific to this JSON file
    this.sourcePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../test-data/endpoint-tests.json');
  }

  /**
   * Get a unique identifier for this provider instance
   * @returns {string} - Provider ID for tracing tests
   */
  getProviderId() {
    return `json-provider:${path.basename(this.sourcePath)}`;
  }

  /**
   * Parse JSON file and extract test cases
   * @param {Object} apiDef - API definition object
   * @param {string} endpointKey - Unique endpoint key
   * @param {Array<string>} columns - Expected column structure
   * @returns {Promise<Array<Array>>} - Array of test data rows
   */
  async extractTestData(apiDef, endpointKey, columns) {
    try {
      // Check if file exists
      if (!fs.existsSync(this.sourcePath)) {
        console.log(`JSON file not found: ${this.sourcePath} - skipping JSON provider`);
        return [];
      }

      const jsonData = JSON.parse(fs.readFileSync(this.sourcePath, 'utf8'));
      
      // Find tests for this specific endpoint
      const endpointTests = jsonData[endpointKey] || [];
      
      if (endpointTests.length === 0) {
        console.log(`No test data found for ${endpointKey} in JSON file`);
        return [];
      }

      // Convert JSON objects to row arrays matching the column structure
      const testRows = endpointTests.map(testCase => {
        return columns.map(columnName => {
          // Map test case properties to columns
          if (columnName === 'test_name') return testCase.name || '';
          if (columnName === 'description') return testCase.description || '';
          if (columnName === 'enabled') return testCase.enabled !== false ? 'true' : 'false';
          if (columnName === 'expected_status') return testCase.expectedStatus || 200;
          if (columnName === 'timeout_ms') return testCase.timeout || 10000;
          if (columnName === 'max_response_time') return testCase.maxResponseTime || 3000;
          if (columnName === 'delay_after_ms') return testCase.delayAfter || 500;
          if (columnName === 'tags') return testCase.tags || `${endpointKey},json`;
          if (columnName.startsWith('param:')) {
            const paramName = columnName.replace('param:', '');
            return testCase.params ? testCase.params[paramName] || '' : '';
          }
          return ''; // Default for unknown columns
        });
      });

      console.log(`✓ Loaded ${testRows.length} test cases from JSON: ${path.basename(this.sourcePath)}`);
      return testRows;

    } catch (error) {
      console.error(`Error reading JSON file ${this.sourcePath}:`, error.message);
      return []; // Return empty array on error to not break other providers
    }
  }
}
```

#### Step 2: Register the New Provider

Add your new provider to `test-data-providers/index.js`:

```javascript
// test-data-providers/index.js
import { TestDataProvider, TestDataProviderFactory, TestCaseStructure } from './interface.js';
import { CsvTestDataProvider } from './csv-provider.js';
import { SampleTestDataProvider } from './sample-provider.js';
import { JsonTestDataProvider } from './json-provider.js';  // Add your new provider

// Register all available providers
TestDataProviderFactory.registerProvider(CsvTestDataProvider);
TestDataProviderFactory.registerProvider(SampleTestDataProvider);
TestDataProviderFactory.registerProvider(JsonTestDataProvider);  // Register your new provider

// ... rest of the file
```

#### Step 3: Create Your Data Source File

Create the data source file that your provider expects:

```javascript
// test-data/endpoint-tests.json
{
  "get-search": [
    {
      "name": "Basic Search Test",
      "description": "Test basic search functionality from JSON",
      "enabled": true,
      "expectedStatus": 200,
      "timeout": 10000,
      "maxResponseTime": 3000,
      "delayAfter": 500,
      "tags": "json,functional,search",
      "params": {
        "q": "test query",
        "scope": "work"
      }
    },
    {
      "name": "Advanced Search Test",
      "description": "Test complex search from JSON",
      "enabled": true,
      "expectedStatus": 200,
      "timeout": 15000,
      "maxResponseTime": 5000,
      "delayAfter": 1000,
      "tags": "json,advanced,search",
      "params": {
        "q": "complex query",
        "scope": "person",
        "page": "1",
        "pageLength": "20"
      }
    }
  ],
  "get-facets": [
    {
      "name": "Facets Test",
      "description": "Test facets endpoint from JSON",
      "enabled": true,
      "expectedStatus": 200,
      "params": {
        "scope": "work"
      }
    }
  ]
}
```

#### Step 4: Test Your Provider

Run the test generation script to verify your provider works:

```bash
npm run create:tests
```

Your new provider will be automatically discovered and used. You'll see output like:

```
Creating all TestDataProvider instances...
Created 3 provider instances:
  - sample-provider
  - csv-provider:endpoint-tests.csv
  - json-provider:endpoint-tests.json

Creating test file for get-search: get-search-tests.xlsx
Collecting test data from 3 providers for get-search...
  - Trying provider: SampleTestDataProvider
    ✓ Got 2 test cases from SampleTestDataProvider
  - Trying provider: CsvTestDataProvider
    CSV file not found: .../test-data/endpoint-tests.csv - skipping CSV provider
    - No data from CsvTestDataProvider
  - Trying provider: JsonTestDataProvider
    ✓ Got 2 test cases from JsonTestDataProvider
Total test cases collected: 4
✓ Created get-search-tests.xlsx with 4 test cases
```

### Provider Design Principles

- **Single Responsibility**: Each provider is specific to exactly one data source
- **No Configuration**: Providers know their own data source paths internally
- **Graceful Failure**: Return empty arrays instead of throwing errors to avoid breaking other providers
- **Clear Identification**: Provide meaningful provider IDs for test traceability
- **Self-Contained**: Each provider handles its own file format and data structure

### Automated Test Generation vs Manual Customization

The framework now operates with a fully automated approach:

1. **Automated Test Generation** (`create-tests.js`): Automatically creates comprehensive test files with ready-to-run test cases from all available data sources
2. **Manual Customization** (optional): Do not add tests within the generated spreadsheets.  Instead, add to one of the existing TestDataProvider's source files or implement a new TestDataProvider and add to its source file.

The generated Excel files contain complete, ready-to-execute test cases and are overwritten the next time create-tests.js is run (inclusive of `npm run test:*`).

## Advanced Usage

### Running Specific Test Suites

Filter tests by tags:
```javascript
// In your test runner, filter by tags
const testConfigs = this.loadTestConfig()
  .filter(test => test.tags && test.tags.includes('smoke'));
```

### Performance Testing

Configure performance thresholds:
```csv
test_name,max_response_time,timeout_ms,tags
"Performance Test",1000,5000,"performance,load"
```

### Custom Authentication

Support for different authentication methods:
```csv
headers
"Authorization: Bearer jwt-token-here"
"X-API-Key: your-api-key"
"Authorization: Basic base64-encoded-credentials"
```

### Parallel Execution

Tests run sequentially by default for consistent results and easier debugging.

## Integration with Existing Tools

### CI/CD Integration

Example GitHub Actions workflow:
```yaml
- name: Run Endpoint Tests
  run: |
    cd test/endpoints
    npm install
    npm run create:spec
    npm run create:tests  
    npm test
    
- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: endpoint-reports
    path: test/endpoints/reports/
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**: 
   - Verify credentials in environment configuration
   - Check Base64 encoding for Basic auth
   - Ensure service accounts have proper permissions

2. **Timeout Issues**:
   - Increase `timeout_ms` for slow endpoints
   - Check network connectivity
   - Monitor MarkLogic server performance

3. **SSL/TLS Issues**:
   - For local testing, you may need to set `NODE_TLS_REJECT_UNAUTHORIZED=0`
   - Verify certificate configurations

### Debug Mode

Enable verbose logging:
```bash
$env:DEBUG = "true"
npm test
```

Or set environment variable:
```bash
$env:DEBUG = "true"
npm test
```

## Best Practices

1. **Test Organization**: Use tags to group related tests (smoke, functional, performance)
2. **Environment Management**: Maintain separate configurations for each environment
3. **Data Management**: Use realistic test data that doesn't impact production
4. **Error Handling**: Include negative test cases to verify error responses
5. **Performance Monitoring**: Set appropriate response time thresholds
6. **Documentation**: Keep test descriptions up-to-date and meaningful

## Sample Files

The framework includes several key files:

### Core Scripts
- `create-endpoints-spec.js` - Analyzes Express.js app to discover endpoints and generate specifications
- `create-tests.js` - Generates endpoint-specific Excel test files with automatic data provider discovery
- `run-tests.js` - Main test execution engine
- `compare-reports.js` - Interactive tool for comparing test reports between runs
- `utils.js` - Shared utility functions for consistent endpoint key generation
- `package.json` - Node.js dependencies and npm scripts

### Data Provider System
- `test-data-providers/interface.js` - Abstract base class and factory for all data providers
- `test-data-providers/sample-provider.js` - Synthetic test data generation with configurable options
- `test-data-providers/csv-provider.js` - CSV file reader with flexible column mapping and validation
- `test-data-providers/index.js` - Central exports for all provider classes

### Generated Files
- `endpoints-spec.json` - Detailed endpoint specifications (generated by `create-endpoints-spec.js`)
- `configs/*.xlsx` - Individual Excel test files for each discovered endpoint (generated by `create-tests.js`)
- `test-data-providers/` - Modular data provider system for flexible test data sources

### Configuration Structure
```
test/endpoints/
├── create-endpoints-spec.js     # Endpoint discovery script
├── create-tests.js             # Test file generator with auto-discovery
├── run-tests.js                 # Test runner
├── endpoints-spec.json          # Generated API specification
├── test-data-providers/         # Test data provider system
│   ├── interface.js            # Abstract base class and factory
│   ├── sample-provider.js      # Synthetic test data generator
│   ├── csv-provider.js         # CSV file data reader
│   └── index.js               # Provider exports
├── configs/                     # Generated Excel test files
│   ├── get-search.xlsx         # Search endpoint test cases
│   ├── get-facets.xlsx         # Facets endpoint test cases
│   ├── post-document-create.xlsx # Document creation test cases
│   └── ...                     # One file per discovered endpoint
└── reports/                     # Generated test reports
    ├── results.json
    ├── results.csv
    └── results.html
```

## Dependencies

- Node.js 16+ 
- axios (HTTP client)
- xlsx (Excel file processing)
- csv-parser (CSV processing)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the generated HTML reports for detailed error information
3. Check MarkLogic server logs for backend issues
4. Verify network connectivity and authentication

## License

This testing framework is part of the LUX project and follows the same licensing terms.
