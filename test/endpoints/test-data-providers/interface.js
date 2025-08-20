/**
 * Test Data Provider Interface
 * 
 * This interface defines the contract for test data providers that can import
 * test cases from various sources (CSV, JSON, logs, spreadsheets, etc.)
 */

/**
 * Abstract base class for test data providers
 * All test data providers must extend this class and implement the required methods
 */
export class TestDataProvider {
  /**
   * Constructor
   * @param {string} sourcePath - Path to the source file or data
   * @param {Object} options - Provider-specific options
   */
  constructor(sourcePath, options = {}) {
    this.sourcePath = sourcePath;
    this.options = options;
  }

  /**
   * Check if the provider can handle the given source
   * @param {string} sourcePath - Path to the source file
   * @returns {boolean} - True if this provider can handle the source
   */
  static canHandle(sourcePath) {
    throw new Error('canHandle() must be implemented by subclass');
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
      sourcePath: this.sourcePath,
      options: this.options,
      lastModified: null,
      recordCount: 0
    };
  }
}

/**
 * Factory class for creating appropriate test data providers
 */
export class TestDataProviderFactory {
  static providers = [];

  /**
   * Register a test data provider class
   * @param {class} providerClass - Class that extends TestDataProvider
   */
  static registerProvider(providerClass) {
    if (!providerClass.prototype instanceof TestDataProvider) {
      throw new Error('Provider must extend TestDataProvider');
    }
    this.providers.push(providerClass);
  }

  /**
   * Create a test data provider for the given source
   * @param {string} sourcePath - Path to the source file or data
   * @param {Object} options - Provider-specific options
   * @returns {TestDataProvider} - Appropriate provider instance
   * @throws {Error} - If no suitable provider is found
   */
  static createProvider(sourcePath, options = {}) {
    for (const ProviderClass of this.providers) {
      if (ProviderClass.canHandle(sourcePath)) {
        return new ProviderClass(sourcePath, options);
      }
    }
    throw new Error(`No test data provider found for source: ${sourcePath}`);
  }

  /**
   * Get list of all registered providers
   * @returns {Array<class>} - Array of registered provider classes
   */
  static getRegisteredProviders() {
    return [...this.providers];
  }
}

/**
 * Test case structure interface
 * Defines the expected structure for test case objects
 */
export const TestCaseStructure = {
  // Required fields
  name: 'string',           // Unique test name
  enabled: 'boolean',       // Whether test is enabled
  expected_status: 'number', // Expected HTTP status code
  
  // Optional fields
  description: 'string',    // Test description
  timeout_ms: 'number',     // Request timeout
  max_response_time: 'number', // Max acceptable response time
  delay_after_ms: 'number', // Delay after test
  tags: 'string',          // Comma-separated tags
  
  // Dynamic parameter fields (param:*)
  // These are generated based on the API endpoint definition
};
