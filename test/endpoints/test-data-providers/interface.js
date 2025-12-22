/**
 * Test Data Provider Interface
 * 
 * This interface defines the contract for test data providers that can import
 * test cases from various sources (CSV, JSON, logs, spreadsheets, etc.)
 */
import { ENDPOINT_KEYS } from "../constants.js";

/**
 * Abstract base class for test data providers
 * All test data providers must extend this class and implement the required methods
 * Each provider is specific to a single data source
 */
export class TestDataProvider {
  /**
   * Constructor
   * @param {Object} options - Provider-specific options
   */
  constructor(options = {}) {
    this.options = options;
  }

  isGetData(endpointKey) {
    return ENDPOINT_KEYS.GET_DATA === endpointKey;
  }

  isGetDataWithProfile(endpointKey) {
    return ENDPOINT_KEYS.GET_DATA_WITH_PROFILE === endpointKey;
  }

  isGetDataNoProfile(endpointKey) {
    return ENDPOINT_KEYS.GET_DATA_NO_PROFILE === endpointKey;
  }

  isGetDataVariant(endpointKey) {
    return this.isGetData(endpointKey) || 
           this.isGetDataWithProfile(endpointKey) || 
           this.isGetDataNoProfile(endpointKey);
  }

  isGetRelatedList(endpointKey) {
    return ENDPOINT_KEYS.GET_RELATED_LIST === endpointKey;
  }

  isGetSearch(endpointKey) {
    return ENDPOINT_KEYS.GET_SEARCH === endpointKey;
  }

  /**
   * Get a unique identifier for this provider instance
   * This is used to trace tests back to their data source
   * @returns {string} - Unique identifier for this provider
   */
  getProviderId() {
    return this.constructor.name;
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

/**
 * Factory class for managing test data provider classes
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
   * Create instances of all registered providers
   * @param {Object} options - Options to pass to provider constructors
   * @returns {Array<TestDataProvider>} - Array of provider instances
   */
  static createAllProviders(options = {}) {
    return this.providers.map(ProviderClass => new ProviderClass(options));
  }

  /**
   * Get list of all registered providers
   * @returns {Array<class>} - Array of registered provider classes
   */
  static getRegisteredProviders() {
    return [...this.providers];
  }
}
