# Test Data Providers

This module provides a flexible interface for importing test data from various sources when generating Excel templates for endpoint testing.

## Overview

The test data provider system allows you to import test cases from:
- CSV files
- JSON files (coming soon)
- Excel spreadsheets (coming soon)
- Log files (coming soon)
- Generated sample data (default)

## Architecture

### Core Interface

- **`TestDataProvider`**: Abstract base class that all providers must extend
- **`TestDataProviderFactory`**: Factory for creating appropriate providers
- **`TestCaseStructure`**: Defines the expected test case structure

### Available Providers

1. **`SampleTestDataProvider`**: Generates sample test data (default behavior)
2. **`CsvTestDataProvider`**: Reads test cases from CSV files

## Usage

### Basic Usage with Sample Data (Default)

```bash
# Generates sample data for all endpoints
node create-templates.js
```

### Using CSV Data Source

```bash
# Use a single CSV file for all endpoints
node create-templates.js --data-source=./test-data.csv

# Configure test generation
node create-templates.js --test-count=5 --include-errors=false
```

### CSV File Format

Your CSV file should contain columns matching the template structure:

```csv
test_name,description,enabled,expected_status,timeout_ms,max_response_time,delay_after_ms,tags,param:scope,param:q
"Search Basic","Basic search test",true,200,10000,3000,500,"search,functional","work","test query"
"Search Error","Error test case",true,400,5000,2000,500,"search,validation","invalid","bad query"
```

#### Required Columns

- `test_name`: Unique test identifier
- `enabled`: Whether to run this test (true/false)  
- `expected_status`: Expected HTTP status code

#### Optional Columns

- `description`: Test description
- `timeout_ms`: Request timeout in milliseconds
- `max_response_time`: Maximum acceptable response time
- `delay_after_ms`: Delay after test completion
- `tags`: Comma-separated tags for filtering

#### Parameter Columns

- `param:paramName`: For each endpoint parameter, use format `param:paramName`
- Example: `param:scope`, `param:q`, `param:page`

### Column Name Flexibility

The CSV provider supports multiple column naming conventions:

```csv
# Standard format
param:scope,param:q

# Underscore format  
param_scope,param_q

# Direct parameter names (for simple cases)
scope,q
```

## Creating Custom Providers

To create a new test data provider:

1. Extend the `TestDataProvider` class
2. Implement required methods:
   - `static canHandle(sourcePath)`: Check if provider can handle the source
   - `async extractTestData(apiDef, endpointKey, columns)`: Extract test data
3. Register the provider with the factory

### Example Custom Provider

```javascript
import { TestDataProvider } from './interface.js';

export class JsonTestDataProvider extends TestDataProvider {
  static canHandle(sourcePath) {
    return sourcePath && sourcePath.endsWith('.json');
  }

  async extractTestData(apiDef, endpointKey, columns) {
    // Read and parse JSON file
    // Transform to expected row format
    // Return array of arrays matching columns
  }
}

// Register with factory
TestDataProviderFactory.registerProvider(JsonTestDataProvider);
```

## Configuration Options

### Provider Options

```javascript
const options = {
  // Data source configuration
  dataSource: './test-data.csv',
  
  // Sample data generation options
  testCaseCount: 3,
  includeErrorCases: true,
  fallbackToSample: true,
  
  // Provider-specific options
  providerOptions: {
    separator: ',',
    encoding: 'utf8',
    strictValidation: false
  }
};
```

### CSV Provider Options

- `separator`: CSV delimiter (default: ',')
- `encoding`: File encoding (default: 'utf8')
- `skipErrorLines`: Skip malformed CSV lines
- `strictValidation`: Fail on validation errors
- `fallbackToSample`: Use sample data if CSV fails

## Error Handling

The system provides robust error handling:

1. **File Not Found**: Falls back to sample data if `fallbackToSample` is true
2. **Invalid Format**: Logs warnings and continues with valid rows
3. **Validation Errors**: Reports issues but continues unless `strictValidation` is enabled

## Examples

### Sample CSV Files

See `sample-search-tests.csv` for an example CSV file with search endpoint test cases.

### Command Line Usage

```bash
# Basic usage with sample data
node create-templates.js

# Use CSV data source
node create-templates.js --data-source=./my-tests.csv

# Generate more test cases with sample data
node create-templates.js --test-count=5

# Disable error test cases
node create-templates.js --include-errors=false

# Combine options
node create-templates.js --data-source=./tests.csv --fallback=true
```

## Future Enhancements

- JSON file provider
- Excel file provider  
- Log file parser
- Database connectivity
- REST API data source
- Template-based generation
- Test case inheritance
