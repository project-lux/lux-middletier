import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import { TestDataProvider } from '../../interface.js';

export class AtLeastOneRelatedListItemTestDataProvider extends TestDataProvider {
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
    
    // This provider processes all TSV files in the same directory
    this.sourceDir = path.dirname(fileURLToPath(import.meta.url));
    this.sourcePaths = [];

    // Updated in parseTsvFile
    this.headerRowIndex = 0;
  }

  /**
   * Discover all TSV files in the source directory
   * @returns {Array<string>} - Array of TSV file paths
   */
  discoverTsvFiles() {
    try {
      if (!fs.existsSync(this.sourceDir)) {
        console.warn(`Warning: Source directory not found (${this.sourceDir})`);
        return [];
      }

      const files = fs.readdirSync(this.sourceDir);
      const tsvFiles = files
        .filter(file => file.toLowerCase().endsWith('.tsv'))
        .map(file => path.join(this.sourceDir, file));

      this.sourcePaths = tsvFiles;
      return tsvFiles;
    } catch (error) {
      console.error(`Error discovering TSV files in ${this.sourceDir}:`, error.message);
      return [];
    }
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
      if (!this.isGetRelatedList(endpointKey)) {
        // console.log(
        //   `Skipping: the ${endpointKey} endpoint is not applicable for this provider`
        // );
        return [];
      }

      // Discover all TSV files in the directory
      const tsvFiles = this.discoverTsvFiles();
      
      if (tsvFiles.length === 0) {
        console.warn(
          `Warning: No TSV files found in the provider's directory (${this.sourceDir})`
        );
        return [];
      }

      console.log(`Found ${tsvFiles.length} TSV file(s) to process:`, tsvFiles.map(f => path.basename(f)));

      const allTestRows = [];

      // Process each TSV file
      for (const tsvFilePath of tsvFiles) {
        console.log(`Processing TSV file: ${path.basename(tsvFilePath)}`);
        
        const tsvData = await this.parseTsvFile(tsvFilePath);

        if (tsvData.length === 0) {
          console.warn(
            `Warning: No data found in TSV file: ${tsvFilePath}`
          );
          continue;
        }

        // Filter for rows that have valid data - check for URI and Related List columns
        const rawDataRows = tsvData
          .map((record, index) => ({ 
            ...record, 
            originalIndex: index + 1 + this.headerRowIndex, // +1 to make it 1-based
            sourceFile: path.basename(tsvFilePath) // Add source file for identification
          }))
          .filter(record => {
            // Check for essential data: URI and Related List columns
            const uri = this.getColumnValue(record, 'URI');
            const relatedList = this.getColumnValue(record, 'Related List');
            return uri && uri.trim() && relatedList && relatedList.trim();
          });

        if (rawDataRows.length === 0) {
          console.log(`No valid data rows found for ${endpointKey} in ${path.basename(tsvFilePath)}`);
          continue;
        }

        // Convert TSV objects to row arrays matching the column structure
        const testRows = rawDataRows.map((record, index) => {
          const row = columns.map(columnName => {
            // Handle standard test columns
            if (columnName === 'test_name') {
              return `${record.sourceFile} row ${record.originalIndex}`;
            // } else if (columnName === 'description') {
            //   return this.getColumnValue(record, 'Related List');
            } else if (columnName === 'enabled') {
              return true;
            } else if (columnName === 'expected_status') {
              return 200;
            } else if (columnName === 'timeout_ms') {
              return 30000;
            } else if (columnName === 'max_response_time') {
              return 10000;
            } else if (columnName === 'delay_after_ms') {
              return 0;
            } else if (columnName === 'tags') {
              return 'related-list-check';
            } else if (columnName === 'param:scope') {
              return this.getColumnValue(record, 'Scope') || '';
            } else if (columnName === 'param:uri') {
              return this.getColumnValue(record, 'URI') || '';
            } else if (columnName === 'param:name') {
              return this.getColumnValue(record, 'Related List') || '';
            } else if (columnName.startsWith('param:')) {
              // Handle any other parameters
              const paramName = columnName.replace('param:', '');
              return this.getColumnValue(record, paramName) || '';
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
          console.warn(`Warning: TSV data validation issues in ${path.basename(tsvFilePath)}:`, validation.errors);
          if (this.options.strictValidation) {
            throw new Error(`TSV validation failed in ${tsvFilePath}: ${validation.errors.join(', ')}`);
          }
        }

        console.log(`✓ Loaded ${testRows.length} ${endpointKey} test cases from ${path.basename(tsvFilePath)}`);
        allTestRows.push(...testRows);
      }

      console.log(`✓ Total loaded ${allTestRows.length} ${endpointKey} test cases from ${tsvFiles.length} TSV files`);
      return allTestRows;
    } catch (error) {
      console.error(`Error reading TSV files from directory ${this.sourceDir}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse TSV file using csv-parser with tab separator
   * @param {string} filePath - Path to the TSV file to parse
   * @returns {Promise<Array<Object>>} - Array of TSV records as objects
   */
  parseTsvFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      let headers = null;
      let rowIndex = 0;
      
      const stream = fs.createReadStream(filePath)
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
            // Look for a row that contains expected column names for this provider
            const expectedColumns = ['Timestamp', 'Relations Checked', 'Related List', 'Scope', 'URI', 'Has?', 'Duration (ms)'];
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
   * Get metadata about the TSV sources
   * @returns {Object} - Metadata object
   */
  getSourceMetadata() {
    const baseMetadata = super.getSourceMetadata();
    
    try {
      const tsvFiles = this.sourcePaths.length > 0 ? this.sourcePaths : this.discoverTsvFiles();
      
      const filesMetadata = tsvFiles.map(filePath => {
        try {
          const stats = fs.statSync(filePath);
          return {
            fileName: path.basename(filePath),
            filePath,
            lastModified: stats.mtime,
            fileSize: stats.size,
          };
        } catch (error) {
          return {
            fileName: path.basename(filePath),
            filePath,
            error: error.message,
          };
        }
      });

      return {
        ...baseMetadata,
        sourceDirectory: this.sourceDir,
        tsvFiles: filesMetadata,
        totalFiles: tsvFiles.length,
        encoding: this.options.encoding || 'utf8',
        separator: this.options.separator || '\t',
      };
    } catch (error) {
      return {
        ...baseMetadata,
        error: error.message,
        sourceDirectory: this.sourceDir,
      };
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
