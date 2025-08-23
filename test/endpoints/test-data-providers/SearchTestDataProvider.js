/**
 * Search Test Data Provider Sub-Interface
 * 
 * Test data providers that serve up search test cases should extend this class to get
 * search-estimate, search-will-match, and facet requests for their search requests.
 */
import { TestDataProvider } from './interface.js';

export class SearchTestDataProvider extends TestDataProvider {
  /**
   * Constructor
   * @param {Object} options - Provider-specific options
   */
  constructor(options = {}) {
  super({...options});
  }

  /**
   * Parse and extract test cases from the source
   * @param {Object} apiDef - API definition object containing endpoint information
   * @param {string} endpointKey - Unique key for the endpoint
   * @param {Array<string>} columns - Array of column names for the test spreadsheet
   * @returns {Promise<Array<Array>>} - Array of test data rows, each row is an array of values matching the columns
   */
  async extractTestData(apiDef, endpointKey, columns) {
    throw new Error('extractTestData() must be implemented by subclass');
  }

  /**
   * Validate that the extracted data conforms to the expected structure
   * @param {Array<Array>} testData - Test data rows to validate
   * @param {Array<string>} columns - Expected column structure
   * @returns {Object} - Validation result with { isValid: boolean, errors: Array<string> }
   */
  validateTestData(testData, columns) {
    const errors = [];
    
    if (!Array.isArray(testData)) {
      errors.push('Test data must be an array of rows');
      return { isValid: false, errors };
    }

    testData.forEach((row, index) => {
      if (!Array.isArray(row)) {
        errors.push(`Row ${index + 1} must be an array of values`);
      } else if (row.length !== columns.length) {
        errors.push(`Row ${index + 1} has ${row.length} values but expected ${columns.length} columns`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Get metadata about the test data source
   * @returns {Object} - Metadata object with information about the source
   */
  getSourceMetadata() {
    return {
      type: this.constructor.name,
      providerId: this.getProviderId(),
      options: this.options,
      lastModified: null,
      recordCount: 0
    };
  }
}
