import XLSX from 'xlsx';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { getEndpointKeyFromPath, isDefined, parseBoolean } from './utils.js';
import { TestDataProviderFactory } from './test-data-providers/interface.js';
import { ENDPOINT_KEYS } from './constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration constants
const DEFAULT_CONFIG = {
  baseUrl: 'https://lux-middle-dev.collections.yale.edu',
  timeout: 10000,
  maxResponseTime: 5000,
  expectedStatus: 200,
  method: 'GET',
  delayAfterMs: 0,
};

const PARAMETER_CONFIG = {
  pathParams: ['scope'],
  bodyParams: {
    json: ['q', 'scope', 'page', 'pageLength', 'sort', 'facets'],
    formData: ['doc', 'unitName', 'lang', 'uri'],
  },
};

/**
 * Handles configuration file loading and parsing
 */
class ConfigurationLoader {
  constructor(configDir, endpointsSpec = null) {
    this.configDir = configDir;
    this.endpointsSpec = endpointsSpec;
  }

  /**
   * Load and parse all configuration files with filtering
   */
  loadConfigs(endpointFilter = null) {
    const configs = [];
    const files = this.getValidConfigFiles();

    for (const file of files) {
      const filePath = path.join(this.configDir, file);
      const endpointType = this.extractEndpointType(file);

      if (endpointFilter && !endpointFilter.includes(endpointType)) {
        continue;
      }

      try {
        const testConfigs = this.loadSingleConfig(filePath, endpointType);
        configs.push(...testConfigs);
      } catch (error) {
        console.error(`Error loading ${file}: ${error.message}`);
      }
    }

    return configs;
  }

  /**
   * Get valid configuration files (xlsx/csv, not temp files)
   */
  getValidConfigFiles() {
    return fs
      .readdirSync(this.configDir)
      .filter(file => file.endsWith('.xlsx') || file.endsWith('.csv'))
      .filter(file => !file.startsWith('~'));
  }

  /**
   * Extract endpoint type from filename
   */
  extractEndpointType(filename) {
    const baseName = path.basename(filename, path.extname(filename));
    return baseName.replace(/-tests?$/, '').replace(/_tests?$/, '');
  }

  /**
   * Load test configuration from Excel/CSV file
   */
  loadSingleConfig(filePath, endpointType) {
    let data;

    if (filePath.endsWith('.xlsx')) {
      data = this.parseExcelFile(filePath);
    } else {
      data = this.parseCSVFile(filePath);
    }

    return data.map((row, index) =>
      this.transformRowToConfig(row, endpointType, filePath, index, data.length)
    );
  }

  /**
   * Parse Excel file to JSON
   */
  parseExcelFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  /**
   * Parse CSV file to JSON
   */
  parseCSVFile(filePath) {
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
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
   * Transform spreadsheet row to standardized test configuration
   */
  transformRowToConfig(row, endpointType, sourceFile, rowIndex, totalRows) {
    const testConfig = {
      provider_id: row.provider_id || '',
      test_name: row.test_name || `${endpointType}_test_${Date.now()}`,
      endpoint_type: endpointType,
      source_file: path.basename(sourceFile),
      row_number: rowIndex + 2,
      total_rows: totalRows + 1,
      method: row.method || this.getEndpointMethod(endpointType) || DEFAULT_CONFIG.method,
      base_endpoint: row.base_endpoint || this.getEndpointPath(endpointType) || '/',
      endpoint_tests: row.endpoint_tests || this.getEndpointTests(endpointType),
      expected_status: parseInt(row.expected_status) || DEFAULT_CONFIG.expectedStatus,
      timeout_ms: parseInt(row.timeout_ms) || DEFAULT_CONFIG.timeout,
      max_response_time: parseInt(row.max_response_time) || DEFAULT_CONFIG.maxResponseTime,
      delay_after_ms: parseInt(row.delay_after_ms) || DEFAULT_CONFIG.delayAfterMs,
      enabled: row.enabled === 'true' || row.enabled === true,
      description: row.description || '',
      tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
      parameters: this.extractParameters(row),
    };

    return testConfig;
  }

  /**
   * Extract parameters from row (columns starting with 'param:')
   */
  extractParameters(row) {
    const parameters = {};
    Object.keys(row).forEach(key => {
      if (key.startsWith('param:')) {
        const paramName = key.substring(6);
        const paramValue = row[key];
        if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
          parameters[paramName] = paramValue;
        }
      }
    });
    return parameters;
  }

  /**
   * Get endpoint method from spec
   */
  getEndpointMethod(endpointType) {
    if (this.endpointsSpec?.endpoints) {
      const endpoint = this.endpointsSpec.endpoints.find(ep => {
        const specKey = getEndpointKeyFromPath(ep.path, ep.method);
        return specKey === endpointType;
      });
      
      if (endpoint) {
        return endpoint.method;
      }
    }

    return null;
  }

  /**
   * Get endpoint path from spec
   */
  getEndpointPath(endpointType) {
    if (this.endpointsSpec?.endpoints) {
      const endpoint = this.endpointsSpec.endpoints.find(ep => {
        const specKey = getEndpointKeyFromPath(ep.path, ep.method);
        return specKey === endpointType;
      });
      
      if (endpoint) {
        return endpoint.path;
      }
    }

    return null;
  }

  /**
   * Get endpoint tests path with parameters
   */
  getEndpointTests(endpointType) {
    if (this.endpointsSpec?.endpoints) {
      const endpoint = this.endpointsSpec.endpoints.find(ep => {
        const specKey = getEndpointKeyFromPath(ep.path, ep.method);
        return specKey === endpointType;
      });
      
      if (endpoint) {
        return endpoint.path;
      }
    }

    return '/';
  }
}

/**
 * Handles HTTP request building and execution
 */
class RequestHandler {
  constructor(baseUrl, authConfig = {}) {
    this.baseUrl = baseUrl;
    this.authConfig = authConfig;
  }

  /**
   * Build and execute HTTP request for test configuration
   */
  async executeRequest(testConfig) {
    const url = this.buildUrl(testConfig);
    const body = this.buildBody(testConfig);
    const headers = this.buildHeaders(testConfig);
    const auth = this.buildAuth();

    const requestConfig = {
      method: testConfig.method,
      url,
      headers,
      timeout: testConfig.timeout_ms,
      validateStatus: () => true, // Accept all status codes
      ...(body && { data: body }),
      ...(auth && { auth }),
    };

    return axios(requestConfig);
  }

  /**
   * Build complete URL from test configuration
   */
  buildUrl(testConfig) {
    let url = this.baseUrl;
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

    // Add query parameters
    const queryParams = this.buildQueryParams(testConfig, pathParams);
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
   * Build query parameters array
   */
  buildQueryParams(testConfig, pathParams = []) {
    const queryParams = [];
    const allPathParams = [...PARAMETER_CONFIG.pathParams, ...pathParams];

    Object.entries(testConfig.parameters).forEach(([key, value]) => {
      if (this.isQueryParameter(key, testConfig, allPathParams)) {
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    });

    return queryParams;
  }

  /**
   * Determine if parameter should be in query string
   */
  isQueryParameter(paramName, testConfig, pathParams = []) {
    if (pathParams.includes(paramName)) {
      return false;
    }

    const { method, endpoint_type } = testConfig;
    if ((method === 'POST' || method === 'PUT') && 
        PARAMETER_CONFIG.bodyParams.formData.includes(paramName)) {
      return false;
    }

    return true;
  }

  /**
   * Build request body
   */
  buildBody(testConfig) {
    if (testConfig.method === 'GET' || testConfig.method === 'DELETE') {
      return null;
    }

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

    Object.entries(testConfig.parameters).forEach(([key, value]) => {
      if (PARAMETER_CONFIG.bodyParams.json.includes(key)) {
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
      if (PARAMETER_CONFIG.bodyParams.formData.includes(key)) {
        formData.append(key, value);
      }
    });

    return formData.toString();
  }

  /**
   * Parse parameter value (handle JSON, arrays, etc.)
   */
  parseParameterValue(value) {
    if (typeof value === 'string') {
      // Try to parse as JSON
      if ((value.startsWith('{') && value.endsWith('}')) ||
          (value.startsWith('[') && value.endsWith(']'))) {
        try {
          return JSON.parse(value);
        } catch {
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
   * Build request headers
   */
  buildHeaders(testConfig) {
    const headers = {
      'User-Agent': 'LUX-Endpoint-Tester/1.0',
    };

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
   * Build authentication configuration
   */
  buildAuth() {
    if (this.authConfig.type === 'digest' && 
        this.authConfig.username && 
        this.authConfig.password) {
      return {
        username: this.authConfig.username,
        password: this.authConfig.password,
      };
    }
    return null;
  }
}

/**
 * Handles response analysis and additional info extraction
 */
class ResponseAnalyzer {
  /**
   * Extract additional endpoint-specific information from response
   */
  extractAdditionalInfo(testConfig, response) {
    if (!response?.data) {
      return null;
    }

    const { endpoint_type } = testConfig;
    const { data } = response;

    switch (endpoint_type) {
      case ENDPOINT_KEYS.GET_FACETS:
        return this.extractOrderedItemsInfo('Facet Values', data);
      case ENDPOINT_KEYS.GET_SEARCH:
        return this.extractOrderedItemsInfo('Results Count', data);
      case ENDPOINT_KEYS.GET_SEARCH_ESTIMATE:
        return this.extractOrderedItemsInfo('Estimate', data);
      case ENDPOINT_KEYS.GET_SEARCH_WILL_MATCH:
        return this.extractWillMatchInfo('Will Match', data);
      default:
        return null;
    }
  }

  /**
   * Extract ordered items information
   */
  extractOrderedItemsInfo(header, data) {
    let value = 'N/A';
    
    if (data.orderedItems && Array.isArray(data.orderedItems)) {
      value = data.orderedItems.length;
    } else if (data.totalItems !== undefined) {
      value = data.totalItems;
    } else if (data.results && Array.isArray(data.results)) {
      value = data.results.length;
    }
    
    return { value, header };
  }

  /**
   * Extract will match information from data properties
   */
  extractWillMatchInfo(header, data) {
    if (!data || typeof data !== 'object') {
      return { value: 'N/A', header };
    }

    const results = [];
    Object.keys(data).forEach(propertyName => {
      const propertyData = data[propertyName];
      if (propertyData && typeof propertyData === 'object' && 
          propertyData.hasOneOrMoreResult !== undefined) {
        results.push({ name: propertyName, value: propertyData.hasOneOrMoreResult });
      }
    });

    let value = 'N/A';
    if (results.length === 1 && results[0].name === 'unnamed') {
      // Special case: single unnamed result, return just the value
      value = results[0].value;
    } else if (results.length > 0) {
      // Multiple results or named results, return formatted list
      value = results.map(r => `${r.name}: ${r.value}`).join(' | ');
    }

    return { value, header };
  }
}

/**
 * Handles response body file saving
 */
class ResponseSaver {
  constructor(responsesDir, enabled = false) {
    this.responsesDir = responsesDir;
    this.enabled = enabled;
  }

  /**
   * Save response body to disk if enabled
   */
  saveResponseBody(provider, testName, response, sourceFile, rowNumber, totalRows) {
    if (!this.enabled) return null;
    
    try {
      const providerDir = this.createProviderDirectory(sourceFile, provider);
      const filename = this.createFilename(testName, rowNumber, totalRows);
      const filePath = path.join(providerDir, filename);
      
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
      
      return `${providerDir}/${filename}`;
    } catch (error) {
      console.warn(`  Failed to save response body: ${error.message}`);
      return null;
    }
  }

  /**
   * Create provider-specific directory
   */
  createProviderDirectory(sourceFile, provider) {
    const endpointDir = path.basename(sourceFile, path.extname(sourceFile));
    const providerDir = path.join(this.responsesDir, endpointDir, provider);

    if (!fs.existsSync(providerDir)) {
      fs.mkdirSync(providerDir, { recursive: true });
    }
    
    return providerDir;
  }

  /**
   * Create safe filename for response
   */
  createFilename(testName, rowNumber, totalRows) {
    const maxDigits = Math.max(totalRows.toString().length, 2);
    const paddedRowNumber = rowNumber.toString().padStart(maxDigits, '0');
    
    const safeTestName = testName
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .split(' ')
      .map((word, index) => 
        index === 0 ? word.toLowerCase() : 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
      
    return `confRow${paddedRowNumber}_${safeTestName}.json`;
  }
}

/**
 * Main endpoint testing class - refactored for maintainability
 */
class EndpointTester {
  constructor(configDir, reportsDir = './reports', options = {}) {
    this.configDir = configDir;
    this.reportsDir = reportsDir;
    this.results = [];
    this.options = options;

    // Initialize configuration
    this.initializeDirectories();
    this.initializeComponents();
    this.loadEndpointsSpec();
  }

  /**
   * Initialize directory structure
   */
  initializeDirectories() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    this.executionDir = path.join(this.reportsDir, `test-run-${timestamp}`);
    this.responsesDir = path.join(this.executionDir, 'responses');

    if (!this.options.dryRun) {
      // Ensure directories exist
      [this.reportsDir, this.executionDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      if (this.options.saveResponseBodies && !fs.existsSync(this.responsesDir)) {
        fs.mkdirSync(this.responsesDir, { recursive: true });
      }
    }
  }

  /**
   * Initialize helper components
   */
  initializeComponents() {
    // Base URL configuration
    const baseUrl = process.env.BASE_URL || DEFAULT_CONFIG.baseUrl;

    // Authentication configuration
    const authConfig = {
      type: process.env.AUTH_TYPE || 'none',
      username: process.env.AUTH_USERNAME || null,
      password: process.env.AUTH_PASSWORD || null,
    };

    // Validate authentication
    if (authConfig.type === 'digest' && (!authConfig.username || !authConfig.password)) {
      throw new Error('Digest authentication requires both AUTH_USERNAME and AUTH_PASSWORD environment variables');
    }

    // Initialize components
    this.configLoader = new ConfigurationLoader(this.configDir);
    this.requestHandler = new RequestHandler(baseUrl, authConfig);
    this.responseAnalyzer = new ResponseAnalyzer();
    this.responseSaver = new ResponseSaver(this.responsesDir, this.options.saveResponseBodies);
    this.reportGenerator = new ReportGenerator(this.executionDir, this.responseSaver.enabled);
  }

  /**
   * Initialize async dependencies
   */
  async initializeAsync() {
    // Load test data providers
    await import('./test-data-providers/index.js');
  }

  /**
   * Load endpoints specification
   */
  loadEndpointsSpec() {
    try {
      const endpointsSpecPath = path.join(__dirname, 'endpoints-spec.json');
      if (fs.existsSync(endpointsSpecPath)) {
        const spec = JSON.parse(fs.readFileSync(endpointsSpecPath, 'utf8'));
        this.configLoader.endpointsSpec = spec;
        console.log(`Loaded ${spec.endpoints?.length || 0} endpoint specifications`);
      } else {
        console.warn(`Warning: endpoints-spec.json not found. Run 'node create-endpoints-spec.js' to generate it.`);
      }
    } catch (error) {
      console.warn(`Warning: Could not load endpoints-spec.json: ${error.message}`);
    }
  }

  /**
   * Run all tests with filtering support
   */
  async runFilteredTests() {
    // Initialize async dependencies first
    await this.initializeAsync();
    
    // Validate providers and endpoints after async initialization
    if (this.options.providers || this.options.endpoints) {
      if (this.options.providers) {
        const availableProviders = this.getAvailableProviders();
        const invalidProviders = this.options.providers.filter(p => !availableProviders.includes(p));
        if (invalidProviders.length > 0) {
          throw new Error(`Unknown provider(s): ${invalidProviders.join(', ')}\nAvailable providers:\n\t${availableProviders.join('\n\t')}`);
        }
      }
      
      if (this.options.endpoints) {
        const availableEndpoints = this.getAvailableEndpoints();
        const invalidEndpoints = this.options.endpoints.filter(e => !availableEndpoints.includes(e));
        if (invalidEndpoints.length > 0) {
          throw new Error(`Unknown endpoint(s): ${invalidEndpoints.join(', ')}\nAvailable endpoints:\n\t${availableEndpoints.join('\n\t')}`);
        }
      }
    }
    
    this.displayConfiguration();
    
    const testConfigs = this.configLoader.loadConfigs(this.options.endpoints);
    this.displayTestDistribution(testConfigs);

    if (this.options.dryRun) {
      this.displayDryRunSummary(testConfigs);
      return;
    }

    console.log('\n=== EXECUTING TESTS ===');
    await this.executeTests(testConfigs);
    this.generateReports();
  }

  /**
   * Display configuration information
   */
  displayConfiguration() {
    console.log('');
    console.log('Resolved:');
    this.logValues('  Requested providers', this.getProvidersIncluded());
    this.logValues('  Requested endpoints', this.getEndpointsIncluded());
    console.log('');

    console.log('Filtering options:');
    this.logValues('  Available providers', this.getAvailableProviders());
    this.logValues('  Available endpoints', this.getAvailableEndpoints());
    console.log('');
  }

  /**
   * Display test distribution by endpoint type
   */
  displayTestDistribution(testConfigs) {
    console.log(`Found ${testConfigs.length} test configurations across ${
      [...new Set(testConfigs.map(t => t.source_file))].length
    } files`);

    const testsByType = this.groupTestsByType(testConfigs);
    console.log('\nTest distribution by endpoint type:');
    Object.entries(testsByType).forEach(([type, tests]) => {
      const enabledCount = tests.filter(config => this.shouldRunTest(config)).length;
      const disabledCount = tests.length - enabledCount;
      console.log(`  ${type}: ${tests.length} tests (${enabledCount} enabled, ${disabledCount} filtered out)`);
    });

    // Overall summary
    const totalEnabled = testConfigs.filter(config => this.shouldRunTest(config)).length;
    const totalDisabled = testConfigs.length - totalEnabled;
    if (totalDisabled > 0) {
      console.log(`\nOverall: ${totalEnabled} tests will be executed, ${totalDisabled} tests filtered out`);
    }
  }

  /**
   * Display dry run summary
   */
  displayDryRunSummary(testConfigs) {
    const enabledCount = testConfigs.filter(config => this.shouldRunTest(config)).length;
    const disabledCount = testConfigs.length - enabledCount;

    console.log('');
    console.log('=== DRY RUN SUMMARY ===');
    console.log(`Total tests found: ${testConfigs.length}`);
    console.log(`Tests that would be executed: ${enabledCount}`);
    console.log(`Tests that would be skipped: ${disabledCount}`);
    console.log(`Estimated execution time: ${enabledCount * 2}s - ${enabledCount * 10}s (rough estimate)`);
    console.log('\nNo actual HTTP requests were made.');
    console.log('To execute these tests, run the same command without --dry-run');
  }

  /**
   * Execute all valid tests
   */
  async executeTests(testConfigs) {
    for (const testConfig of testConfigs) {
      if (this.shouldRunTest(testConfig)) {
        const result = await this.runSingleTest(testConfig);
        this.results.push(result);

        if (testConfig.delay_after_ms > 0) {
          console.log(`  Waiting ${testConfig.delay_after_ms}ms...`);
          await this.delay(testConfig.delay_after_ms);
        }
      }
    }
  }

  /**
   * Run a single test configuration
   */
  async runSingleTest(testConfig) {
    const startTime = Date.now();

    try {
      console.log(
        `Running test ${testConfig.test_name} as ${
          testConfig.method
        } ${this.requestHandler.buildUrl(testConfig)}`
      );

      const response = await this.requestHandler.executeRequest(testConfig);
      const duration = Date.now() - startTime;
      const timestamp = new Date().toISOString();

      // Save response body if enabled
      const responseBodyFile = this.responseSaver.saveResponseBody(
        testConfig.provider_id, 
        testConfig.test_name,
        response, 
        testConfig.source_file, 
        testConfig.row_number, 
        testConfig.total_rows
      );

      // Extract additional info
      const additionalInfo = this.responseAnalyzer.extractAdditionalInfo(testConfig, response);

      return this.createTestResult(testConfig, response, duration, timestamp, additionalInfo, responseBodyFile);
    } catch (error) {
      return this.createErrorResult(testConfig, error, Date.now() - startTime);
    }
  }

  /**
   * Create test result object
   */
  createTestResult(testConfig, response, duration, timestamp, additionalInfo, responseBodyFile) {
    const statusMatches = response.status === testConfig.expected_status;
    let status = statusMatches ? 'PASS' : 'FAIL';

    // Check response time for passing tests
    if (statusMatches && testConfig.max_response_time && duration > testConfig.max_response_time) {
      status = 'SLOW';
    }

    const result = {
      provider_id: testConfig.provider_id,
      test_name: testConfig.test_name,
      endpoint_type: testConfig.endpoint_type,
      source_file: testConfig.source_file,
      status,
      expected_status: testConfig.expected_status,
      actual_status: response.status,
      duration_ms: duration,
      response_time_ms: duration,
      response_size_bytes: JSON.stringify(response.data).length,
      url: this.requestHandler.buildUrl(testConfig),
      method: testConfig.method,
      parameters: testConfig.parameters,
      timestamp,
      description: testConfig.description,
      tags: testConfig.tags,
    };

    // Add additional info if available
    if (additionalInfo) {
      result.additional_info = additionalInfo.value;
      result.additional_info_header = additionalInfo.header;
    }

    // Add response body file if saved
    if (responseBodyFile) {
      result.response_body_file = responseBodyFile;
    }

    // Add failure reason if needed
    if (!statusMatches) {
      result.error_message = `Expected status ${testConfig.expected_status} but got ${response.status}`;
    } else if (status === 'SLOW') {
      result.warning = `Response time ${duration}ms exceeded threshold ${testConfig.max_response_time}ms`;
    }

    return result;
  }

  /**
   * Create error result object
   */
  createErrorResult(testConfig, error, duration) {
    let responseBodyFile = null;
    let additionalInfo = null;

    if (error.response) {
      responseBodyFile = this.responseSaver.saveResponseBody(
        testConfig.provider_id,
        testConfig.test_name,
        error.response,
        testConfig.source_file,
        testConfig.row_number,
        testConfig.total_rows
      );
      additionalInfo = this.responseAnalyzer.extractAdditionalInfo(testConfig, error.response);
    }

    const result = {
      test_name: testConfig.test_name,
      provider_id: testConfig.provider_id,
      endpoint_type: testConfig.endpoint_type,
      source_file: testConfig.source_file,
      status: 'FAIL',
      expected_status: testConfig.expected_status,
      actual_status: error.response?.status || 'ERROR',
      duration_ms: duration,
      error_message: error.message,
      url: this.requestHandler.buildUrl(testConfig),
      method: testConfig.method,
      parameters: testConfig.parameters,
      timestamp: new Date().toISOString(),
      description: testConfig.description,
      tags: testConfig.tags,
    };

    if (additionalInfo) {
      result.additional_info = additionalInfo.value;
      result.additional_info_header = additionalInfo.header;
    }

    if (responseBodyFile) {
      result.response_body_file = responseBodyFile;
    }

    return result;
  }

  /**
   * Determine if test should be executed
   */
  shouldRunTest(testConfig) {
    // Apply provider filter
    if (this.options.providers && !this.options.providers.includes(testConfig.provider_id)) {
      return false;
    }

    // Check if test is enabled
    if (!parseBoolean(testConfig.enabled)) {
      return false;
    }

    return true;
  }

  /**
   * Generate all reports
   */
  generateReports() {
    this.reportGenerator.generate(this.results, {
      providersIncluded: this.getProvidersIncluded(),
      endpointsIncluded: this.getEndpointsIncluded(),
    });
  }

  // Utility methods
  logValues(label, values, defaultValue = 'None') {
    const formattedValues = values && values.length > 0 ? values.join('\n\t') : defaultValue;
    console.log(`${label}:\n\t${formattedValues}`);
  }

  groupTestsByType(testConfigs) {
    const testsByType = {};
    testConfigs.forEach(config => {
      if (!testsByType[config.endpoint_type]) {
        testsByType[config.endpoint_type] = [];
      }
      testsByType[config.endpoint_type].push(config);
    });
    return testsByType;
  }

  getAvailableProviders() {
    const registeredProviders = TestDataProviderFactory.getRegisteredProviders();
    return registeredProviders.map(ProviderClass => ProviderClass.name).sort();
  }

  getAvailableEndpoints() {
    return this.configLoader.getValidConfigFiles()
      .map(file => this.configLoader.extractEndpointType(file))
      .sort();
  }

  getProvidersIncluded() {
    return this.options.providers?.length ? this.options.providers.sort() : ['All'];
  }

  getEndpointsIncluded() {
    return this.options.endpoints?.length ? this.options.endpoints.sort() : ['All'];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Handles report generation (JSON, CSV, HTML)
 */
class ReportGenerator {
  constructor(executionDir, saveResponseBodies = false) {
    this.executionDir = executionDir;
    this.saveResponseBodies = saveResponseBodies;
  }

  /**
   * Generate all reports
   */
  generate(results, options = {}) {
    const { providersIncluded = ['All'], endpointsIncluded = ['All'] } = options;

    const summary = this.createSummary(results, providersIncluded, endpointsIncluded);
    const report = { summary, results };

    // Generate all report formats
    this.generateJSONReport(report);
    this.generateCSVReport(results);
    this.generateHTMLReport(report);

    this.displaySummary(summary);
  }

  /**
   * Create test summary
   */
  createSummary(results, providersIncluded, endpointsIncluded) {
    const statusCounts = this.getStatusCounts(results);
    
    return {
      total_tests: results.length,
      ...statusCounts,
      average_duration: this.calculateAverageDuration(results),
      total_duration: this.calculateTotalDuration(results),
      tests_by_endpoint_type: this.getTestsByEndpointType(results),
      providers_included: providersIncluded,
      endpoints_included: endpointsIncluded,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get status counts
   */
  getStatusCounts(results) {
    return {
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      errors: results.filter(r => r.status === 'ERROR').length,
      slow: results.filter(r => r.status === 'SLOW').length,
    };
  }

  /**
   * Calculate average duration
   */
  calculateAverageDuration(results) {
    if (results.length === 0) return 0;
    const totalDuration = results.reduce((sum, r) => sum + (r.duration_ms || 0), 0);
    return totalDuration / results.length;
  }

  /**
   * Calculate total duration
   */
  calculateTotalDuration(results) {
    return results.reduce((sum, r) => sum + (r.duration_ms || 0), 0);
  }

  /**
   * Get test counts by endpoint type
   */
  getTestsByEndpointType(results) {
    const summary = {};
    results.forEach(result => {
      const type = result.endpoint_type;
      if (!summary[type]) {
        summary[type] = { total: 0, passed: 0, failed: 0, errors: 0, slow: 0 };
      }
      summary[type].total++;
      
      // Map status to the correct counter property
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
   * Generate JSON report
   */
  generateJSONReport(report) {
    const reportFile = path.join(this.executionDir, 'endpoint-test-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    return reportFile;
  }

  /**
   * Generate CSV report
   */
  generateCSVReport(results) {
    if (results.length === 0) return null;
    
    const csvFile = path.join(this.executionDir, 'endpoint-test-report.csv');
    const csvContent = this.convertToCSV(results);
    fs.writeFileSync(csvFile, csvContent);
    return csvFile;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    const htmlFile = path.join(this.executionDir, 'endpoint-test-report.html');
    const htmlContent = this.createHTMLContent(report);
    fs.writeFileSync(htmlFile, htmlContent);
    return htmlFile;
  }

  /**
   * Convert results to CSV format
   */
  convertToCSV(results) {
    if (results.length === 0) return '';

    const headers = Object.keys(results[0]).join(',');
    const rows = results.map(result =>
      Object.values(result)
        .map(value => {
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
   * Create HTML content
   */
  createHTMLContent(report) {
    const endpointTypeSummary = Object.entries(report.summary.tests_by_endpoint_type)
      .map(([type, stats]) =>
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
    ${this.getHTMLStyles()}
</head>
<body>
    <h1>LUX Endpoint Test Report</h1>
    
    ${this.createSummarySection(report.summary)}
    ${this.createEndpointTypeSection(endpointTypeSummary)}
    ${this.createTestResultsSection(report)}
    ${this.createModalSections()}
    ${this.getJavaScriptFunctions()}
</body>
</html>`;
  }

  /**
   * Get HTML styles
   */
  getHTMLStyles() {
    return `<style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .pass { color: green; }
        .fail { color: red; }
        .error { color: orange; }
        .slow { color: blue; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .filter-container { margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; border: 1px solid #dee2e6; }
        .filter-group { display: inline-block; margin-right: 20px; }
        .filter-label { font-weight: bold; margin-right: 5px; }
        .filter-select { padding: 5px 10px; border: 1px solid #ccc; border-radius: 3px; background-color: white; }
        .filter-button { padding: 5px 10px; margin-left: 10px; border: 1px solid #ccc; border-radius: 3px; background-color: #f8f9fa; cursor: pointer; }
        .filter-button:hover { background-color: #e9ecef; }
        .hidden { display: none !important; }
        .filter-info { font-size: 0.9em; color: #666; margin-top: 10px; }
        .sortable { cursor: pointer; position: relative; user-select: none; }
        .sortable:hover { background-color: #e9ecef; }
        .sort-arrow { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); font-size: 12px; opacity: 0.5; }
        .sort-arrow.asc::after { content: '▲'; }
        .sort-arrow.desc::after { content: '▼'; }
        .sortable:hover .sort-arrow { opacity: 1; }
        .status-PASS { background-color: #d4edda; }
        .status-FAIL { background-color: #f8d7da; }
        .status-ERROR { background-color: #fff3cd; }
        .status-SLOW { background-color: #d1ecf1; }
        .url-column { font-size: 0.9em; word-break: break-all; max-width: 300px; }
        .url-link { color: #0066cc; text-decoration: none; }
        .url-link:hover { text-decoration: underline; }
        .info-icon { color: #0066cc; cursor: help; margin-left: 5px; font-size: 0.9em; opacity: 0.7; }
        .info-icon:hover { opacity: 1; }
        .json-link { color: #0066cc; text-decoration: none; cursor: pointer; margin-left: 8px; font-size: 14px; padding: 2px 6px; background-color: #f0f8ff; border: 1px solid #0066cc; border-radius: 3px; display: inline-block; vertical-align: middle; }
        .json-link:hover { background-color: #e6f3ff; color: #0052a3; }
        .json-popup { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 1000; }
        .json-popup-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; padding: 20px; border-radius: 8px; max-width: 80%; max-height: 80%; overflow: auto; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); }
        .json-popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .json-popup-buttons { display: flex; gap: 10px; }
        .json-popup-copy { background: #4CAF50; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-size: 14px; }
        .json-popup-copy:hover { background: #45a049; }
        .json-popup-close { background: #f44336; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-size: 14px; }
        .json-popup-close:hover { background: #d32f2f; }
        .json-content { background-color: #f8f8f8; border: 1px solid #ddd; padding: 15px; border-radius: 4px; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; overflow-x: auto; }
        .endpoint-section { margin-bottom: 30px; }
        .endpoint-header { 
            display: flex; 
            align-items: center; 
            cursor: pointer; 
            padding: 10px; 
            background-color: #f8f9fa; 
            border: 1px solid #dee2e6; 
            border-radius: 5px; 
            margin-bottom: 10px; 
            transition: background-color 0.2s ease;
        }
        .endpoint-header:hover { 
            background-color: #e9ecef; 
        }
        .endpoint-toggle { 
            margin-right: 10px; 
            font-size: 16px; 
            font-weight: bold; 
            color: #495057;
            transition: transform 0.2s ease;
        }
        .endpoint-toggle.collapsed { 
            transform: rotate(-90deg); 
        }
        .endpoint-title { 
            margin: 0; 
            font-size: 18px; 
            font-weight: bold; 
            color: #495057;
        }
        .endpoint-table { 
            display: block; 
            transition: all 0.3s ease; 
            overflow: hidden; 
        }
        .endpoint-table.collapsed { 
            display: none; 
        }
    </style>`;
  }

  /**
   * Create summary section
   */
  createSummarySection(summary) {
    return `
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Generated:</strong> ${summary.timestamp}</p>
        <p><strong>Providers Included:</strong> ${summary.providers_included.join(', ')}</p>
        <p><strong>Endpoints Included:</strong> ${summary.endpoints_included.join(', ')}</p>
        <p><strong>Total Tests:</strong> ${summary.total_tests}</p>
        <p><strong>Passed:</strong> <span class="pass">${summary.passed}</span></p>
        <p><strong>Failed:</strong> <span class="fail">${summary.failed}</span></p>
        <p><strong>Errors:</strong> <span class="error">${summary.errors}</span></p>
        <p><strong>Slow:</strong> <span class="slow">${summary.slow}</span></p>
        <p><strong>Average Duration:</strong> ${Math.round(summary.average_duration)}ms</p>
        <p><strong>Total Duration:</strong> ${Math.round(summary.total_duration)}ms</p>
    </div>`;
  }

  /**
   * Create endpoint type section
   */
  createEndpointTypeSection(endpointTypeSummary) {
    return `
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
    </table>`;
  }

  /**
   * Create test results section
   */
  createTestResultsSection(report) {
    return `
    <h2>Individual Test Results</h2>
    <div class="filter-container">
        <div class="filter-group">
            <span class="filter-label">Filter by Status:</span>
            <select id="statusFilter" class="filter-select" onchange="filterByStatus()">
                <option value="">All Statuses</option>
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
                <option value="ERROR">ERROR</option>
                <option value="SLOW">SLOW</option>
            </select>
        </div>
        <div class="filter-group">
            <button onclick="clearFilters()" class="filter-button">Clear Filters</button>
        </div>
        <div id="filterInfo" class="filter-info"></div>
    </div>
    ${this.generateTestResultsByEndpointType(report)}`;
  }

  /**
   * Create modal sections
   */
  createModalSections() {
    return `
    <!-- JSON Popup Modal -->
    <div id="jsonPopup" class="json-popup" onclick="closeJsonPopup(event)">
        <div class="json-popup-content" onclick="event.stopPropagation()">
            <div class="json-popup-header">
                <h3>Search Criteria</h3>
                <div class="json-popup-buttons">
                    <button class="json-popup-copy" onclick="copyJsonAsDisplayed(event)" title="Copy JSON as displayed">Copy JSON</button>
                    <button class="json-popup-copy" onclick="copyJsonAsEncoded(event)" title="Copy JSON as URL-encoded">Copy URL-Encoded</button>
                    <button class="json-popup-close" onclick="closeJsonPopup()">Close</button>
                </div>
            </div>
            <div id="jsonContent" class="json-content"></div>
        </div>
    </div>

    <!-- Response Body Popup Modal -->
    <div id="responsePopup" class="json-popup" onclick="closeResponsePopup(event)">
        <div class="json-popup-content" onclick="event.stopPropagation()">
            <div class="json-popup-header">
                <h3>Response Body</h3>
                <div class="json-popup-buttons">
                    <button class="json-popup-copy" onclick="copyResponseAsDisplayed(event)" title="Copy response body as displayed">Copy JSON</button>
                    <button class="json-popup-close" onclick="closeResponsePopup()">Close</button>
                </div>
            </div>
            <div id="responseContent" class="json-content"></div>
        </div>
    </div>`;
  }

  /**
   * Generate test results grouped by endpoint type
   */
  generateTestResultsByEndpointType(report) {
    const resultsByType = {};
    report.results.forEach(result => {
      const type = result.endpoint_type;
      if (!resultsByType[type]) {
        resultsByType[type] = [];
      }
      resultsByType[type].push(result);
    });

    return Object.entries(resultsByType)
      .map(([endpointType, results]) => {
        const additionalInfoHeaders = results
          .filter(result => result.additional_info_header)
          .map(result => result.additional_info_header);
        
        const columnHeader = additionalInfoHeaders.length > 0 
          ? additionalInfoHeaders.reduce((a, b, i, arr) =>
              arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
            )
          : 'Additional Info';

        // Determine if additional info column should be treated as numeric
        const additionalInfoValues = results
          .filter(result => result.additional_info !== undefined && result.additional_info !== null)
          .map(result => {
            // Convert to string if it's a number, otherwise clean the string
            if (typeof result.additional_info === 'number') {
              return result.additional_info.toString();
            } else if (typeof result.additional_info === 'string') {
              return result.additional_info.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            } else {
              return String(result.additional_info);
            }
          })
          .filter(value => value !== '');
        
        const isNumericColumn = additionalInfoValues.length > 0 && 
          additionalInfoValues.every(value => {
            // Check if it's a pure number (integer or decimal)
            return /^\d+(\.\d+)?$/.test(value) || value === 'N/A' || value === '';
          });
        
        const additionalInfoDataType = isNumericColumn ? 'number' : 'text';

        const sectionId = `endpoint-${endpointType.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const tableId = `table-${sectionId}`;
        const toggleId = `toggle-${sectionId}`;

        return `
        <div class="endpoint-section">
          <div class="endpoint-header" onclick="toggleEndpointTable('${sectionId}')">
            <span id="${toggleId}" class="endpoint-toggle">▼</span>
            <h3 class="endpoint-title">${this.escapeHtmlContent(endpointType)} (${results.length} tests)</h3>
          </div>
          <div id="${tableId}" class="endpoint-table">
            <table>
                <thead>
                    <tr>
                        <th class="sortable" onclick="sortTable('${tableId}', 0, 'text')">Test Name<span class="sort-arrow"></span></th>
                        <th class="sortable" onclick="sortTable('${tableId}', 1, 'text')">Status<span class="sort-arrow"></span></th>
                        <th class="sortable" onclick="sortTable('${tableId}', 2, 'number')">Expected<span class="sort-arrow"></span></th>
                        <th class="sortable" onclick="sortTable('${tableId}', 3, 'number')">Actual<span class="sort-arrow"></span></th>
                        <th class="sortable" onclick="sortTable('${tableId}', 4, 'duration')">Duration (ms)<span class="sort-arrow"></span></th>
                        <th class="sortable" onclick="sortTable('${tableId}', 5, '${additionalInfoDataType}')">${columnHeader}<span class="sort-arrow"></span></th>
                        <th>URL</th>
                        <th>Response Body</th>
                    </tr>
                </thead>
                <tbody>
                    ${results
                      .map(result => `
                        <tr class="status-${result.status}">
                            <td><span title="${this.getTestNameTooltip(result)}">${this.escapeHtmlContent(result.test_name)} <span class="info-icon">ℹ️</span></span></td>
                            <td>${this.escapeHtmlContent(result.status)}</td>
                            <td>${result.expected_status}</td>
                            <td>${result.actual_status}</td>
                            <td>${result.duration_ms || 'N/A'}</td>
                            <td>${result.additional_info !== undefined && result.additional_info !== null ? this.escapeHtmlContent(String(result.additional_info)) : 'N/A'}</td>
                            <td class="url-column">${this.formatUrlForHtml(result.url)}</td>
                            <td>${this.formatResponseBodyFileForHtml(result.response_body_file)}</td>
                        </tr>
                      `)
                      .join('')}
                </tbody>
            </table>
          </div>
        </div>
        `;
      })
      .join('');
  }

  /**
   * Escape HTML attribute values
   */
  escapeHtmlAttribute(text) {
    if (!text) return text;
    return text
      .replace(/&/g, '&amp;')     // Must be first
      .replace(/"/g, '&quot;')    // Double quotes
      .replace(/'/g, '&#39;')     // Single quotes  
      .replace(/</g, '&lt;')      // Less than
      .replace(/>/g, '&gt;')      // Greater than
      .replace(/\r?\n/g, '&#10;') // Line breaks to HTML entity
      .replace(/\t/g, '&#9;');    // Tabs to HTML entity
  }

  /**
   * Escape HTML content (for text nodes)
   */
  escapeHtmlContent(text) {
    if (!text) return text;
    return text
      .replace(/&/g, '&amp;')     // Must be first
      .replace(/</g, '&lt;')      // Less than
      .replace(/>/g, '&gt;');     // Greater than
  }

  /**
   * Get test name tooltip
   */
  getTestNameTooltip(result) {
    const providerText = this.escapeHtmlAttribute(result.provider_id || 'Not specified');
    const descriptionText = this.escapeHtmlAttribute(this.wrapText(result.description || 'Not specified'));
    const timestampText = this.escapeHtmlAttribute(result.timestamp || 'Unknown');
    
    return `Provider: ${providerText}&#10;
Description: ${descriptionText}&#10;
Timestamp: ${timestampText}`;
  }

  /**
   * Wrap text for tooltip display
   */
  wrapText(text, maxLength = 80) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    
    const words = text.split(' ');
    let currentLine = '';
    const lines = [];
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 > maxLength) {
        if (currentLine.length > 0) {
          lines.push(currentLine.trim());
          currentLine = word;
        } else {
          lines.push(word);
        }
      } else {
        currentLine += (currentLine.length > 0 ? ' ' : '') + word;
      }
    }
    
    if (currentLine.length > 0) {
      lines.push(currentLine.trim());
    }
    
    return lines.join('\n');  // Use actual newlines, escaping will be handled later
  }

  /**
   * Format response body file for HTML
   */
  formatResponseBodyFileForHtml(responseBodyFile) {
    if (!responseBodyFile || responseBodyFile === 'N/A') {
      return 'N/A';
    }

    try {
      const absolutePath = path.resolve(responseBodyFile);
      const pathParts = absolutePath.split(path.sep);
      const lastDirAndFile = pathParts.slice(-2).join(path.sep);
      const encodedLinkLabel = encodeURIComponent(lastDirAndFile);
      
      let fileContent = null;
      try {
        fileContent = fs.readFileSync(absolutePath, 'utf8');
      } catch (readError) {
        console.warn(`Could not read response file ${absolutePath}: ${readError.message}`);
      }
      
      if (fileContent) {
        const encodedContent = encodeURIComponent(fileContent).replace(/'/g, '%27');
        const encodedPath = encodeURIComponent(absolutePath);
        return `<span class="json-link" onclick="showResponseContent('${encodedContent}', '${encodedPath}', '${encodedLinkLabel}')" title="Click to view response body">📄 Response</span>`;
      } else {
        const encodedPath = encodeURIComponent(absolutePath);
        return `<span class="json-link" onclick="showResponsePopup('${encodedPath}', '${encodedLinkLabel}')" title="Click to view response body">📄 Response</span>`;
      }
    } catch (error) {
      return responseBodyFile;
    }
  }

  /**
   * Format URL for HTML display
   */
  formatUrlForHtml(url) {
    if (!url) {
      return 'N/A';
    }

    try {
      const urlObj = new URL(url);
      let baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      
      const qParam = urlObj.searchParams.get('q');
      let hasJsonQuery = false;
      let encodedQParam = '';

      if (qParam) {
        try {
          JSON.parse(decodeURIComponent(qParam));
          hasJsonQuery = true;
          encodedQParam = encodeURIComponent(qParam);
        } catch (e) {
          // Not valid JSON
        }
      }
      
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
      
      let result = `<a href="${fullEncodedUrl}" class="url-link" target="_blank" title="Open URL in new tab">${fullDecodedUrl}</a>`;
      
      if (hasJsonQuery) {
        result += ` <span class="json-link" onclick="showJsonPopup('${encodedQParam}')" title="Click to view the criteria">📄 Criteria</span>`;
      }
      
      return result;
    } catch (error) {
      return url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  }

  /**
   * Get JavaScript functions for popups
   */
  getJavaScriptFunctions() {
    return `<script>
        function toggleEndpointTable(sectionId) {
            const tableId = 'table-' + sectionId;
            const toggleId = 'toggle-' + sectionId;
            const table = document.getElementById(tableId);
            const toggle = document.getElementById(toggleId);
            
            if (table && toggle) {
                if (table.classList.contains('collapsed')) {
                    table.classList.remove('collapsed');
                    toggle.textContent = '▼';
                    toggle.classList.remove('collapsed');
                } else {
                    table.classList.add('collapsed');
                    toggle.textContent = '▶';
                    toggle.classList.add('collapsed');
                }
            }
        }

        function showJsonPopup(jsonString) {
            try {
                const parsed = JSON.parse(decodeURIComponent(jsonString));
                const formatted = JSON.stringify(parsed, null, 2);
                document.getElementById('jsonContent').textContent = formatted;
                document.getElementById('jsonPopup').style.display = 'block';
                
                // Store the original and formatted JSON for copy functions
                window.currentJsonData = {
                    formatted: formatted,
                    encoded: jsonString
                };
            } catch (e) {
                document.getElementById('jsonContent').textContent = 'Invalid JSON: ' + decodeURIComponent(jsonString);
                document.getElementById('jsonPopup').style.display = 'block';
                
                // Store error data for copy functions
                window.currentJsonData = {
                    formatted: 'Invalid JSON: ' + decodeURIComponent(jsonString),
                    encoded: jsonString
                };
            }
        }

        function copyToClipboard(event, dataSource, dataKey, buttonName) {
            const data = window[dataSource];
            if (data && data[dataKey]) {
                navigator.clipboard.writeText(data[dataKey]).then(function() {
                    // Temporarily change button text to show success
                    const button = event ? event.target : document.querySelector('button[onclick*="' + buttonName + '"]');
                    const originalText = button.textContent;
                    button.textContent = 'Copied!';
                    button.style.background = '#2196F3';
                    setTimeout(function() {
                        button.textContent = originalText;
                        button.style.background = '#4CAF50';
                    }, 1000);
                }).catch(function(err) {
                    console.error('Failed to copy: ', err);
                    alert('Failed to copy to clipboard');
                });
            }
        }

        function copyJsonAsDisplayed(event) {
            copyToClipboard(event, 'currentJsonData', 'formatted', 'copyJsonAsDisplayed');
        }

        function copyJsonAsEncoded(event) {
            copyToClipboard(event, 'currentJsonData', 'encoded', 'copyJsonAsEncoded');
        }

        function copyResponseAsDisplayed(event) {
            copyToClipboard(event, 'currentResponseData', 'formatted', 'copyResponseAsDisplayed');
        }

        function closeJsonPopup(event) {
            if (!event || event.target === document.getElementById('jsonPopup')) {
                document.getElementById('jsonPopup').style.display = 'none';
            }
        }

        function showResponseContent(encodedContent, encodedPath, encodedLinkLabel) {
            try {
                const content = decodeURIComponent(encodedContent);
                const filePath = decodeURIComponent(encodedPath);
                const linkLabel = decodeURIComponent(encodedLinkLabel);
                
                document.getElementById('responsePopup').style.display = 'block';
                
                const fileUrl = 'file:///' + filePath.replace(/\\\\\\\\/g, '/');
                const hyperlinkHtml = '<div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #0066cc; border-radius: 4px;"><a href="' + fileUrl + '" target="_blank" style="color: #0066cc; text-decoration: none; font-weight: bold;">🔗 ' + linkLabel + '</a></div>';
                
                try {
                    const parsed = JSON.parse(content);
                    const formatted = JSON.stringify(parsed, null, 2);
                    document.getElementById('responseContent').innerHTML = hyperlinkHtml + '<pre class="json-content" style="margin: 0;">' + formatted + '</pre>';
                    
                    // Store the formatted content for copy function
                    window.currentResponseData = {
                        formatted: formatted
                    };
                } catch (jsonError) {
                    document.getElementById('responseContent').innerHTML = hyperlinkHtml + '<pre style="margin: 0; font-family: monospace; white-space: pre-wrap;">' + content + '</pre>';
                    
                    // Store the raw content for copy function
                    window.currentResponseData = {
                        formatted: content
                    };
                }
            } catch (e) {
                const errorMessage = 'Error displaying content: ' + e.message;
                document.getElementById('responseContent').textContent = errorMessage;
                document.getElementById('responsePopup').style.display = 'block';
                
                // Store the error message for copy function
                window.currentResponseData = {
                    formatted: errorMessage
                };
            }
        }

        function showResponsePopup(filePath, encodedLinkLabel) {
            // Simplified version - just show the path for now
            const decodedPath = decodeURIComponent(filePath);
            const linkLabel = decodeURIComponent(encodedLinkLabel);
            
            const pathContent = 'Response file path: ' + decodedPath;
            document.getElementById('responseContent').innerHTML = '<div>' + pathContent + '</div>';
            document.getElementById('responsePopup').style.display = 'block';
            
            // Store the path content for copy function
            window.currentResponseData = {
                formatted: pathContent
            };
        }

        function closeResponsePopup(event) {
            if (!event || event.target === document.getElementById('responsePopup')) {
                document.getElementById('responsePopup').style.display = 'none';
            }
        }

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeJsonPopup();
                closeResponsePopup();
            }
        });

        // Store original endpoint type names when page loads
        let originalEndpointTitles = {};
        
        document.addEventListener('DOMContentLoaded', function() {
            initializeOriginalTitles();
        });
        
        // If DOMContentLoaded has already fired, initialize immediately
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeOriginalTitles);
        } else {
            initializeOriginalTitles();
        }
        
        function initializeOriginalTitles() {
            const sections = document.querySelectorAll('.endpoint-section');
            sections.forEach(section => {
                const title = section.querySelector('.endpoint-title');
                if (title) {
                    const sectionId = section.querySelector('.endpoint-header').getAttribute('onclick').match(/'([^']+)'/)[1];
                    // Extract just the endpoint type name (everything before the first parenthesis)
                    const titleText = title.textContent;
                    const endpointType = titleText.replace(/\\s*\\(.*$/, '').trim();
                    originalEndpointTitles[sectionId] = endpointType;
                }
            });
        }

        // Filtering functionality
        function filterByStatus() {
            const statusFilter = document.getElementById('statusFilter').value;
            const allTables = document.querySelectorAll('.endpoint-table table tbody tr');
            let visibleCount = 0;
            let totalCount = allTables.length;
            
            allTables.forEach(row => {
                const statusCell = row.cells[1]; // Status is the 2nd column (index 1)
                if (statusCell) {
                    const statusValue = statusCell.textContent.trim();
                    if (statusFilter === '' || statusValue === statusFilter) {
                        row.classList.remove('hidden');
                        visibleCount++;
                    } else {
                        row.classList.add('hidden');
                    }
                }
            });
            
            // Update section headers to show filtered counts
            updateEndpointSectionCounts();
            
            // Update filter info
            updateFilterInfo(statusFilter, visibleCount, totalCount);
        }

        function clearFilters() {
            document.getElementById('statusFilter').value = '';
            const allRows = document.querySelectorAll('.endpoint-table table tbody tr');
            const allSections = document.querySelectorAll('.endpoint-section');
            
            allRows.forEach(row => {
                row.classList.remove('hidden');
            });
            
            // Show all sections again
            allSections.forEach(section => {
                section.classList.remove('hidden');
            });
            
            // Reset all sort arrows and states
            const allSortableHeaders = document.querySelectorAll('th.sortable .sort-arrow');
            allSortableHeaders.forEach(arrow => {
                arrow.className = 'sort-arrow';
            });
            sortState = {}; // Clear all sort states
            
            // Reset section headers to original counts
            updateEndpointSectionCounts();
            
            // Clear filter info
            document.getElementById('filterInfo').textContent = '';
        }

        function updateFilterInfo(statusFilter, visibleCount, totalCount) {
            const filterInfo = document.getElementById('filterInfo');
            if (statusFilter) {
                filterInfo.textContent = 'Showing ' + visibleCount + ' of ' + totalCount + ' tests (filtered by Status: ' + statusFilter + ')';
            } else {
                filterInfo.textContent = '';
            }
        }

        function updateEndpointSectionCounts() {
            const sections = document.querySelectorAll('.endpoint-section');
            sections.forEach(section => {
                const title = section.querySelector('.endpoint-title');
                const table = section.querySelector('.endpoint-table table tbody');
                const header = section.querySelector('.endpoint-header');
                
                if (title && table && header) {
                    const allRows = table.querySelectorAll('tr');
                    const visibleRows = table.querySelectorAll('tr:not(.hidden)');
                    const totalCount = allRows.length;
                    const visibleCount = visibleRows.length;
                    
                    // Get the section ID to look up the original title
                    const onclickValue = header.getAttribute('onclick');
                    const sectionId = onclickValue ? onclickValue.match(/'([^']+)'/)[1] : null;
                    const endpointType = sectionId && originalEndpointTitles[sectionId] ? originalEndpointTitles[sectionId] : 'Unknown';
                    
                    if (visibleCount < totalCount) {
                        title.textContent = endpointType + ' (' + visibleCount + '/' + totalCount + ' tests)';
                    } else {
                        title.textContent = endpointType + ' (' + totalCount + ' tests)';
                    }
                    
                    // Show/hide the entire section if no tests are visible
                    if (visibleCount === 0) {
                        section.classList.add('hidden');
                    } else {
                        section.classList.remove('hidden');
                    }
                }
            });
        }

        // Sorting functionality
        let sortState = {}; // Track sort state for each table and column

        function sortTable(tableId, columnIndex, dataType) {
            const table = document.getElementById(tableId);
            if (!table) return;
            
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const headerCell = table.querySelectorAll('th.sortable')[columnIndex];
            const arrow = headerCell.querySelector('.sort-arrow');
            
            // Clear other arrows in this table
            const allArrows = table.querySelectorAll('th.sortable .sort-arrow');
            allArrows.forEach(arr => {
                if (arr !== arrow) {
                    arr.className = 'sort-arrow';
                }
            });
            
            // Get current sort state for this table and column
            const sortKey = tableId + '-' + columnIndex;
            const currentState = sortState[sortKey] || 'none';
            let newState;
            
            // Toggle sort state: none -> asc -> desc -> asc -> ...
            if (currentState === 'none' || currentState === 'desc') {
                newState = 'asc';
            } else {
                newState = 'desc';
            }
            
            // Clear other sort states for this table
            Object.keys(sortState).forEach(key => {
                if (key.startsWith(tableId + '-') && key !== sortKey) {
                    delete sortState[key];
                }
            });
            
            // Update sort state
            sortState[sortKey] = newState;
            
            // Update arrow display
            arrow.className = 'sort-arrow ' + newState;
            
            // Sort rows (including both visible and hidden rows to maintain filter state)
            rows.sort((a, b) => {
                const aValue = getCellValue(a.cells[columnIndex], dataType);
                const bValue = getCellValue(b.cells[columnIndex], dataType);
                
                if (newState === 'asc') {
                    return compareValues(aValue, bValue, dataType);
                } else {
                    return compareValues(bValue, aValue, dataType);
                }
            });
            
            // Clear tbody and re-append sorted rows (this maintains hidden state)
            tbody.innerHTML = '';
            rows.forEach(row => tbody.appendChild(row));
        }

        function getCellValue(cell, dataType) {
            if (!cell) return '';
            
            let text = cell.textContent.trim();
            
            switch (dataType) {
                case 'duration':
                    return getDurationValue(text);
                case 'number':
                    // Handle N/A and empty values
                    if (text === 'N/A' || text === '') {
                        return -1; // Put these at the end for ascending sort
                    }
                    // Remove any zero-width or invisible characters
                    const cleanText = text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                    const numValue = parseFloat(cleanText);
                    return isNaN(numValue) ? -1 : numValue;
                case 'text':
                default:
                    // For text columns, be smart about detecting numbers
                    if (text === '' || text === 'N/A') {
                        return text.toLowerCase();
                    }
                    
                    // Remove any zero-width or invisible characters
                    const cleanTextForText = text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                    
                    // Check if it's a pure number (integer or decimal)
                    if (/^\d+(\.\d+)?$/.test(cleanTextForText)) {
                        return parseFloat(cleanTextForText);
                    }
                    
                    // Check if it starts with a number followed by text (like "12 facet categories")
                    const numberMatch = cleanTextForText.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
                    if (numberMatch) {
                        return {
                            numValue: parseFloat(numberMatch[1]),
                            textValue: numberMatch[2].toLowerCase()
                        };
                    }
                    
                    // Pure text
                    return cleanTextForText.toLowerCase();
            }
        }

        function compareValues(a, b, dataType) {
            if (dataType === 'text') {
                // Handle mixed types in text columns
                const aIsNumber = typeof a === 'number';
                const bIsNumber = typeof b === 'number';
                const aIsObject = typeof a === 'object' && a !== null && a.numValue !== undefined;
                const bIsObject = typeof b === 'object' && b !== null && b.numValue !== undefined;
                const aIsString = typeof a === 'string';
                const bIsString = typeof b === 'string';
                
                // Both are pure numbers
                if (aIsNumber && bIsNumber) {
                    return a - b;
                }
                
                // Both are mixed objects (number + text)
                if (aIsObject && bIsObject) {
                    const numCompare = a.numValue - b.numValue;
                    if (numCompare !== 0) return numCompare;
                    return a.textValue.localeCompare(b.textValue);
                }
                
                // One number, one mixed object - compare by numeric value
                if (aIsNumber && bIsObject) {
                    return a - b.numValue;
                }
                if (aIsObject && bIsNumber) {
                    return a.numValue - b;
                }
                
                // Both are strings
                if (aIsString && bIsString) {
                    return a.localeCompare(b);
                }
                
                // Mixed cases - numbers come first, then mixed objects, then pure text
                if (aIsNumber && bIsString) return -1;
                if (aIsString && bIsNumber) return 1;
                if (aIsObject && bIsString) return -1;
                if (aIsString && bIsObject) return 1;
                
                // Fallback
                return String(a).localeCompare(String(b));
            } else {
                // For numbers and durations
                return a - b;
            }
        }

        function getDurationValue(durationText) {
            // Handle 'N/A' and extract numeric value
            if (!durationText || durationText.trim() === 'N/A') {
                return -1; // Put N/A values at the end for ascending, beginning for descending
            }
            
            const numericValue = parseFloat(durationText.replace(/[^0-9.-]/g, ''));
            return isNaN(numericValue) ? -1 : numericValue;
        }
    </script>`;
  }

  /**
   * Display summary to console
   */
  displaySummary(summary) {
    console.log('\n=== Test Summary ===');
    console.log(`Providers Included: ${summary.providers_included.join(', ')}`);
    console.log(`Endpoints Included: ${summary.endpoints_included.join(', ')}`);
    console.log(`Total Tests: ${summary.total_tests}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Errors: ${summary.errors}`);
    console.log(`Slow: ${summary.slow}`);
    console.log(`Average Duration: ${Math.round(summary.average_duration)}ms`);
    console.log(`Total Duration: ${Math.round(summary.total_duration)}ms`);
    console.log(`\nReports generated in: ${this.executionDir}`);
    console.log(`- JSON: endpoint-test-report.json`);
    console.log(`- CSV: endpoint-test-report.csv`);
    console.log(`- HTML: endpoint-test-report.html`);
    if (this.saveResponseBodies) {
      console.log(`- Response bodies: responses/ directory`);
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
      console.log('                                Examples: AdvancedSearchQueriesTestDataProvider,UpdatedAdvancedSearchQueriesTestDataProvider');
      console.log('  --endpoints, -e <endpoints>   Comma-separated list of endpoint types to test');
      console.log('                                Available: search, auto-complete, facets, translate, etc.');
      console.log('  --help, -h                    Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  node run-tests.js');
      console.log('  node run-tests.js ./configs ./reports');
      console.log('  node run-tests.js --save-responses');
      console.log('  node run-tests.js --dry-run');
      console.log('  node run-tests.js --providers AdvancedSearchQueriesTestDataProvider,UpdatedAdvancedSearchQueriesTestDataProvider');
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
  
  // Validate providers and endpoints after async initialization
  tester.runFilteredTests().catch(async (error) => {
    // If the error is due to validation, we want to show it properly
    if (error.message && error.message.includes('Unknown provider') || error.message.includes('Unknown endpoint')) {
      console.error('Test execution failed:', error.message);
      process.exit(1);
    }
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export default EndpointTester;
