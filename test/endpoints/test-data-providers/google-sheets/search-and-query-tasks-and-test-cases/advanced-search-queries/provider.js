import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import { TestDataProvider } from '../../../interface.js';

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
  }

  /**
   * Get a unique identifier for this provider instance
   * @returns {string} - Provider ID for tracing tests
   */
  getProviderId() {
    return `google-sheets-search-queries:${path.basename(this.sourcePath)}`;
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
      // This provider only generates tests for get-search endpoint
      if (endpointKey !== 'get-search') {
        console.log(`Skipping ${endpointKey} - this provider only supports get-search tests`);
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

      // Filter for rows that have a URL in the 10th column (Search column) and are for get-search-tests
      const searchTestRows = tsvData
        .map((record, index) => ({ ...record, originalIndex: index + 2 })) // +2 because header is row 1 and data starts at row 2
        .filter(record => {
          // Get the 10th column (Search column) - column names may vary
          const searchUrl = this.getSearchUrlFromRecord(record);
          return searchUrl && searchUrl.trim() && this.isValidSearchUrl(searchUrl);
        });

      if (searchTestRows.length === 0) {
        console.log(`No valid search URLs found for ${endpointKey} in TSV file`);
        return [];
      }

      // Convert TSV objects to row arrays matching the column structure
      const testRows = searchTestRows.map((record, index) => {
        const searchUrl = this.getSearchUrlFromRecord(record);
        const queryParams = this.parseUrlQueryString(searchUrl);
        
        const row = columns.map(columnName => {
          // Handle standard test columns
          if (columnName === 'test_name') {
            return `Search Test ${record.originalIndex}` || `Test ${index + 1}`;
          } else if (columnName === 'description') {
            return this.getColumnValue(record, 'Research Topic (Graph Query)') || 
                   this.getColumnValue(record, 'Draft query') || 
                   `Search test from row ${record.originalIndex}`;
          } else if (columnName === 'enabled') {
            return 'true';
          } else if (columnName === 'expected_status') {
            return 200;
          } else if (columnName === 'timeout_ms') {
            return 15000;
          } else if (columnName === 'max_response_time') {
            return 10000;
          } else if (columnName === 'delay_after_ms') {
            return 1000;
          } else if (columnName === 'tags') {
            return `google-sheets,search,row-${record.originalIndex}`;
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
      const stream = fs.createReadStream(this.sourcePath)
        .pipe(csv({
          // Handle tab-delimited format
          separator: this.options.separator || '\t',
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
   * Check if a URL is a valid LUX search URL
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid search URL
   */
  isValidSearchUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Check if it's a LUX search URL
    return url.includes('lux') && 
           url.includes('results') && 
           (url.includes('?q=') || url.includes('&q='));
  }

  /**
   * Parse URL query string and decode parameters
   * @param {string} url - Full URL with query string
   * @returns {Object} - Decoded query parameters
   */
  parseUrlQueryString(url) {
    try {
      const urlObj = new URL(url);
      const params = {};
      
      // Iterate through all search parameters
      for (const [key, value] of urlObj.searchParams.entries()) {
        if (key === 'q') {
          // Handle the main query parameter - it might be JSON
          try {
            // URL decode first
            const decodedValue = decodeURIComponent(value);
            // Try to parse as JSON
            const queryObj = JSON.parse(decodedValue);
            
            // Extract common search parameters from the JSON structure
            this.extractSearchParamsFromQueryJson(queryObj, params);
            
            // Also store the raw query
            params.q = decodedValue;
          } catch (jsonError) {
            // If not JSON, just store the decoded value
            params.q = decodeURIComponent(value);
          }
        } else {
          // Decode other parameters
          params[key] = decodeURIComponent(value);
        }
      }
      
      return params;
    } catch (error) {
      console.warn(`Failed to parse URL: ${url}`, error.message);
      return {};
    }
  }

  /**
   * Extract search parameters from LUX query JSON structure
   * @param {Object} queryObj - Parsed query JSON object
   * @param {Object} params - Parameters object to populate
   */
  extractSearchParamsFromQueryJson(queryObj, params) {
    if (!queryObj || typeof queryObj !== 'object') return;
    
    // Handle common LUX query patterns
    if (queryObj.AND) {
      queryObj.AND.forEach(condition => {
        this.extractConditionParams(condition, params);
      });
    } else if (queryObj.OR) {
      queryObj.OR.forEach(condition => {
        this.extractConditionParams(condition, params);
      });
    } else {
      this.extractConditionParams(queryObj, params);
    }
  }

  /**
   * Extract parameters from a query condition
   * @param {Object} condition - Query condition object
   * @param {Object} params - Parameters object to populate
   */
  extractConditionParams(condition, params) {
    if (!condition || typeof condition !== 'object') return;
    
    // Handle different condition types
    if (condition.text) {
      params.text = condition.text;
    }
    if (condition.name) {
      params.name = condition.name;
    }
    if (condition.classification && condition.classification.name) {
      params.classification = condition.classification.name;
    }
    // Add more parameter extraction logic as needed based on LUX query structure
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
