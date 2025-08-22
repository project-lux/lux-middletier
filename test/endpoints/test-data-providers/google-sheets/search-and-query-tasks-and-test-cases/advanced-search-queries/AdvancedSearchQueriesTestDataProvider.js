import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import { TestDataProvider } from '../../../interface.js';
import { ENDPOINT_KEYS } from '../../../../constants.js';
import { parseUrlQueryString, isValidSearchUrl } from '../../../../utils.js';

export class AdvancedSearchQueriesTestDataProvider extends TestDataProvider {
  /**
   * Constructor
   * @param {Object} options - Options for TSV parsing
   */
  constructor(options = {}) {
    super({
      separator: '\t',  // Tab-delimited data
      encoding: 'utf8',
      headers: true,
      skipErrorLines: false,
      strictValidation: false,
      fallbackToSample: true,
      ...options
    });
    
    // This provider is specific to this TSV file
    this.sourcePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'data.tsv');

    // Updated in parseTsvFile
    this.headerRowIndex = 0;
  }

  /**
   * Parse TSV file and extract test cases
   * @param {Object} apiDef - API definition object
   * @param {string} endpointKey - Unique endpoint key
   * @param {Array<string>} columns - Expected column structure
   * @returns {Promise<Array<Array>>} - Array of test data rows
   */
  async extractTestData(apiDef, endpointKey, columns) {
    try {
      if (endpointKey !== ENDPOINT_KEYS.GET_SEARCH) {
        console.log(`Skipping ${endpointKey} - this provider only supports ${ENDPOINT_KEYS.GET_SEARCH} tests`);
        return [];
      }

      // Check if file exists
      if (!fs.existsSync(this.sourcePath)) {
        console.log(`TSV file not found: ${this.sourcePath} - skipping advanced search queries provider`);
        return [];
      }

      const tsvData = await this.parseTsvFile();
      
      if (tsvData.length === 0) {
        console.warn(`Warning: No test data found in TSV file: ${this.sourcePath}`);
        return [];
      }

      // Filter for rows that have a URL in the Search column and are for get-search-tests
      const searchTestRows = tsvData
        .map((record, index) => ({ 
          ...record, 
          originalIndex: index + 1 + this.headerRowIndex // +1 to make it 1-based
        }))
        .filter(record => {
          // Get the Search column - column names may vary
          const searchUrl = this.getSearchUrlFromRecord(record);
          return searchUrl && searchUrl.trim() && isValidSearchUrl(searchUrl);
        });

      if (searchTestRows.length === 0) {
        console.log(`No valid search URLs found for ${endpointKey} in TSV file`);
        return [];
      }

      // Convert TSV objects to row arrays matching the column structure
      const testRows = searchTestRows.map((record, index) => {
        const searchUrl = this.getSearchUrlFromRecord(record);
        const queryParams = parseUrlQueryString(searchUrl);
        
        const row = columns.map(columnName => {
          // Handle standard test columns
          if (columnName === 'test_name') {
            return `Source row ${record.originalIndex}` || `Test ${index + 1}`;
          } else if (columnName === 'description') {
            return this.getColumnValue(record, 'Research Topic (Graph Query)') || 
                   this.getColumnValue(record, 'Draft query') || 
                   `Search test from source row ${record.originalIndex}`;
          } else if (columnName === 'enabled') {
            return true;
          } else if (columnName === 'expected_status') {
            return 200;
          } else if (columnName === 'timeout_ms') {
            return 30000;
          } else if (columnName === 'max_response_time') {
            return 10000;
          } else if (columnName === 'delay_after_ms') {
            return 1000;
          } else if (columnName === 'tags') {
            return `google-sheets,search`;
          } else if (columnName.startsWith('param:')) {
            // Extract parameter from URL query string
            const paramName = columnName.replace('param:', '');
            return queryParams[paramName] || '';
          } else {
            // Handle other column mappings if needed
            return this.getColumnValue(record, columnName) || '';
          }
        });
        return row;
      });

      // Validate the extracted data
      const validation = this.validateTestData(testRows, columns);
      if (!validation.isValid) {
        console.warn(`Warning: TSV data validation issues:`, validation.errors);
        if (this.options.strictValidation) {
          throw new Error(`TSV validation failed: ${validation.errors.join(', ')}`);
        }
      }

      console.log(`✓ Loaded ${testRows.length} search test cases from TSV: ${path.basename(this.sourcePath)}`);
      return testRows;

    } catch (error) {
      console.error(`Error reading TSV file ${this.sourcePath}:`, error.message);
      if (this.options.fallbackToSample) {
        console.log('Falling back to sample data generation...');
        return [];
      }
      throw error;
    }
  }

  /**
   * Parse TSV file using csv-parser with tab separator
   * @returns {Promise<Array<Object>>} - Array of TSV records as objects
   */
  parseTsvFile() {
    return new Promise((resolve, reject) => {
      const results = [];
      let headers = null;
      let rowIndex = 0;
      
      const stream = fs.createReadStream(this.sourcePath)
        .pipe(csv({
          // Handle tab-delimited format
          separator: this.options.separator || '\t',
          skipEmptyLines: true,
          skipLinesWithError: this.options.skipErrorLines || false,
          headers: false, // We'll handle headers manually to detect the correct header row
        }));

      stream
        .on('data', (data) => {
          rowIndex++;
          
          // If we don't have headers yet, try to detect the header row
          if (!headers) {
            // Look for a row that contains expected column names
            const expectedColumns = ['Research Topic (Graph Query)', 'Draft query', 'Search'];
            const rowValues = Object.values(data).map(val => val ? val.trim() : '');
            
            // Check if this row contains any of our expected column names
            const hasExpectedColumns = expectedColumns.some(col => 
              rowValues.some(val => val && val.includes(col))
            );
            
            if (hasExpectedColumns) {
              headers = rowValues.filter(val => val && val.trim()); // Remove empty headers
              this.headerRowIndex = rowIndex;
              return; // Skip this row as it's the header
            } else {
              // If no expected columns found and we've checked a few rows, use this as headers anyway
              if (rowIndex <= 3) {
                return; // Skip rows that might be metadata or empty
              } else if (rowIndex === 4) {
                // Fallback: use this row as headers if we haven't found them by row 4
                headers = rowValues.filter(val => val && val.trim());
                this.headerRowIndex = rowIndex; // Store as member variable
                console.log(`Using fallback headers from row ${rowIndex}:`, headers);
                return;
              }
            }
          }
          
          // If we have headers, process this as a data row
          if (headers) {
            const cleanData = {};
            const rowValues = Object.values(data);
            
            headers.forEach((header, index) => {
              if (header && rowValues[index] !== undefined) {
                const key = header.trim();
                const value = typeof rowValues[index] === 'string' ? rowValues[index].trim() : rowValues[index];
                cleanData[key] = value;
              }
            });
            
            // Only add rows that have some data
            const hasData = Object.values(cleanData).some(val => val && val.trim());
            if (hasData) {
              results.push(cleanData);
            }
          }
        })
        .on('end', () => {
          if (!headers) {
            console.warn('Warning: Could not detect header row in TSV file');
          }
          console.log(`Parsed ${results.length} data rows from TSV (headers in row ${this.headerRowIndex})`);
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Get the search URL from a TSV record (10th column)
   * @param {Object} record - TSV record object
   * @returns {string} - Search URL or empty string
   */
  getSearchUrlFromRecord(record) {
    // Try different possible column names for the 10th column (Search)
    const searchColumnNames = ['Search', 'search', 'Search URL', 'URL'];
    
    for (const colName of searchColumnNames) {
      if (record.hasOwnProperty(colName) && record[colName]) {
        return record[colName].trim();
      }
    }
    
    // If named columns don't work, try to get the 10th column by position
    // This assumes the columns are in order as they appear in the TSV
    const keys = Object.keys(record);
    if (keys.length >= 10 && keys[9]) { // 9th index = 10th column
      return record[keys[9]]?.trim() || '';
    }
    
    return '';
  }

  /**
   * Get value from TSV record, handling different column naming conventions
   * @param {Object} record - TSV record object
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
   * @param {*} value - Raw value from TSV
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
      // Boolean values
      if (columnName === 'enabled') {
        return value;
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
   * Get metadata about the TSV source
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
        separator: this.options.separator || '\t',
      };
    } catch (error) {
      return baseMetadata;
    }
  }
}

/**
 * Default options for TSV provider
 */
export const TsvProviderDefaults = {
  separator: '\t',
  encoding: 'utf8',
  headers: true,
  skipErrorLines: false,
  strictValidation: false,
  fallbackToSample: true,
};
