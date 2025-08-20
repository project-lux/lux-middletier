import { TestDataProvider } from './interface.js';

/**
 * Default Sample Test Data Provider
 * 
 * Generates sample test cases similar to the original generateSampleData function
 * This provider is used as a fallback when no external data source is available
 */
export class SampleTestDataProvider extends TestDataProvider {
  /**
   * Constructor
   * @param {string} sourcePath - For sample data, this can be 'sample' or null
   * @param {Object} options - Options for sample generation
   */
  constructor(sourcePath = 'sample', options = {}) {
    super(sourcePath, {
      testCaseCount: 2,
      includeErrorCases: true,
      ...options
    });
  }

  /**
   * Check if this provider can handle the given source
   * @param {string} sourcePath - Path or identifier
   * @returns {boolean} - True if source indicates sample data generation
   */
  static canHandle(sourcePath) {
    return !sourcePath || 
           sourcePath === 'sample' || 
           sourcePath === 'default' || 
           sourcePath === 'generate';
  }

  /**
   * Generate sample test cases for the API endpoint
   * @param {Object} apiDef - API definition object
   * @param {string} endpointKey - Unique endpoint key
   * @param {Array<string>} columns - Column structure for the template
   * @returns {Promise<Array<Array>>} - Array of test data rows
   */
  async extractTestData(apiDef, endpointKey, columns) {
    console.log(`Generating ${this.options.testCaseCount} sample test cases for ${endpointKey}...`);
    
    const testCases = this.getSampleTestCases(apiDef, endpointKey);
    
    const sampleRows = testCases.map((testCase, index) => {
      const row = columns.map((col) => {
        if (col === 'test_name') {
          return testCase.name;
        } else if (col === 'description') {
          return testCase.description;
        } else if (col === 'enabled') {
          return 'true';
        } else if (col === 'expected_status') {
          return testCase.expectedStatus || 200;
        } else if (col === 'timeout_ms') {
          return 10000;
        } else if (col === 'max_response_time') {
          return testCase.maxResponseTime || 3000;
        } else if (col === 'delay_after_ms') {
          return 500;
        } else if (col === 'tags') {
          return testCase.tags || `${endpointKey},functional`;
        } else if (col.startsWith('param:')) {
          const paramName = col.replace('param:', '');
          return testCase.params[paramName] || '';
        } else {
          return '';
        }
      });
      return row;
    });

    console.log(`✓ Generated ${sampleRows.length} sample test cases`);
    return sampleRows;
  }

  /**
   * Get sample test cases for an endpoint
   * @param {Object} apiDef - API definition
   * @param {string} endpointKey - Endpoint key
   * @returns {Array<Object>} - Array of test case objects
   */
  getSampleTestCases(apiDef, endpointKey) {
    // Base test case structure
    const baseCase = {
      name: `${endpointKey} - Basic Test`,
      description: `Test ${apiDef.method} ${apiDef.path} endpoint with valid parameters`,
      expectedStatus: 200,
      maxResponseTime: 3000,
      tags: `${endpointKey},functional`,
      params: {},
    };

    // Generate sample parameter values based on endpoint type and parameter names
    apiDef.allParams.forEach((param) => {
      baseCase.params[param.name] = this.getSampleParamValue(param, endpointKey);
    });

    // Create variations for different test scenarios
    const testCases = [baseCase];

    // Add error test case if there are required parameters and includeErrorCases is true
    if (this.options.includeErrorCases && apiDef.requiredParams.length > 0) {
      const errorCase = {
        ...baseCase,
        name: `${endpointKey} - Missing Required Param`,
        description: `Test ${apiDef.method} ${apiDef.path} with missing required parameters`,
        expectedStatus: 400,
        maxResponseTime: 2000,
        tags: `${endpointKey},validation`,
        params: { ...baseCase.params },
      };

      // Remove first required parameter to trigger error
      const firstRequired = apiDef.requiredParams[0];
      if (firstRequired) {
        errorCase.params[firstRequired.name] = '';
      }

      testCases.push(errorCase);
    }

    // Generate additional test cases if requested
    const additionalCases = Math.max(0, this.options.testCaseCount - testCases.length);
    for (let i = 0; i < additionalCases; i++) {
      const additionalCase = {
        ...baseCase,
        name: `${endpointKey} - Test ${testCases.length + 1}`,
        description: `Additional test case for ${apiDef.method} ${apiDef.path}`,
        params: this.generateVariationParams(baseCase.params, i),
      };
      testCases.push(additionalCase);
    }

    return testCases.slice(0, this.options.testCaseCount);
  }

  /**
   * Generate sample parameter values based on parameter name and type
   * @param {Object} param - Parameter definition
   * @param {string} endpointKey - Endpoint key for context
   * @returns {string} - Sample parameter value
   */
  getSampleParamValue(param, endpointKey) {
    const paramName = param.name.toLowerCase();

    // Path parameters
    if (paramName === 'type') return 'work';
    if (paramName === 'uuid') return '12345678-1234-1234-1234-123456789abc';
    if (paramName === 'scope') return 'work';
    if (paramName === 'unit') return 'yuag';
    if (paramName === 'identifier') return 'example-123';

    // Common query parameters
    if (paramName === 'unitname') return '';
    if (paramName === 'q')
      return endpointKey.includes('search')
        ? 'test query'
        : '{"query": "example"}';
    if (paramName === 'uri')
      return 'https://lux.collections.yale.edu/data/test/example';
    if (paramName === 'page') return '1';
    if (paramName === 'pagelength') return '20';
    if (paramName === 'lang') return 'en';
    if (paramName === 'profile') return 'summary';
    if (paramName === 'text') return 'sample text';
    if (paramName === 'context') return 'person';
    if (paramName === 'name') return 'classification';

    // Body parameter
    if (paramName === 'body')
      return '{"@context": "https://linked.art/contexts/base.json", "type": "HumanMadeObject"}';

    // Default values based on data type
    if (param.datatype === 'string') return 'example';
    if (param.datatype === 'int' || param.datatype === 'integer') return '1';
    if (param.datatype === 'boolean') return 'true';
    if (param.datatype === 'jsonDocument') return '{}';

    return '';
  }

  /**
   * Generate parameter variations for additional test cases
   * @param {Object} baseParams - Base parameter set
   * @param {number} variationIndex - Index of the variation
   * @returns {Object} - Modified parameter set
   */
  generateVariationParams(baseParams, variationIndex) {
    const variations = { ...baseParams };
    
    // Apply some simple variations based on the index
    Object.keys(variations).forEach(key => {
      const value = variations[key];
      if (typeof value === 'string' && value.includes('example')) {
        variations[key] = value.replace('example', `example${variationIndex + 2}`);
      } else if (key === 'page' && !isNaN(parseInt(value))) {
        variations[key] = (parseInt(value) + variationIndex + 1).toString();
      }
    });

    return variations;
  }

  /**
   * Get metadata about the sample data source
   * @returns {Object} - Metadata object
   */
  getSourceMetadata() {
    const baseMetadata = super.getSourceMetadata();
    return {
      ...baseMetadata,
      generatedAt: new Date().toISOString(),
      testCaseCount: this.options.testCaseCount,
      includeErrorCases: this.options.includeErrorCases,
    };
  }
}
