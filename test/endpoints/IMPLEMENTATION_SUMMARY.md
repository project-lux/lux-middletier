# Test Data Provider Interface Implementation

## Overview

I have successfully implemented a flexible test data provider interface that replaces the hardcoded `generateSampleData` function in `create-tests.js`. This new system allows importing test cases from various sources including CSV files, with easy extensibility for additional formats.

## Files Created

### 1. Core Interface (`test-data-providers/interface.js`)
- **`TestDataProvider`**: Abstract base class that all providers must extend
- **`TestDataProviderFactory`**: Factory pattern for creating appropriate providers
- **`TestCaseStructure`**: Defines expected test case structure

### 2. CSV Provider (`test-data-providers/csv-provider.js`)
- Reads test cases from CSV files
- Supports flexible column naming conventions
- Handles data type conversion and validation
- Provides fallback to sample data on errors

### 3. Sample Data Provider (`test-data-providers/sample-provider.js`)
- Maintains original sample data generation functionality
- Configurable test case count and error case inclusion
- Used as default when no external data source is specified

### 4. Main Module (`test-data-providers/index.js`)
- Exports convenience functions and registers all providers
- Provides `generateTestData()` function as main entry point
- Handles provider selection and error fallback

### 5. Documentation (`test-data-providers/README.md`)
- Comprehensive usage guide
- Examples and configuration options
- Instructions for creating custom providers

### 6. Sample CSV File (`sample-search-tests.csv`)
- Example CSV file demonstrating proper format
- Shows parameter columns and data types

## Key Changes to `create-tests.js`

### Updated Imports
```javascript
import { generateTestData } from './test-data-providers/index.js';
```

### Modified Function Signature
```javascript
async function createEndpointSpecificTests(Test, options = {})
async function createTestForAPI(apiDef, endpointKey, Test, options = {})
```

### New Data Generation Call
```javascript
const sampleData = await generateTestData(dataSource, apiDef, endpointKey, columns, providerOptions);
```

### Command Line Arguments Support
```bash
node create-tests.js --data-source=./test-data.csv --test-count=5 --include-errors=false
```

## Interface Contract

### TestDataProvider Methods

1. **`static canHandle(sourcePath)`**: Determines if provider can handle source
2. **`async extractTestData(apiDef, endpointKey, columns)`**: Extracts test data
3. **`validateTestData(testData, columns)`**: Validates extracted data
4. **`getSourceMetadata()`**: Returns metadata about the source

### Data Format

Test data is returned as an array of arrays, where each inner array represents a test case with values corresponding to the column structure:

```javascript
[
  ["test_name", "description", "enabled", "expected_status", ...],
  ["Search Basic", "Basic search test", "true", "200", ...],
  ["Search Error", "Error test case", "true", "400", ...]
]
```

## Usage Examples

### Default Sample Data
```bash
npm run create:tests
```

### CSV Data Source
```bash
npm run create:tests -- --data-source=./my-tests.csv
```

### Configuration Options
```bash
npm run create:tests -- --test-count=5 --include-errors=false --fallback=true
```

## CSV File Format

CSV files should contain columns matching the tests structure:

```csv
test_name,description,enabled,expected_status,param:scope,param:q
"Search Basic","Basic search",true,200,"work","test query"
"Search Error","Error case",true,400,"invalid","bad query"
```

### Column Naming Flexibility

The CSV provider supports multiple naming conventions:
- `param:scope` (standard format)
- `param_scope` (underscore format)  
- `scope` (direct parameter name)

## Benefits

1. **Flexibility**: Easy to import test cases from various sources
2. **Extensibility**: Simple to add new data providers (JSON, Excel, databases)
3. **Backward Compatibility**: Default behavior unchanged when no data source specified
4. **Error Handling**: Robust fallback mechanisms
5. **Validation**: Built-in data validation and type conversion
6. **Documentation**: Comprehensive documentation and examples

## Future Extensions

The interface is designed to easily support additional providers:
- JSON file provider
- Excel/XLSX provider
- Database connectivity  
- REST API data sources
- Log file parsers

Each new provider only needs to implement the `TestDataProvider` interface and register with the factory.

## Testing

All files have been validated for syntax errors using VS Code's error checking. The implementation maintains the existing functionality while adding the new flexible interface.

To test the implementation:
1. Use default sample data: `npm run create:tests`
2. Use CSV data: `npm run create:tests -- --data-source=./sample-search-tests.csv`
3. Check generated Excel files in the `configs/` directory
