import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { TestDataProvider } from '../../../interface.js';
import { ENDPOINT_KEYS } from '../../../../constants.js';
import { parseUrlQueryString, isValidSearchUrl } from '../../../../utils.js';

export class UpdatedAdvancedSearchQueriesTestDataProvider extends TestDataProvider {
  /**
   * Constructor
   * @param {Object} options - Options for XLSX parsing
   */
  constructor(options = {}) {
    super({
      encoding: 'utf8',
      headers: true,
      skipErrorLines: false,
      strictValidation: false,
      fallbackToSample: true,
      sheetIndex: 0, // Use first sheet by default
      range: null, // Optional range specification (e.g., 'A1:Z100')
      defVal: '', // Default value for empty cells
      ...options
    });
    
    this.sourcePath = options.filePath || 
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), './data.xlsx');
  }

  /**
   * Parse XLSX file and extract test cases
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
        console.warn(`Warning: data file not found: ${this.sourcePath}`);
        return [];
      }

      const data = await this.parseFile();
      
      if (data.length === 0) {
        console.warn(`Warning: No test data found in file: ${this.sourcePath}`);
        return [];
      }

      // Convert XLSX objects to row arrays matching the column structure
      // Only process cells in the first column that are hyperlinked
      const testRows = [];
      
      // Process each record to find hyperlinked cells
      for (let index = 0; index < data.length; index++) {
        const record = data[index];
        const originalRowNumber = record.sourceRowNumber || (index + 2); // Fallback to calculated row number
        
        // Check if this record has hyperlink information
        let hyperlinkUrl = record.__hyperlink_url;
        let testDescription = record.__hyperlink_text;
        
        // If no direct hyperlink metadata, try to extract from first column value
        if (!hyperlinkUrl) {
          const firstColumnName = this.getFirstColumnName([record]);
          if (firstColumnName) {
            const cellValue = record[firstColumnName];
            if (cellValue) {
              hyperlinkUrl = this.extractHyperlinkFromCell(cellValue, originalRowNumber);
              testDescription = this.extractTextFromCell(cellValue);
            }
          }
        }
        
        // Skip records without valid hyperlinks
        if (!hyperlinkUrl || !isValidSearchUrl(hyperlinkUrl)) {
          continue;
        }

        // Parse query parameters from the hyperlink
        const queryParams = parseUrlQueryString(hyperlinkUrl);
        
        // Create a test row matching the column structure
        const row = columns.map(columnName => {
          if (columnName === 'test_name') {
            return `Source row ${originalRowNumber}`;
          } else if (columnName === 'description') {
            return testDescription || `Search test from source row ${originalRowNumber}`;
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
            return `updated-advanced-search-queries,search`;
          } else if (columnName.startsWith('param:')) {
            // Extract parameter from URL query string
            const paramName = columnName.replace('param:', '');
            return queryParams[paramName] || '';
          } else {
            return '';
          }
        });
        
        testRows.push(row);
      }

      // Validate the extracted data
      const validation = this.validateTestData(testRows, columns);
      if (!validation.isValid) {
        console.warn(`Warning: XLSX data validation issues:`, validation.errors);
        if (this.options.strictValidation) {
          throw new Error(`XLSX validation failed: ${validation.errors.join(', ')}`);
        }
      }

      console.log(`✓ Loaded ${testRows.length} test cases from XLSX: ${path.basename(this.sourcePath)}`);
      return testRows;

    } catch (error) {
      console.error(`Error reading XLSX file ${this.sourcePath}:`, error.message);
      if (this.options.fallbackToSample) {
        console.log('Falling back to sample data generation...');
        return [];
      }
      throw error;
    }
  }

  /**
   * Parse XLSX file using xlsx library
   * @returns {Promise<Array<Object>>} - Array of XLSX records as objects with hyperlink info
   */
  async parseFile() {
    return new Promise((resolve, reject) => {
      try {
        // Read the file with hyperlink preservation options
        const workbook = XLSX.readFile(this.sourcePath, {
          cellDates: true,
          cellNF: false,
          cellText: false,
          defval: this.options.defVal
        });

        // Get sheet names
        const sheetNames = workbook.SheetNames;
        
        if (sheetNames.length === 0) {
          throw new Error('No sheets found in XLSX file');
        }

        // Get the first sheet (or specified sheet)
        let sheetName;
        if (this.options.sheetIndex !== undefined && this.options.sheetIndex < sheetNames.length) {
          sheetName = sheetNames[this.options.sheetIndex];
        } else if (this.options.sheetName && sheetNames.includes(this.options.sheetName)) {
          sheetName = this.options.sheetName;
        } else {
          sheetName = sheetNames[0]; // Default to first sheet
        }

        console.log(`Reading from sheet: "${sheetName}" (${sheetNames.length} sheets available)`);

        const worksheet = workbook.Sheets[sheetName];

        // Get the actual range of data in the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        console.log(`Worksheet range: ${worksheet['!ref']} (${range.e.r + 1} rows, ${range.e.c + 1} columns)`);

        // Convert worksheet to JSON, including blank rows to ensure we get all data
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: this.options.headers ? 1 : undefined,
          range: this.options.range,
          defval: this.options.defVal,
          blankrows: true, // Include blank rows to capture all data
          raw: false // Get formatted values
        });

        console.log(`Initial JSON conversion produced ${jsonData.length} rows from ${range.e.r + 1} total rows`);

        // Enhance data with hyperlink information
        const enhancedData = this.enhanceDataWithHyperlinks(jsonData, worksheet, range);

        console.log(`Parsed ${enhancedData.length} rows from XLSX file`);
        resolve(enhancedData);

      } catch (error) {
        reject(new Error(`Failed to parse XLSX file: ${error.message}`));
      }
    });
  }

  /**
   * Enhance JSON data with hyperlink information from the worksheet
   * @param {Array<Object>} jsonData - Raw JSON data from XLSX
   * @param {Object} worksheet - XLSX worksheet object
   * @param {Object} range - Decoded worksheet range
   * @returns {Array<Object>} - Enhanced data with hyperlink info
   */
  enhanceDataWithHyperlinks(jsonData, worksheet, range) {
    const enhancedData = [];
    
    // Process based on the actual worksheet range to ensure we don't miss rows
    const totalDataRows = range.e.r; // Last row index (0-based, excluding header)

    // If jsonData has fewer entries than expected, we need to fill in the gaps
    const maxRows = Math.max(jsonData.length, totalDataRows);

    for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
      // Get the record from jsonData or create an empty one if missing
      const record = rowIndex < jsonData.length ? jsonData[rowIndex] : {};
      const enhancedRecord = { ...record };
      
      // Store the original Excel row number (1-based, accounting for header row)
      const excelRowNumber = rowIndex + 2; // +2 because Excel is 1-based and we skip header row
      enhancedRecord.sourceRowNumber = excelRowNumber;
      
      // Check first column for hyperlinks (column A)
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: 0 }); // +1 for header row
      const cell = worksheet[cellAddress];
      
      if (cell && cell.l && cell.l.Target) {
        // Cell has a hyperlink
        enhancedRecord.__hyperlink_url = cell.l.Target;
        enhancedRecord.__hyperlink_text = cell.v || cell.w || '';
        console.log(`Found Excel hyperlink in row ${excelRowNumber}: ${cell.l.Target}`);
      } else if (cell && cell.v) {
        // Check if the cell value itself contains a hyperlink pattern
        const cellValue = String(cell.v);
        const extractedUrl = this.extractHyperlinkFromCell(cellValue, excelRowNumber);
        if (extractedUrl) {
          enhancedRecord.__hyperlink_url = extractedUrl;
          enhancedRecord.__hyperlink_text = this.extractTextFromCell(cellValue);
          console.log(`Found text-based hyperlink in row ${excelRowNumber}: ${extractedUrl}`);
        }
      }
      
      // Only add rows that have some data or hyperlinks
      const hasContent = Object.keys(record).length > 0 || 
                        enhancedRecord.__hyperlink_url || 
                        (cell && cell.v);
      
      if (hasContent) {
        enhancedData.push(enhancedRecord);
      }
    }

    console.log(`Enhanced ${enhancedData.length} rows with hyperlink information`);
    return enhancedData;
  }

  /**
   * Get the name of the first column from XLSX data
   * @param {Array<Object>} xlsxData - Array of XLSX records
   * @returns {string|null} - First column name or null if not found
   */
  getFirstColumnName(xlsxData) {
    if (!xlsxData || xlsxData.length === 0) {
      return null;
    }
    
    const firstRecord = xlsxData[0];
    const keys = Object.keys(firstRecord);
    
    if (keys.length === 0) {
      return null;
    }
    
    return keys[0];
  }

  /**
   * Extract hyperlink URL from a cell value
   * This handles Excel hyperlink formulas and direct URLs
   * @param {string} cellValue - Raw cell value from XLSX
   * @param {number} index - Row index for logging
   * @returns {string|null} - Extracted URL or null if no hyperlink found
   */
  extractHyperlinkFromCell(cellValue, index) {
    if (!cellValue || typeof cellValue !== 'string') {
      return null;
    }

    // Check if it's already a direct URL
    if (cellValue.trim().startsWith('http://') || cellValue.trim().startsWith('https://')) {
      return cellValue.trim();
    }

    // Check for Excel hyperlink formula patterns
    // Pattern: =HYPERLINK("url", "display text")
    const hyperlinkMatch = cellValue.match(/=HYPERLINK\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*\)/i);
    if (hyperlinkMatch) {
      return hyperlinkMatch[1];
    }

    // Pattern: =HYPERLINK("url")
    const simpleLinkMatch = cellValue.match(/=HYPERLINK\s*\(\s*["']([^"']+)["']\s*\)/i);
    if (simpleLinkMatch) {
      return simpleLinkMatch[1];
    }

    // Look for URLs within the text
    const urlMatch = cellValue.match(/(https?:\/\/[^\s)]+)/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    return null;
  }

  /**
   * Extract display text from a cell (removing hyperlink formula if present)
   * @param {string} cellValue - Raw cell value from XLSX
   * @returns {string} - Display text
   */
  extractTextFromCell(cellValue) {
    if (!cellValue || typeof cellValue !== 'string') {
      return '';
    }

    // Extract display text from hyperlink formula
    const hyperlinkMatch = cellValue.match(/=HYPERLINK\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*\)/i);
    if (hyperlinkMatch) {
      return hyperlinkMatch[2] || 'Hyperlink test';
    }

    // If it's just a URL, use a generic description
    if (cellValue.trim().startsWith('http://') || cellValue.trim().startsWith('https://')) {
      return 'Search test from hyperlink';
    }

    // Return the text as-is (might contain URL and other text)
    return cellValue.trim();
  }

  /**
   * Get value from record using flexible column name matching
   * @param {Object} record - Single row record from XLSX
   * @param {string} columnName - Target column name
   * @returns {*} - Column value
   */
  getColumnValue(record, columnName) {
    // Direct match
    if (record.hasOwnProperty(columnName)) {
      return record[columnName];
    }

    // Case insensitive match
    const keys = Object.keys(record);
    const lowerColumnName = columnName.toLowerCase();
    
    for (const key of keys) {
      if (key.toLowerCase() === lowerColumnName) {
        return record[key];
      }
    }

    // Handle common variations
    const variations = this.getColumnVariations(columnName);
    for (const variation of variations) {
      for (const key of keys) {
        if (key.toLowerCase() === variation.toLowerCase()) {
          return record[key];
        }
      }
    }

    // Default to empty string if not found
    return this.options.defVal || '';
  }

  /**
   * Generate common column name variations
   * @param {string} columnName - Original column name
   * @returns {Array<string>} - Array of possible variations
   */
  getColumnVariations(columnName) {
    const variations = [];
    
    // Handle underscore/space/hyphen variations
    variations.push(columnName.replace(/_/g, ' '));
    variations.push(columnName.replace(/_/g, '-'));
    variations.push(columnName.replace(/ /g, '_'));
    variations.push(columnName.replace(/ /g, '-'));
    variations.push(columnName.replace(/-/g, '_'));
    variations.push(columnName.replace(/-/g, ' '));
    
    // Handle camelCase variations
    variations.push(columnName.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase()));
    variations.push(columnName.replace(/([A-Z])/g, '_$1').toLowerCase());
    
    // Handle common abbreviations and expansions
    const substitutions = {
      'param:': 'parameter:',
      'parameter:': 'param:',
      'test_name': 'testname',
      'testname': 'test_name',
      'expected_status': 'expectedstatus',
      'expectedstatus': 'expected_status',
      'max_response_time': 'maxresponsetime',
      'maxresponsetime': 'max_response_time',
      'delay_after_ms': 'delayafterms',
      'delayafterms': 'delay_after_ms',
      'timeout_ms': 'timeoutms',
      'timeoutms': 'timeout_ms'
    };
    
    for (const [from, to] of Object.entries(substitutions)) {
      if (columnName.includes(from)) {
        variations.push(columnName.replace(from, to));
      }
    }
    
    return [...new Set(variations)]; // Remove duplicates
  }

  /**
   * Format value based on column type
   * @param {*} value - Raw value from XLSX
   * @param {string} columnName - Column name for context
   * @returns {*} - Formatted value
   */
  formatValue(value, columnName) {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return '';
    }

    // Convert to string and trim
    let stringValue = String(value).trim();

    // Handle boolean columns
    if (columnName === 'enabled') {
      return value;
    }

    // Handle numeric columns
    if (columnName.includes('status') || columnName.includes('timeout') || 
        columnName.includes('time') || columnName.includes('delay')) {
      const numValue = Number(stringValue);
      if (!isNaN(numValue)) {
        return numValue;
      }
    }

    // Return as-is for most cases
    return stringValue;
  }

  /**
   * Get metadata about the XLSX data source
   * @returns {Object} - Metadata object
   */
  getSourceMetadata() {
    const baseMetadata = super.getSourceMetadata();
    
    try {
      const stats = fs.existsSync(this.sourcePath) ? fs.statSync(this.sourcePath) : null;
      return {
        ...baseMetadata,
        type: 'UpdatedAdvancedSearchQueries',
        filePath: this.sourcePath,
        fileName: path.basename(this.sourcePath),
        fileExists: fs.existsSync(this.sourcePath),
        lastModified: stats ? stats.mtime : null,
        fileSize: stats ? stats.size : 0,
        sheetIndex: this.options.sheetIndex,
        sheetName: this.options.sheetName
      };
    } catch (error) {
      return {
        ...baseMetadata,
        type: 'UpdatedAdvancedSearchQueries',
        filePath: this.sourcePath,
        error: error.message
      };
    }
  }
}
