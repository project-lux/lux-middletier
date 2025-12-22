/**
 * Endpoint Testing Constants
 *
 * This file defines constants used throughout the endpoint testing framework.
 * It provides a centralized location for endpoint keys, HTTP methods, status codes,
 * and other test-related constants.
 */

// ==============================================================================
// ENDPOINT KEYS
// ==============================================================================

/**
 * Endpoint keys used as identifiers throughout the testing framework.
 * These keys are generated from API paths and HTTP methods using the pattern:
 * {method}-{path-segments-without-parameters}
 *
 * Example: GET /api/search/:scope becomes "get-search"
 */
export const ENDPOINT_KEYS = {
  GET_DATA: "get-data",
  GET_DATA_WITH_PROFILE: "get-data-with-profile",
  GET_DATA_NO_PROFILE: "get-data-no-profile",
  GET_FACETS: "get-facets",
  GET_RELATED_LIST: "get-related-list",
  GET_SEARCH: "get-search",
  GET_SEARCH_ESTIMATE: "get-search-estimate",
};

// Reverse lookup for endpoint keys (useful for debugging and error messages)
export const ENDPOINT_KEY_NAMES = Object.fromEntries(
  Object.entries(ENDPOINT_KEYS).map(([key, value]) => [value, key])
);

// ==============================================================================
// HTTP METHODS
// ==============================================================================

export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
};

// ==============================================================================
// HTTP STATUS CODES
// ==============================================================================

export const HTTP_STATUS = {
  // Success codes
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Redirection codes
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client error codes
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server error codes
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// Status code categories for easier testing
export const HTTP_STATUS_CATEGORIES = {
  SUCCESS: [200, 201, 202, 204],
  REDIRECT: [301, 302, 304],
  CLIENT_ERROR: [400, 401, 403, 404, 405, 406, 408, 409, 410, 422, 429],
  SERVER_ERROR: [500, 501, 502, 503, 504],
};

// ==============================================================================
// TEST DATA CONSTANTS
// ==============================================================================

export const TEST_CONSTANTS = {
  // Default timeouts (in milliseconds)
  DEFAULT_TIMEOUT: 10000,
  FAST_TIMEOUT: 5000,
  SLOW_TIMEOUT: 30000,

  // Default response time limits (in milliseconds)
  FAST_RESPONSE_TIME: 1000,
  NORMAL_RESPONSE_TIME: 3000,
  SLOW_RESPONSE_TIME: 10000,

  // Test data limits
  MAX_TEST_CASES_PER_ENDPOINT: 100,
  DEFAULT_TEST_CASE_COUNT: 10,
  MIN_TEST_CASE_COUNT: 1,

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
};

// ==============================================================================
// TEST COLUMN CONSTANTS
// ==============================================================================

/**
 * Standard column names used in test data spreadsheets
 * These are the expected column headers for test data providers
 */
export const TEST_COLUMNS = {
  // Required columns
  TEST_NAME: "test_name",
  ENABLED: "enabled",
  EXPECTED_STATUS: "expected_status",

  // Optional metadata columns
  DESCRIPTION: "description",
  TIMEOUT_MS: "timeout_ms",
  MAX_RESPONSE_TIME: "max_response_time",
  DELAY_AFTER_MS: "delay_after_ms",
  TAGS: "tags",

  // Parameter column prefix
  PARAM_PREFIX: "param:",

  // Common parameter columns
  PARAM_SCOPE: "param:scope",
  PARAM_Q: "param:q",
  PARAM_PAGE: "param:page",
  PARAM_PAGE_LENGTH: "param:pageLength",
  PARAM_URI: "param:uri",
  PARAM_ID: "param:id",
};

// Column variations and aliases
export const TEST_COLUMN_ALIASES = {
  [TEST_COLUMNS.TEST_NAME]: ["testName", "testname", "name", "test-name"],
  [TEST_COLUMNS.ENABLED]: ["enable", "active", "run"],
  [TEST_COLUMNS.EXPECTED_STATUS]: [
    "expectedStatus",
    "status",
    "expectedStatusCode",
    "statusCode",
  ],
  [TEST_COLUMNS.TIMEOUT_MS]: ["timeout", "timeoutMs", "timeoutMilliseconds"],
  [TEST_COLUMNS.MAX_RESPONSE_TIME]: [
    "maxResponseTime",
    "responseTime",
    "maxTime",
  ],
  [TEST_COLUMNS.DELAY_AFTER_MS]: [
    "delay",
    "delayAfter",
    "delayAfterMs",
    "waitTime",
  ],
};

// ==============================================================================
// SCOPE CONSTANTS
// ==============================================================================

/**
 * Valid scope values for LUX API endpoints
 * These represent the different entity types in the LUX system
 */
export const SCOPES = {
  WORK: "work",
  ITEM: "item",
  SET: "set",
  AGENT: "agent",
  PLACE: "place",
  CONCEPT: "concept",
  EVENT: "event",
};

// All valid scopes as array (useful for validation)
export const VALID_SCOPES = Object.values(SCOPES);

// ==============================================================================
// ERROR MESSAGES
// ==============================================================================

export const ERROR_MESSAGES = {
  // Endpoint key errors
  INVALID_ENDPOINT_KEY: "Invalid endpoint key provided",
  UNSUPPORTED_ENDPOINT: "Endpoint not supported by this provider",

  // Test data errors
  NO_TEST_DATA_FOUND: "No test data found for endpoint",
  INVALID_TEST_DATA_FORMAT: "Invalid test data format",
  MISSING_REQUIRED_COLUMNS: "Missing required columns in test data",

  // HTTP errors
  REQUEST_TIMEOUT: "Request timed out",
  UNEXPECTED_STATUS_CODE: "Unexpected HTTP status code",
  RESPONSE_TIME_EXCEEDED: "Response time exceeded limit",

  // Provider errors
  PROVIDER_NOT_FOUND: "Test data provider not found",
  PROVIDER_INITIALIZATION_FAILED: "Failed to initialize test data provider",
  FILE_NOT_FOUND: "Test data file not found",
  FILE_PARSE_ERROR: "Failed to parse test data file",
};

// ==============================================================================
// UTILITY FUNCTIONS
// ==============================================================================

/**
 * Check if an endpoint key is valid
 * @param {string} endpointKey - Endpoint key to validate
 * @returns {boolean} - True if valid
 */
export function isValidEndpointKey(endpointKey) {
  return Object.values(ENDPOINT_KEYS).includes(endpointKey);
}

/**
 * Check if an HTTP status code is in a specific category
 * @param {number} statusCode - HTTP status code
 * @param {string} category - Category name (SUCCESS, CLIENT_ERROR, etc.)
 * @returns {boolean} - True if status code is in category
 */
export function isStatusInCategory(statusCode, category) {
  const categoryKey = category.toUpperCase();
  return HTTP_STATUS_CATEGORIES[categoryKey]?.includes(statusCode) || false;
}

/**
 * Get the endpoint key name from the endpoint key value
 * @param {string} endpointKey - Endpoint key value
 * @returns {string|null} - Endpoint key name or null if not found
 */
export function getEndpointKeyName(endpointKey) {
  return ENDPOINT_KEY_NAMES[endpointKey] || null;
}

/**
 * Check if a scope is valid
 * @param {string} scope - Scope to validate
 * @returns {boolean} - True if valid
 */
export function isValidScope(scope) {
  return VALID_SCOPES.includes(scope);
}

/**
 * Generate parameter column name
 * @param {string} paramName - Parameter name
 * @returns {string} - Column name with prefix
 */
export function getParamColumnName(paramName) {
  return `${TEST_COLUMNS.PARAM_PREFIX}${paramName}`;
}

/**
 * Parse parameter column name to get parameter name
 * @param {string} columnName - Column name with prefix
 * @returns {string|null} - Parameter name or null if not a parameter column
 */
export function parseParamColumnName(columnName) {
  if (columnName.startsWith(TEST_COLUMNS.PARAM_PREFIX)) {
    return columnName.substring(TEST_COLUMNS.PARAM_PREFIX.length);
  }
  return null;
}

// ==============================================================================
// EXPORTS
// ==============================================================================

// Export all constants as a single object for convenience
export const CONSTANTS = {
  ENDPOINT_KEYS,
  HTTP_METHODS,
  HTTP_STATUS,
  HTTP_STATUS_CATEGORIES,
  TEST_CONSTANTS,
  TEST_COLUMNS,
  TEST_COLUMN_ALIASES,
  SCOPES,
  VALID_SCOPES,
  ERROR_MESSAGES,
};

// Default export
export default CONSTANTS;
