import XLSX from 'xlsx';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { getEndpointKeyFromPath } from './utils.js';
import { TestDataProviderFactory } from './test-data-providers/interface.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EndpointTester {
  constructor(configDir, reportsDir = './reports', options = {}) {
    this.configDir = configDir;
    this.reportsDir = reportsDir;
    this.results = [];
    this.baseUrl = process.env.BASE_URL || 'https://lux-middle-dev.collections.yale.edu';
    
    // Create a timestamped subdirectory for this test run
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    this.executionDir = path.join(this.reportsDir, `test-run-${timestamp}`);
    
    // Response body saving configuration
    this.saveResponseBodies = options.saveResponseBodies || false;
    this.responsesDir = path.join(this.executionDir, 'responses');

    // Filtering configuration
    this.providerFilter = options.providers || null; // null means all providers
    this.endpointFilter = options.endpoints || null; // null means all endpoints
    this.dryRun = options.dryRun || false; // dry-run mode

    // Authentication configuration
    this.authType = process.env.AUTH_TYPE || 'none'; // 'digest', 'oauth', or 'none'
    this.authUsername = process.env.AUTH_USERNAME || null;
    this.authPassword = process.env.AUTH_PASSWORD || null;

    // Validate authentication configuration
    if (this.authType === 'digest') {
      if (!this.authUsername || !this.authPassword) {
        throw new Error(
          'Digest authentication requires both AUTH_USERNAME and AUTH_PASSWORD environment variables to be set'
        );
      }
    }

    // Load endpoints specification once during construction
    this.endpointsSpec = this.loadEndpointsSpec();

    if (!this.dryRun) {
      // Ensure base reports directory exists
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Ensure execution directory exists
      if (!fs.existsSync(this.executionDir)) {
        fs.mkdirSync(this.executionDir, { recursive: true });
      }
      
      // Ensure responses directory exists if saving response bodies
      if (this.saveResponseBodies && !fs.existsSync(this.responsesDir)) {
        fs.mkdirSync(this.responsesDir, { recursive: true });
      }
    }
  }

  logValues(label, values, defaultValue = 'None') {
    const formattedValues = values && values.length > 0 ? values.join('\n\t') : defaultValue;
    console.log(`${label}:\n\t${formattedValues}`);
  }

  /**
   * Load endpoints specification from endpoints-spec.json once during initialization
   */
  loadEndpointsSpec() {
    try {
      const endpointsSpecPath = path.join(__dirname, 'endpoints-spec.json');
      if (fs.existsSync(endpointsSpecPath)) {
        const spec = JSON.parse(fs.readFileSync(endpointsSpecPath, 'utf8'));
        console.log(`Loaded ${spec.endpoints?.length || 0} endpoint specifications`);
        return spec;
      }
    } catch (error) {
      console.warn(`Warning: Could not load endpoints-spec.json: ${error.message}`);
    }
    return null;
  }

  /**
   * Discover and load all endpoint configuration files
   */
  loadAllEndpointConfigs() {
    const configs = [];
    const files = fs
      .readdirSync(this.configDir)
      .filter((file) => file.endsWith('.xlsx') || file.endsWith('.csv'))
      .filter((file) => !file.startsWith('~')); // Skip temp files

    for (const file of files) {
      const filePath = path.join(this.configDir, file);
      const endpointType = this.extractEndpointType(file);

      // Apply endpoint filtering if specified
      if (this.endpointFilter && !this.endpointFilter.includes(endpointType)) {
        continue;
      }

      try {
        const testConfigs = this.loadTestConfig(filePath, endpointType);
        configs.push(...testConfigs);
      } catch (error) {
        console.error(`Error loading ${file}: ${error.message}`);
      }
    }

    return configs;
  }

  /**
   * Extract endpoint type from filename
   */
  extractEndpointType(filename) {
    // Extract endpoint type from filename like "search-tests.xlsx" -> "search"
    const baseName = path.basename(filename, path.extname(filename));
    return baseName.replace(/-tests?$/, '').replace(/_tests?$/, '');
  }

  /**
   * Load test configuration from Excel/CSV file
   */
  loadTestConfig(filePath, endpointType) {
    let data;

    if (filePath.endsWith('.xlsx')) {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      // CSV handling
      const csvContent = fs.readFileSync(filePath, 'utf8');
      data = this.parseCSV(csvContent);
    }

    // Transform data into standardized test configurations
    return data.map((row, index) =>
      this.transformRowToTestConfig(row, endpointType, filePath, index, data.length)
    );
  }

  /**
   * Transform a spreadsheet row into a standardized test configuration
   */
  transformRowToTestConfig(row, endpointType, sourceFile, rowIndex, totalRows) {
    // Extract base configuration
    const testConfig = {
      test_name: row.test_name || `${endpointType}_test_${Date.now()}`,
      endpoint_type: endpointType,
      source_file: path.basename(sourceFile),
      row_number: rowIndex + 2, // +2 because array is 0-based and we skip header row
      total_rows: totalRows + 1, // +1 to account for header row
      method: row.method || this.getDefaultMethod(endpointType),
      base_endpoint: row.base_endpoint || this.getDefaultEndpoint(endpointType),
      endpoint_tests: row.endpoint_tests || this.getEndpointTests(endpointType),
      expected_status: parseInt(row.expected_status) || 200,
      timeout_ms: parseInt(row.timeout_ms) || 10000,
      max_response_time: parseInt(row.max_response_time) || 5000,
      delay_after_ms: parseInt(row.delay_after_ms) || 0,
      enabled: row.enabled === 'true' || row.enabled === true,
      description: row.description || '',
      tags: row.tags ? row.tags.split(',').map((t) => t.trim()) : [],
      parameters: {},
    };

    // Extract all param: columns
    Object.keys(row).forEach((key) => {
      if (key.startsWith('param:')) {
        const paramName = key.substring(6); // Remove 'param:' prefix
        const paramValue = row[key];
        if (
          paramValue !== undefined &&
          paramValue !== null &&
          paramValue !== ''
        ) {
          testConfig.parameters[paramName] = paramValue;
        }
      }
    });

    return testConfig;
  }

  /**
   * Get default HTTP method for endpoint type
   */
  getDefaultMethod(endpointType) {
    const methodMap = {
      search: 'GET',
      facets: 'GET',
      'related-list': 'GET',
      'search-estimate': 'GET',
      'search-will-match': 'GET',
      'advanced-search-config': 'GET',
      'search-info': 'GET',
      translate: 'POST',
      'document-create': 'POST',
      'document-read': 'GET',
      'document-update': 'PUT',
      'document-delete': 'DELETE',
    };

    return methodMap[endpointType] || 'GET';
  }

  /**
   * Get default endpoint path for endpoint type
   */
  getDefaultEndpoint(endpointType) {
    const endpointMap = {
      search: '/ds/lux/search.mjs',
      facets: '/ds/lux/facets.mjs',
      'related-list': '/ds/lux/related-list',
      'search-estimate': '/ds/lux/searchEstimate.mjs',
      'search-will-match': '/ds/lux/searchWillMatch.mjs',
      'advanced-search-config': '/ds/lux/advancedSearchConfig.mjs',
      'search-info': '/ds/lux/searchInfo.mjs',
      translate: '/ds/lux/translate.mjs',
      'document-create': '/ds/lux/document/create.mjs',
      'document-read': '/ds/lux/document/read.mjs',
      'document-update': '/ds/lux/document/update.mjs',
      'document-delete': '/ds/lux/document/delete.mjs',
    };

    return endpointMap[endpointType] || '/';
  }

  /**
   * Get endpoint tests with path parameters for endpoint type
   */
  getEndpointTests(endpointType) {
    // Use cached endpoints specification
    if (this.endpointsSpec && this.endpointsSpec.endpoints) {
      // Find matching endpoint by comparing endpoint type with generated key
      const endpoint = this.endpointsSpec.endpoints.find(ep => {
        const specKey = getEndpointKeyFromPath(ep.path, ep.method);
        return specKey === endpointType;
      });
      
      if (endpoint) {
        return endpoint.path;
      }
    }

    // Fallback to default endpoint if spec is not available or endpoint not found
    return this.getDefaultEndpoint(endpointType);
  }

  /**
   * Build complete URL from test configuration
   */
  buildRequestUrl(testConfig) {
    let url = this.baseUrl;
    
    // Use endpoint tests if available, otherwise fall back to base endpoint
    let pathTemplate = testConfig.endpoint_tests || testConfig.base_endpoint;
    
    // Substitute path parameters
    const pathParams = this.extractPathParameters(pathTemplate);
    let finalPath = pathTemplate;
    
    pathParams.forEach(paramName => {
      const paramValue = testConfig.parameters[paramName];
      if (paramValue) {
        finalPath = finalPath.replace(`:${paramName}`, paramValue);
      } else {
        console.warn(`Missing required path parameter '${paramName}' for ${testConfig.test_name}`);
      }
    });
    
    url += finalPath;

    // Build query parameters (exclude path parameters)
    const queryParams = [];
    Object.entries(testConfig.parameters).forEach(([key, value]) => {
      // Skip parameters that are used in path or body
      if (
        this.isQueryParameter(key, testConfig.endpoint_type, testConfig.method, pathParams)
      ) {
        queryParams.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        );
      }
    });

    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }

    return url;
  }

  /**
   * Extract path parameters from URL template
   */
  extractPathParameters(pathTemplate) {
    const matches = pathTemplate.match(/:([^/]+)/g);
    return matches ? matches.map(match => match.substring(1)) : [];
  }

  /**
   * Determine if a parameter should be included in query string
   */
  isQueryParameter(paramName, endpointType, method, pathParams = []) {
    // Parameters that go in the path, not query
    const staticPathParams = ['scope']; // Legacy hardcoded path params
    const allPathParams = [...staticPathParams, ...pathParams];

    // Parameters that go in the body for POST/PUT requests
    const bodyParams = ['doc', 'unitName', 'lang', 'uri'];

    if (allPathParams.includes(paramName)) {
      return false;
    }

    if (
      (method === 'POST' || method === 'PUT') &&
      bodyParams.includes(paramName)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Build request body from test configuration
   */
  buildRequestBody(testConfig) {
    if (testConfig.method === 'GET' || testConfig.method === 'DELETE') {
      return null;
    }

    // Handle different endpoint types
    switch (testConfig.endpoint_type) {
      case 'translate':
      case 'search':
        return this.buildJSONBody(testConfig);

      case 'document-create':
      case 'document-update':
        return this.buildFormDataBody(testConfig);

      default:
        return this.buildJSONBody(testConfig);
    }
  }

  /**
   * Build JSON request body
   */
  buildJSONBody(testConfig) {
    const body = {};

    // Add relevant parameters to JSON body
    Object.entries(testConfig.parameters).forEach(([key, value]) => {
      if (this.isBodyParameter(key, testConfig.endpoint_type, 'json')) {
        body[key] = this.parseParameterValue(value);
      }
    });

    return Object.keys(body).length > 0 ? JSON.stringify(body) : null;
  }

  /**
   * Build form data request body
   */
  buildFormDataBody(testConfig) {
    const formData = new URLSearchParams();

    Object.entries(testConfig.parameters).forEach(([key, value]) => {
      if (this.isBodyParameter(key, testConfig.endpoint_type, 'formdata')) {
        formData.append(key, value);
      }
    });

    return formData.toString();
  }

  /**
   * Determine if parameter should be in request body
   */
  isBodyParameter(paramName, endpointType, bodyType) {
    const jsonBodyParams = [
      'q',
      'scope',
      'page',
      'pageLength',
      'sort',
      'facets',
    ];
    const formDataBodyParams = ['doc', 'unitName', 'lang', 'uri'];

    if (bodyType === 'json') {
      return jsonBodyParams.includes(paramName);
    } else if (bodyType === 'formdata') {
      return formDataBodyParams.includes(paramName);
    }

    return false;
  }

  /**
   * Parse parameter value (handle JSON strings, arrays, etc.)
   */
  parseParameterValue(value) {
    if (typeof value === 'string') {
      // Try to parse as JSON if it looks like JSON
      if (
        (value.startsWith('{') && value.endsWith('}')) ||
        (value.startsWith('[') && value.endsWith(']'))
      ) {
        try {
          return JSON.parse(value);
        } catch (e) {
          // If parsing fails, return as string
          return value;
        }
      }

      // Handle comma-separated arrays
      if (value.includes(',') && !value.includes(' ')) {
        return value.split(',');
      }
    }

    return value;
  }

  /**
   * Save response body to disk
   */
  saveResponseBody(testName, response, timestamp, sourceFile, rowNumber, totalRows) {
    if (!this.saveResponseBodies) return null;
    
    try {
      // Create endpoint-specific subdirectory based on source file basename
      const sourceBasename = path.basename(sourceFile, path.extname(sourceFile));
      const endpointResponsesDir = path.join(this.responsesDir, sourceBasename);
      
      // Ensure endpoint-specific directory exists
      if (!fs.existsSync(endpointResponsesDir)) {
        fs.mkdirSync(endpointResponsesDir, { recursive: true });
      }
      
      // Calculate the number of digits needed for zero padding
      const maxDigits = Math.max(totalRows.toString().length, 2); // At least 2 digits
      const paddedRowNumber = rowNumber.toString().padStart(maxDigits, '0');
      
      // Create a safe filename from test name and timestamp
      const safeTestName = testName
        .replace(/[^a-zA-Z0-9 ]/g, ' ')
        .split(' ') // start of camelCase conversion
        .map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
      const filename = `row_${paddedRowNumber}_${safeTestName}.json`;
      const filePath = path.join(endpointResponsesDir, filename);
      
      // Save response data
      const responseData = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        config: {
          url: response.config?.url,
          method: response.config?.method,
          headers: response.config?.headers,
        }
      };
      
      fs.writeFileSync(filePath, JSON.stringify(responseData, null, 2));
      console.log(`  Response body saved to: ${sourceBasename}/${filename}`);
      
      // Return relative path from responses directory for reporting
      return `${sourceBasename}/${filename}`;
    } catch (error) {
      console.warn(`  Failed to save response body: ${error.message}`);
      return null;
    }
  }

  /**
   * Run a single test configuration
   */
  async runSingleTest(testConfig) {
    const startTime = Date.now();

    try {
      // Build the HTTP request
      const url = this.buildRequestUrl(testConfig);
      const body = this.buildRequestBody(testConfig);
      const headers = this.buildRequestHeaders(testConfig);
      const auth = this.buildAuthConfig(testConfig);

      const requestConfig = {
        method: testConfig.method,
        url: url,
        headers: headers,
        timeout: testConfig.timeout_ms,
        // Don't throw errors for any HTTP status codes - we'll handle them manually
        validateStatus: function () {
          return true; // Accept all status codes
        },
        ...(body && { data: body }),
        ...(auth && { auth }),
      };

      console.log(`Running test: ${testConfig.test_name}`);
      console.log(`  URL: ${url}`);
      console.log(`  Method: ${testConfig.method}`);

      // Make the HTTP request
      const response = await axios(requestConfig);
      const duration = Date.now() - startTime;
      const timestamp = new Date().toISOString();

      // Save response body if enabled
      const responseBodyFile = this.saveResponseBody(testConfig.test_name, response, timestamp, testConfig.source_file, testConfig.row_number, testConfig.total_rows);

      // Determine if test passed based on expected vs actual status
      const actualStatus = response.status;
      const expectedStatus = testConfig.expected_status;
      const statusMatches = actualStatus === expectedStatus;

      const result = {
        test_name: testConfig.test_name,
        endpoint_type: testConfig.endpoint_type,
        source_file: testConfig.source_file,
        status: statusMatches ? 'PASS' : 'FAIL',
        expected_status: expectedStatus,
        actual_status: actualStatus,
        duration_ms: duration,
        response_time_ms: duration,
        response_size_bytes: JSON.stringify(response.data).length,
        url: url,
        method: testConfig.method,
        parameters: testConfig.parameters,
        timestamp: timestamp,
        tags: testConfig.tags,
        ...(responseBodyFile && { response_body_file: responseBodyFile }),
      };

      // Add failure reason if status doesn't match
      if (!statusMatches) {
        result.error_message = `Expected status ${expectedStatus} but got ${actualStatus}`;
      }

      // Check if response time is acceptable (only for passing tests)
      if (
        statusMatches &&
        testConfig.max_response_time &&
        duration > testConfig.max_response_time
      ) {
        result.status = 'SLOW';
        result.warning = `Response time ${duration}ms exceeded threshold ${testConfig.max_response_time}ms`;
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const timestamp = new Date().toISOString();
      
      // Save error response body if available
      let responseBodyFile = null;
      if (error.response) {
        responseBodyFile = this.saveResponseBody(testConfig.test_name, error.response, timestamp, testConfig.source_file, testConfig.row_number, testConfig.total_rows);
      }
      
      const result = {
        test_name: testConfig.test_name,
        endpoint_type: testConfig.endpoint_type,
        source_file: testConfig.source_file,
        status: 'FAIL',
        expected_status: testConfig.expected_status,
        actual_status: error.response?.status || 'ERROR',
        duration_ms: duration,
        error_message: error.message,
        url: this.buildRequestUrl(testConfig),
        method: testConfig.method,
        parameters: testConfig.parameters,
        timestamp: timestamp,
        tags: testConfig.tags,
        ...(responseBodyFile && { response_body_file: responseBodyFile }),
      };

      return result;
    }
  }

  /**
   * Build request headers
   */
  buildRequestHeaders(testConfig) {
    const headers = {
      'User-Agent': 'LUX-Endpoint-Tester/1.0',
    };

    // Add content-type based on request body type
    if (testConfig.method === 'POST' || testConfig.method === 'PUT') {
      switch (testConfig.endpoint_type) {
        case 'document-create':
        case 'document-update':
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          break;
        default:
          headers['Content-Type'] = 'application/json';
      }
    }

    return headers;
  }

  /**
   * Build authentication configuration for axios
   */
  buildAuthConfig(testConfig) {
    const authType = this.authType;

    if (authType === 'digest') {
      const username = this.authUsername;
      const password = this.authPassword;

      if (username && password) {
        return {
          username: username,
          password: password,
        };
      }
    } else if (authType === 'oauth') {
      // TODO: Implement OAuth support
      console.warn('OAuth authentication not yet implemented');
      return null;
    }

    // For no auth, return null
    return null;
  }
  /**
   * Parse CSV content (simple implementation)
   */
  parseCSV(csvContent) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i]
          .split(',')
          .map((v) => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }

    return data;
  }

  /**
   * Get available test data providers (both IDs and class names)
   */
  async getAvailableProviders() {
    try {
      // Import the test data providers index to ensure all providers are registered
      await import('./test-data-providers/index.js');
      
      const registeredProviders = TestDataProviderFactory.getRegisteredProviders();
      const providers = {
        classes: [],
        ids: [],
        mappings: {} // Maps both class names and IDs to their respective provider classes
      };

      for (const ProviderClass of registeredProviders) {
        const className = ProviderClass.name;
        providers.classes.push(className);
        
        // Create a temporary instance to get the provider ID
        try {
          const instance = new ProviderClass();
          const providerId = instance.getProviderId();
          providers.ids.push(providerId);
          
          // Map both class name and ID to the class
          providers.mappings[className] = ProviderClass;
          providers.mappings[providerId] = ProviderClass;
        } catch (error) {
          console.warn(`Warning: Could not instantiate provider ${className}: ${error.message}`);
        }
      }

      return providers;
    } catch (error) {
      console.warn(`Warning: Could not load test data providers: ${error.message}`);
      // Fallback to basic provider list
      return {
        classes: ['CsvTestDataProvider', 'SampleTestDataProvider', 'AdvancedSearchQueriesTestDataProvider'],
        ids: ['csv-provider', 'sample-provider', 'google-sheets-search-queries'],
        mappings: {}
      };
    }
  }

  /**
   * Get available endpoint types from config files
   */
  getAvailableEndpoints() {
    const files = fs
      .readdirSync(this.configDir)
      .filter((file) => file.endsWith('.xlsx') || file.endsWith('.csv'))
      .filter((file) => !file.startsWith('~'));

    return files.map(file => this.extractEndpointType(file));
  }

  /**
   * Filter test configurations based on provider preference
   * Accepts either TestDataProvider class names or provider IDs
   */
  async filterConfigsByProvider(configs) {
    if (!this.providerFilter) {
      return configs;
    }

    const availableProviders = await this.getAvailableProviders();
    const validProviders = [];
    const invalidProviders = [];

    // Validate and normalize provider names/IDs
    for (const provider of this.providerFilter) {
      if (availableProviders.mappings[provider]) {
        validProviders.push(provider);
      } else {
        // Check if it's a partial match for class name or ID
        const classMatch = availableProviders.classes.find(cls => 
          cls.toLowerCase().includes(provider.toLowerCase()) || 
          provider.toLowerCase().includes(cls.toLowerCase())
        );
        const idMatch = availableProviders.ids.find(id => 
          id.toLowerCase().includes(provider.toLowerCase()) || 
          provider.toLowerCase().includes(id.toLowerCase())
        );

        if (classMatch) {
          validProviders.push(classMatch);
        } else if (idMatch) {
          validProviders.push(idMatch);
        } else {
          invalidProviders.push(provider);
        }
      }
    }

    if (invalidProviders.length > 0) {
      console.warn(`Warning: Invalid providers specified: ${invalidProviders.join(', ')}`);
      console.warn(`Available provider class names: ${availableProviders.classes.join(', ')}`);
      console.warn(`Available provider IDs: ${availableProviders.ids.join(', ')}`);
    }

    if (validProviders.length === 0) {
      console.warn('Warning: No valid providers specified. Running all tests.');
      return configs;
    }

    return configs;
  }

  /**
   * Run all tests from all configuration files with filtering support
   */
  async runTests() {
    console.log('');
    console.log('Resolved:');
    this.logValues('  Requested providers', this.providerFilter, 'All');
    this.logValues('  Requested endpoints', this.endpointFilter, 'All');
    console.log('');

    console.log('Filtering options:');
    const availableProviders = await this.getAvailableProviders();
    this.logValues('  Available provider class names', availableProviders.classes);
    this.logValues('  Available provider IDs', availableProviders.ids);
    const availableEndpoints = this.getAvailableEndpoints();
    this.logValues('  Available endpoints', availableEndpoints);
    console.log('');

    let testConfigs = this.loadAllEndpointConfigs();
    
    // Apply provider filtering
    testConfigs = await this.filterConfigsByProvider(testConfigs);

    console.log(
      `Found ${testConfigs.length} test configurations across ${
        testConfigs.reduce((acc, t) => {
          if (!acc.includes(t.source_file)) acc.push(t.source_file);
          return acc;
        }, []).length
      } files`
    );

    // Group tests by endpoint type for reporting
    const testsByType = {};
    testConfigs.forEach((config) => {
      if (!testsByType[config.endpoint_type]) {
        testsByType[config.endpoint_type] = [];
      }
      testsByType[config.endpoint_type].push(config);
    });

    console.log('\nTest distribution by endpoint type:');
    Object.entries(testsByType).forEach(([type, tests]) => {
      console.log(`  ${type}: ${tests.length} tests`);
    });

    // If dry-run mode, show what would be executed and exit
    if (this.dryRun) {
      let enabledCount = 0;
      let disabledCount = 0;
      
      for (const testConfig of testConfigs) {
        if (!testConfig.enabled) {
          disabledCount++;
        } else {
          enabledCount++;
        }
      }

      console.log('');
      console.log('=== DRY RUN SUMMARY ===');
      console.log(`Total tests found: ${testConfigs.length}`);
      console.log(`Tests that would be executed: ${enabledCount}`);
      console.log(`Tests that would be skipped (disabled): ${disabledCount}`);
      console.log(`Estimated execution time: ${enabledCount * 2}s - ${enabledCount * 10}s (rough estimate)`);
      console.log('\nNo actual HTTP requests were made.');
      console.log('To execute these tests, run the same command without --dry-run');
      
      return; // Exit without running tests or generating reports
    }

    // Run tests (only if not in dry-run mode)
    console.log('\n=== EXECUTING TESTS ===');
    for (const testConfig of testConfigs) {
      if (!testConfig.enabled) {
        console.log(`Skipping disabled test: ${testConfig.test_name}`);
        continue;
      }

      const result = await this.runSingleTest(testConfig);
      this.results.push(result);

      // Optional delay between tests
      if (testConfig.delay_after_ms > 0) {
        console.log(`  Waiting ${testConfig.delay_after_ms}ms...`);
        await new Promise((resolve) =>
          setTimeout(resolve, testConfig.delay_after_ms)
        );
      }
    }

    this.generateReport();
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const reportFile = path.join(
      this.executionDir,
      `endpoint-test-report.json`
    );
    const csvFile = path.join(
      this.executionDir,
      `endpoint-test-report.csv`
    );
    const htmlFile = path.join(
      this.executionDir,
      `endpoint-test-report.html`
    );

    // JSON Report
    const report = {
      summary: {
        total_tests: this.results.length,
        passed: this.results.filter((r) => r.status === 'PASS').length,
        failed: this.results.filter((r) => r.status === 'FAIL').length,
        errors: this.results.filter((r) => r.status === 'ERROR').length,
        slow: this.results.filter((r) => r.status === 'SLOW').length,
        average_duration:
          this.results.reduce((sum, r) => sum + (r.duration_ms || 0), 0) /
          this.results.length,
        total_duration: this.results.reduce(
          (sum, r) => sum + (r.duration_ms || 0),
          0
        ),
        tests_by_endpoint_type: this.getTestsByEndpointType(),
        timestamp: new Date().toISOString(),
      },
      results: this.results,
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // CSV Report
    if (this.results.length > 0) {
      const csvContent = this.convertToCSV(this.results);
      fs.writeFileSync(csvFile, csvContent);
    }

    // HTML Report
    const htmlContent = this.generateHTMLReport(report);
    fs.writeFileSync(htmlFile, htmlContent);

    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${report.summary.total_tests}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Errors: ${report.summary.errors}`);
    console.log(`Slow: ${report.summary.slow}`);
    console.log(
      `Average Duration: ${Math.round(report.summary.average_duration)}ms`
    );
    console.log(
      `Total Duration: ${Math.round(report.summary.total_duration)}ms`
    );
    console.log(`\nReports generated in: ${this.executionDir}`);
    console.log(`- JSON: ${path.basename(reportFile)}`);
    console.log(`- CSV: ${path.basename(csvFile)}`);
    console.log(`- HTML: ${path.basename(htmlFile)}`);
    if (this.saveResponseBodies) {
      console.log(`- Response bodies: responses/ directory`);
    }
  }

  /**
   * Get test counts by endpoint type for summary
   */
  getTestsByEndpointType() {
    const summary = {};
    this.results.forEach((result) => {
      const type = result.endpoint_type;
      if (!summary[type]) {
        summary[type] = { total: 0, passed: 0, failed: 0, errors: 0, slow: 0 };
      }
      summary[type].total++;

      switch (result.status) {
        case 'PASS':
          summary[type].passed++;
          break;
        case 'FAIL':
          summary[type].failed++;
          break;
        case 'ERROR':
          summary[type].errors++;
          break;
        case 'SLOW':
          summary[type].slow++;
          break;
      }
    });
    return summary;
  }

  /**
   * Convert results to CSV format
   */
  convertToCSV(results) {
    if (results.length === 0) return '';

    const headers = Object.keys(results[0]).join(',');
    const rows = results.map((result) =>
      Object.values(result)
        .map((value) => {
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return typeof value === 'string'
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(',')
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    const endpointTypeSummary = Object.entries(
      report.summary.tests_by_endpoint_type
    )
      .map(
        ([type, stats]) =>
          `<tr>
          <td>${type}</td>
          <td>${stats.total}</td>
          <td class="pass">${stats.passed}</td>
          <td class="fail">${stats.failed}</td>
          <td class="error">${stats.errors}</td>
          <td class="slow">${stats.slow}</td>
        </tr>`
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <title>LUX Endpoint Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .pass { color: green; }
        .fail { color: red; }
        .error { color: orange; }
        .slow { color: blue; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .status-PASS { background-color: #d4edda; }
        .status-FAIL { background-color: #f8d7da; }
        .status-ERROR { background-color: #fff3cd; }
        .status-SLOW { background-color: #d1ecf1; }
        .url-column { font-size: 0.9em; word-break: break-all; max-width: 300px; }
        .url-link { color: #0066cc; text-decoration: none; }
        .url-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>LUX Endpoint Test Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Generated:</strong> ${report.summary.timestamp}</p>
        <p><strong>Total Tests:</strong> ${report.summary.total_tests}</p>
        <p><strong>Passed:</strong> <span class="pass">${
          report.summary.passed
        }</span></p>
        <p><strong>Failed:</strong> <span class="fail">${
          report.summary.failed
        }</span></p>
        <p><strong>Errors:</strong> <span class="error">${
          report.summary.errors
        }</span></p>
        <p><strong>Slow:</strong> <span class="slow">${
          report.summary.slow
        }</span></p>
        <p><strong>Average Duration:</strong> ${Math.round(
          report.summary.average_duration
        )}ms</p>
        <p><strong>Total Duration:</strong> ${Math.round(
          report.summary.total_duration
        )}ms</p>
    </div>

    <h2>Tests by Endpoint Type</h2>
    <table>
        <thead>
            <tr>
                <th>Endpoint Type</th>
                <th>Total</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Errors</th>
                <th>Slow</th>
            </tr>
        </thead>
        <tbody>
            ${endpointTypeSummary}
        </tbody>
    </table>

    <h2>Individual Test Results</h2>
    <table>
        <thead>
            <tr>
                <th>Test Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>Duration (ms)</th>
                <th>URL</th>
                <th>Response File</th>
                <th>Timestamp</th>
            </tr>
        </thead>
        <tbody>
            ${report.results
              .map(
                (result) => `
                <tr class="status-${result.status}">
                    <td>${result.test_name}</td>
                    <td>${result.endpoint_type}</td>
                    <td>${result.status}</td>
                    <td>${result.expected_status}</td>
                    <td>${result.actual_status}</td>
                    <td>${result.duration_ms || 'N/A'}</td>
                    <td class="url-column">${this.formatUrlForHtml(result.url)}</td>
                    <td>${result.response_body_file || 'N/A'}</td>
                    <td>${result.timestamp}</td>
                </tr>
            `
              )
              .join('')}
        </tbody>
    </table>
</body>
</html>`;
  }

  /**
   * Format URL for HTML display with proper encoding and hyperlink
   */
  formatUrlForHtml(url) {
    if (!url) {
      return 'N/A';
    }

    try {
      // Parse the URL to separate base URL and query parameters
      const urlObj = new URL(url);
      let baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      
      // Build query string with properly encoded parameters
      const encodedParams = [];
      const decodedParams = [];
      for (const [key, value] of urlObj.searchParams.entries()) {
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(value);
        encodedParams.push(`${encodedKey}=${encodedValue}`);
        decodedParams.push(`${key}=${value}`);
      }
      
      let fullEncodedUrl = baseUrl;
      if (encodedParams.length > 0) {
        fullEncodedUrl += '?' + encodedParams.join('&');
      }
      
      let fullDecodedUrl = baseUrl;
      if (decodedParams.length > 0) {
        fullDecodedUrl += '?' + decodedParams.join('&');
      }
      
      return `<a href="${fullEncodedUrl}" class="url-link" target="_blank" title="Open URL in new tab">${fullDecodedUrl}</a>`;
    } catch (error) {
      // If URL parsing fails, return the original URL as text
      const escapedUrl = url
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      return escapedUrl;
    }
  }
}

// CLI Interface
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let configDir = './configs';
  let reportsDir = './reports';
  let saveResponseBodies = false;
  let providers = null; // null means use all available providers
  let endpoints = null; // null means test all endpoints
  let dryRun = false; // dry-run mode - don't execute tests, just show what would be run
  let positionalArgIndex = 0;
  
  // Process command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--save-responses' || arg === '-r') {
      saveResponseBodies = true;
    } else if (arg === '--dry-run' || arg === '-d') {
      dryRun = true;
    } else if (arg === '--providers' || arg === '-p') {
      // Next argument should be comma-separated list of providers
      i++;
      if (i < args.length) {
        providers = args[i].split(',').map(p => p.trim());
      } else {
        console.error('Error: --providers requires a comma-separated list of provider names');
        process.exit(1);
      }
    } else if (arg === '--endpoints' || arg === '-e') {
      // Next argument should be comma-separated list of endpoints
      i++;
      if (i < args.length) {
        endpoints = args[i].split(',').map(e => e.trim());
      } else {
        console.error('Error: --endpoints requires a comma-separated list of endpoint types');
        process.exit(1);
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node run-tests.js [configDir] [reportsDir] [options]');
      console.log('');
      console.log('Arguments:');
      console.log('  configDir    Directory containing test configuration files (default: ./configs)');
      console.log('  reportsDir   Directory for test reports (default: ./reports)');
      console.log('');
      console.log('Options:');
      console.log('  --save-responses, -r          Save response bodies to disk');
      console.log('  --dry-run, -d                 Helpful to see resolved configuration and available filtering options');
      console.log('  --providers, -p <providers>   Comma-separated list of test data providers to use');
      console.log('                                (accepts either class names or provider IDs)');
      console.log('                                Examples: CsvTestDataProvider, SampleTestDataProvider');
      console.log('  --endpoints, -e <endpoints>   Comma-separated list of endpoint types to test');
      console.log('                                Available: search, auto-complete, facets, translate, etc.');
      console.log('  --help, -h                    Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  node run-tests.js');
      console.log('  node run-tests.js ./configs ./reports');
      console.log('  node run-tests.js --save-responses');
      console.log('  node run-tests.js --dry-run');
      console.log('  node run-tests.js --providers CsvTestDataProvider,SampleTestDataProvider');
      console.log('  node run-tests.js --providers csv-provider,sample-provider');
      console.log('  node run-tests.js --endpoints search,auto-complete');
      console.log('  node run-tests.js --dry-run --providers csv-provider --endpoints search');
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      // Positional arguments
      if (positionalArgIndex === 0) {
        configDir = arg;
        positionalArgIndex++;
      } else if (positionalArgIndex === 1) {
        reportsDir = arg;
        positionalArgIndex++;
      }
    }
  }

  if (!dryRun && !fs.existsSync(configDir)) {
    console.error(`Configuration directory not found: ${configDir}`);
    console.log('Usage: node run-tests.js [configDir] [reportsDir] [options]');
    console.log('Use --help for more information');
    process.exit(1);
  }

  console.log(`Configuration directory: ${configDir}`);
  console.log(`Reports directory: ${reportsDir}`);
  if (saveResponseBodies) {
    console.log('Response bodies will be saved to disk');
  }
  if (dryRun) {
    console.log('');
    console.log('DRY RUN MODE: Tests will not be executed, only planned test execution will be shown');
    console.log('');
  }

  const options = { 
    saveResponseBodies,
    providers,
    endpoints,
    dryRun
  };
  const tester = new EndpointTester(configDir, reportsDir, options);
  
  console.log(`Test execution directory: ${tester.executionDir}`);
  
  tester.runTests().catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export default EndpointTester;
