import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import { TestDataProvider } from '../../../interface.js';
import { ENDPOINT_KEYS } from '../../../../constants.js';
import { parseUrlQueryString } from '../../../../utils.js';

export class Prd2PrdTestQueriesTestDataProvider extends TestDataProvider {
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
      ...options
    });
    
    // This provider extracts URLs from the second column (TST) of data.tsv
    // - URLs containing "/view/results/" are treated as GET_SEARCH tests
    // - URLs containing "/view/" but not "/view/results/" are treated as GET_DATA tests
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
      // Check if file exists
      if (!fs.existsSync(this.sourcePath)) {
        console.log(`TSV file not found: ${this.sourcePath} - skipping prd2-prd queries provider`);
        return [];
      }

      const tsvData = await this.parseTsvFile();
      
      if (tsvData.length === 0) {
        console.warn(`Warning: No test data found in TSV file: ${this.sourcePath}`);
        return [];
      }

      // Filter for rows that have URLs in the second column (TST) and match the endpoint type
      const relevantRows = tsvData
        .map((record, index) => ({ 
          ...record, 
          // Use the original row number that was stored during parsing
          originalIndex: record.sourceRowNumber || (index + this.headerRowIndex + 1)
        }))
        .filter(record => {
          const url = this.getUrlFromSecondColumn(record);
          if (!url || !url.trim()) {
            return false;
          }

          // Check if URL matches the requested endpoint type
          if (endpointKey === ENDPOINT_KEYS.GET_SEARCH) {
            return url.includes('/view/results/');
          } else if (endpointKey === ENDPOINT_KEYS.GET_DATA) {
            return url.includes('/view/') && !url.includes('/view/results/');
          }
          
          return false;
        });

      if (relevantRows.length === 0) {
        console.log(`No valid URLs found for ${endpointKey} in TSV file`);
        return [];
      }

      // Convert TSV objects to row arrays matching the column structure
      const testRows = relevantRows.map((record, index) => {
        const url = this.getUrlFromSecondColumn(record);
        const queryParams = parseUrlQueryString(url);
        
        // Remove 'sq' parameter for search URLs
        if (endpointKey === ENDPOINT_KEYS.GET_SEARCH && queryParams.sq) {
          delete queryParams.sq;
        }
        
        const row = columns.map(columnName => {
          // Handle standard test columns
          if (columnName === 'test_name') {
            return `Source row ${record.originalIndex}`;
          } else if (columnName === 'description') {
            return `Source row ${record.originalIndex}`;
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
            return `prd2-prd,${endpointKey}`;
          } else if (columnName.startsWith('param:')) {
            // Extract parameter from URL query string or path
            const paramName = columnName.replace('param:', '');
            
            // For GET_DATA endpoints, extract type and uuid from URL path
            if (endpointKey === ENDPOINT_KEYS.GET_DATA) {
              const pathParams = this.extractPathParams(url);
              if (paramName === 'type' && pathParams.type) {
                return pathParams.type;
              } else if (paramName === 'uuid' && pathParams.uuid) {
                return pathParams.uuid;
              }
            }
            
            // For other parameters, use query string
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

      console.log(`✓ Loaded ${testRows.length} test cases for ${endpointKey} from TSV: ${path.basename(this.sourcePath)}`);
      return testRows;

    } catch (error) {
      console.error(`Error reading TSV file ${this.sourcePath}:`, error.message);
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
            // For this specific TSV file, look for the first row that looks like headers
            // The file starts with "Name\tTST\t\t\tNotes" structure
            const rowValues = Object.values(data).map(val => val ? val.trim() : '');
            
            // Check if this looks like the header row (has "Name" and "TST" in first two columns)
            if (rowValues.length >= 2 && rowValues[0] === 'Name' && rowValues[1] === 'TST') {
              headers = rowValues.filter(val => val && val.trim()); // Remove empty headers
              this.headerRowIndex = rowIndex;
              return; // Skip this row as it's the header
            } else if (rowIndex === 1) {
              // If the first row doesn't match expected headers, use it anyway
              headers = rowValues.filter(val => val && val.trim());
              this.headerRowIndex = rowIndex;
              console.log(`Using first row as headers:`, headers);
              return;
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
              // Store the original row number with the data
              cleanData.sourceRowNumber = rowIndex;
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
   * Get the URL from the second column (TST) of the TSV record
   * @param {Object} record - TSV record object
   * @returns {string} - URL from second column or empty string
   */
  getUrlFromSecondColumn(record) {
    // Try different possible column names for the second column (TST)
    const secondColumnNames = ['TST', 'tst', 'URL', 'url'];
    
    for (const colName of secondColumnNames) {
      if (record.hasOwnProperty(colName) && record[colName]) {
        return record[colName].trim();
      }
    }
    
    // If named columns don't work, try to get the second column by position
    // This assumes the columns are in order as they appear in the TSV
    const keys = Object.keys(record);
    if (keys.length >= 2 && keys[1]) { // 1st index = 2nd column
      return record[keys[1]]?.trim() || '';
    }
    
    return '';
  }

  /**
   * Extract type and uuid parameters from /view/{type}/{uuid} URLs
   * @param {string} url - URL to parse
   * @returns {Object} - Object with type and uuid properties
   */
  extractPathParams(url) {
    const params = { type: '', uuid: '' };
    
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(segment => segment);
      
      // Look for /view/{type}/{uuid} pattern
      const viewIndex = pathSegments.findIndex(segment => segment === 'view');
      if (viewIndex !== -1 && pathSegments.length > viewIndex + 2) {
        params.type = pathSegments[viewIndex + 1];
        params.uuid = pathSegments[viewIndex + 2];
      }
    } catch (error) {
      console.warn(`Error parsing URL ${url}:`, error.message);
    }
    
    return params;
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
};
