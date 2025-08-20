/**
 * Shared utility functions for endpoint testing framework
 */

/**
 * Generate endpoint key from path and HTTP method
 * Used by both create-excel-template.js and run-test.js to ensure consistent naming
 * 
 * @param {string} path - API endpoint path (e.g., "/api/search/:scope")
 * @param {string} method - HTTP method (e.g., "GET", "POST")
 * @returns {string} - Generated endpoint key (e.g., "get-search")
 */
export function getEndpointKeyFromPath(path, method) {
  let key = path
    .replace(/\/api\//, '')
    .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
    .split('/') // Split into segments
    .filter(segment => !segment.startsWith(':')) // Remove parameter segments
    .join('-') // Join with hyphens
    .replace(/[^a-zA-Z0-9-]/g, '') // Remove non-alphanumeric chars except hyphens
    .toLowerCase();

  key = `${method.toLowerCase()}-${key}`;

  // Clean up common patterns
  key = key
    .replace(/^api-/, '') // Remove api prefix
    .replace(/--+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  return key || 'unknown-endpoint';
}
