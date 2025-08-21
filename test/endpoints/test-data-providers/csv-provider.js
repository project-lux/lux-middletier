import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import { TestDataProvider } from './interface.js';

/**
 * CSV Test Data Provider
 * 
 * Reads test cases from a specific CSV file: test-data/endpoint-tests.csv
 * Each CSV provider implementation should be specific to a single file
 */
export class CsvTestDataProvider extends TestDataProvider {
  /**
   * Constructor
   * @param {Object} options - Options for CSV parsing
   */
  constructor(options = {}) {
    super({
      separator: ',',
      encoding: 'utf8',
      headers: true,
      skipErrorLines: false,
      strictValidation: false,
      fallbackToSample: true,
      ...options
    });
    
    // This provider is specific to this CSV file
    this.sourcePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../test-data/endpoint-tests.csv');
  }

  /**
   * Get a unique identifier for this provider instance
   * @returns {string} - Provider ID for tracing tests
   */
  getProviderId() {
    return `csv-provider:${path.basename(this.sourcePath)}`;
  }

  /**
   * Parse CSV file and extract test cases
   * @param {Object} apiDef - API definition object
   * @param {string} endpointKey - Unique endpoint key
   * @param {Array<string>} columns - Expected column structure
   * @returns {Promise<Array<Array>>} - Array of test data rows
   */
  async extractTestData(apiDef, endpointKey, columns) {
    try {
      // Check if file exists
      if (!fs.existsSync(this.sourcePath)) {
        console.log(`CSV file not found: ${this.sourcePath} - skipping CSV provider`);
        return [];
      }

      const csvData = await this.parseCsvFile();
      
      if (csvData.length === 0) {
        console.warn(`Warning: No test data found in CSV file: ${this.sourcePath}`);
        return [];
      }

      // Convert CSV objects to row arrays matching the column structure
      const testRows = csvData.map((record, index) => {
        const row = columns.map(columnName => {
          // Handle different column name formats
          const value = this.getColumnValue(record, columnName);
          return this.formatValue(value, columnName);
        });
        return row;
      });

      // Validate the extracted data
      const validation = this.validateTestData(testRows, columns);
      if (!validation.isValid) {
        console.warn(`Warning: CSV data validation issues:`, validation.errors);
        if (this.options.strictValidation) {
          throw new Error(`CSV validation failed: ${validation.errors.join(', ')}`);
        }
      }

      console.log(`✓ Loaded ${testRows.length} test cases from CSV: ${path.basename(this.sourcePath)}`);
      return testRows;

    } catch (error) {
      console.error(`Error reading CSV file ${this.sourcePath}:`, error.message);
      if (this.options.fallbackToSample) {
        console.log('Falling back to sample data generation...');
        return [];
      }
      throw error;
    }
  }

  /**
   * Parse CSV file using csv-parser
   * @returns {Promise<Array<Object>>} - Array of CSV records as objects
   */
  parseCsvFile() {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = fs.createReadStream(this.sourcePath)
        .pipe(csv({
          // Handle different CSV formats
          separator: this.options.separator || ',',
          skipEmptyLines: true,
          skipLinesWithError: this.options.skipErrorLines || false,
          headers: this.options.headers || true,
        }));

      stream
        .on('data', (data) => {
          // Trim whitespace from all values
          const cleanData = {};
          Object.keys(data).forEach(key => {
            cleanData[key.trim()] = typeof data[key] === 'string' ? data[key].trim() : data[key];
          });
          results.push(cleanData);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Get value from CSV record, handling different column naming conventions
   * @param {Object} record - CSV record object
   * @param {string} columnName - Target column name
   * @returns {*} - Column value or empty string if not found
   */
  getColumnValue(record, columnName) {
    // Direct match
    if (record.hasOwnProperty(columnName)) {
      return record[columnName];
    }

    // Try case-insensitive match
    const lowerColumnName = columnName.toLowerCase();
    const matchingKey = Object.keys(record).find(key => 
      key.toLowerCase() === lowerColumnName
    );
    
    if (matchingKey) {
      return record[matchingKey];
    }

    // Handle parameter columns (param:name -> name or param_name)
    if (columnName.startsWith('param:')) {
      const paramName = columnName.substring(6); // Remove 'param:' prefix
      
      // Try direct parameter name
      if (record.hasOwnProperty(paramName)) {
        return record[paramName];
      }
      
      // Try param_name format
      const underscoreFormat = `param_${paramName}`;
      if (record.hasOwnProperty(underscoreFormat)) {
        return record[underscoreFormat];
      }
      
      // Try parameter name case-insensitive
      const matchingParamKey = Object.keys(record).find(key => 
        key.toLowerCase() === paramName.toLowerCase()
      );
      if (matchingParamKey) {
        return record[matchingParamKey];
      }
    }

    // Return empty string if no match found
    return '';
  }

  /**
   * Format value based on column type
   * @param {*} value - Raw value from CSV
   * @param {string} columnName - Column name for context
   * @returns {*} - Formatted value
   */
  formatValue(value, columnName) {
    // Handle empty values
    if (value === null || value === undefined || value === '') {
      return '';
    }

    // Convert string representation to appropriate type
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      
      // Boolean values
      if (columnName === 'enabled') {
        if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
          return 'true';
        } else if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
          return 'false';
        }
      }
      
      // Numeric values
      if (['expected_status', 'timeout_ms', 'max_response_time', 'delay_after_ms'].includes(columnName)) {
        const numValue = parseInt(value, 10);
        return isNaN(numValue) ? value : numValue.toString();
      }
    }

    return value;
  }

  /**
   * Get metadata about the CSV source
   * @returns {Object} - Metadata object
   */
  getSourceMetadata() {
    const baseMetadata = super.getSourceMetadata();
    
    try {
      const stats = fs.statSync(this.sourcePath);
      return {
        ...baseMetadata,
        lastModified: stats.mtime,
        fileSize: stats.size,
        encoding: this.options.encoding || 'utf8',
        separator: this.options.separator || ',',
      };
    } catch (error) {
      return baseMetadata;
    }
  }
}

/**
 * Default options for CSV provider
 */
export const CsvProviderDefaults = {
  separator: ',',
  encoding: 'utf8',
  headers: true,
  skipErrorLines: false,
  strictValidation: false,
  fallbackToSample: true,
};
