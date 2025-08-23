/**
 * Shared utility functions for endpoint testing framework
 */

import fs from 'fs';
import path from 'path';

export function isDefined(value) {
  return value !== undefined && value !== null;
}

/**
 * Generate endpoint key from path and HTTP method
 * Used by both create-tests.js and run-tests.js to ensure consistent naming
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

// Find a file from a subdirectory based on offset and file extension.  
// An offset of 0 means the last directory in dir.
// First and possibly only use is to provide defaults for which reports to compare.
export const findFileInSubdir = (dir, offset = 1, extension = 'json') => {
  try {
    console.log(`Searching in directory: ${dir} with offset: ${offset} and extension: ${extension}`);
    if (!fs.existsSync(dir)) {
      return null;
    }
    
    // Get all subdirectories, sorted by name (which should be timestamps)
    const subdirs = fs.readdirSync(dir)
      .map(name => path.join(dir, name))
      .filter(fullPath => fs.statSync(fullPath).isDirectory())
      .sort();

    if (subdirs.length < offset + 1) {
      return null;
    }
    
    // Get the directory at the specified offset from the end
    // offset = 0 means last directory, offset = 1 means second-to-last, etc.
    const targetDir = subdirs[subdirs.length - 1 - offset];
    console.log(`Searching in ${targetDir}`);

    // Look for the first file with the specified extension.
    const files = fs.readdirSync(targetDir);
    const foundFile = files.find(file => {
      return file.endsWith(extension);
    });
    
    if (foundFile) {
      console.log(`Found file: ${foundFile}`);
      return path.join(targetDir, foundFile);
    }
    console.warn(`No file with extension ${extension}`);
    return null
  } catch (error) {
    console.error('Error finding file in subdirectory:', error);
    return null;
  }
};

/**
 * Parse URL query string and decode parameters for LUX search URLs
 * @param {string} url - Full URL with query string
 * @returns {Object} - Decoded query parameters
 */
export function parseUrlQueryString(url) {
  try {
    const urlObj = new URL(url);
    const params = {};
    
    // Extract scope from URL path (last part of the path)
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    if (pathParts.length > 0) {
      const lastPathPart = pathParts[pathParts.length - 1];
      // Map the extracted scope to supported values
      params.scope = mapScopeValue(lastPathPart);
    }
    
    // Iterate through all search parameters
    for (const [key, value] of urlObj.searchParams.entries()) {
      if (key === 'q') {
        // Handle the main query parameter - it might be JSON
        try {
          // URL decode first
          const decodedValue = decodeURIComponent(value);
          // Try to parse as JSON
          const queryObj = JSON.parse(decodedValue);
          
          // Extract common search parameters from the JSON structure
          extractSearchParamsFromQueryJson(queryObj, params);
          
          // Also store the raw query
          params.q = decodedValue;
        } catch (jsonError) {
          // If not JSON, just store the decoded value
          params.q = decodeURIComponent(value);
        }
      } else {
        // Decode other parameters
        params[key] = decodeURIComponent(value);
      }
    }
    
    return params;
  } catch (error) {
    console.warn(`Failed to parse URL: ${url}`, error.message);
    return {};
  }
}

/**
 * Map URL scope value to supported API scope values
 * @param {string} urlScope - Scope extracted from URL path
 * @returns {string} - Mapped scope value
 */
export function mapScopeValue(urlScope) {
  if (!urlScope || typeof urlScope !== 'string') {
    return '';
  }

  const lowerScope = urlScope.toLowerCase();
  
  // Special mapping for "objects" -> "item"
  if (lowerScope === 'objects' || lowerScope === 'object') {
    return 'item';
  }

  if (lowerScope === 'collections' || lowerScope === 'collection') {
    return 'set';
  }

  if (lowerScope === 'people') {
    return 'agent'
  }

  // The plural form of all other support scopes simply end with a 's', and no
  // singular form of a supported scope does.
  if (lowerScope.endsWith('s')) {
    return lowerScope.slice(0, -1);
  }
  
  // Return as-is if no plural pattern matches (already singular or unknown pattern)
  return lowerScope;
}

/**
 * Extract search parameters from LUX query JSON structure
 * @param {Object} queryObj - Parsed query JSON object
 * @param {Object} params - Parameters object to populate
 */
export function extractSearchParamsFromQueryJson(queryObj, params) {
  if (!queryObj || typeof queryObj !== 'object') return;
  
  // Handle common LUX query patterns
  if (queryObj.AND) {
    queryObj.AND.forEach(condition => {
      extractConditionParams(condition, params);
    });
  } else if (queryObj.OR) {
    queryObj.OR.forEach(condition => {
      extractConditionParams(condition, params);
    });
  } else {
    extractConditionParams(queryObj, params);
  }
}

/**
 * Extract parameters from a query condition
 * @param {Object} condition - Query condition object
 * @param {Object} params - Parameters object to populate
 */
export function extractConditionParams(condition, params) {
  if (!condition || typeof condition !== 'object') return;
  
  // Handle different condition types
  if (condition.text) {
    params.text = condition.text;
  }
  if (condition.name) {
    params.name = condition.name;
  }
  if (condition.classification && condition.classification.name) {
    params.classification = condition.classification.name;
  }
  // Add more parameter extraction logic as needed based on LUX query structure
}

/**
 * Check if a URL is a valid LUX search URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid search URL
 */
export function isValidSearchUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Check if it's a LUX search URL
  return url.includes('lux') && 
         url.includes('results') && 
         (url.includes('?q=') || url.includes('&q='));
}

/**
 * Parse a value to boolean, accepting common truthy/falsy representations
 * @param {*} value - Value to parse as boolean
 * @returns {boolean} - Parsed boolean value
 */
export function parseBoolean(value) {
  // Handle null, undefined, and empty values
  if (value === null || value === undefined) {
    return false;
  }
  
  // If already boolean, return as-is
  if (typeof value === 'boolean') {
    return value;
  }
  
  // Handle numbers
  if (typeof value === 'number') {
    return value !== 0 && !isNaN(value);
  }
  
  // Handle strings (case-insensitive)
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    
    // Empty string is falsy
    if (lowerValue === '') {
      return false;
    }
    
    // Common truthy values
    const truthyValues = ['true', '1', 'yes', 'y', 'on', 'enabled', 'enable'];
    if (truthyValues.includes(lowerValue)) {
      return true;
    }
    
    // Common falsy values
    const falsyValues = ['false', '0', 'no', 'n', 'off', 'disabled', 'disable'];
    if (falsyValues.includes(lowerValue)) {
      return false;
    }
    
    // For other strings, treat non-empty as truthy
    return true;
  }
  
  // For other types, use JavaScript's truthiness
  return Boolean(value);
}

/**
 * Extract type and uuid from LUX data URLs
 * @param {string} url - LUX data URL (e.g., "https://lux.collections.yale.edu/view/item/12345678-1234-1234-1234-123456789012")
 * @returns {Object} - Object containing type and uuid parameters
 */
export function extractDataParamsFromUrl(url) {
  const params = {};
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    
    // Look for patterns like /view/item/uuid or /data/item/uuid
    const viewIndex = pathParts.findIndex(part => part === 'view' || part === 'data');
    
    if (viewIndex >= 0 && viewIndex + 2 < pathParts.length) {
      // Found view/data, next should be type, then uuid
      params.type = pathParts[viewIndex + 1];
      params.uuid = pathParts[viewIndex + 2];
    } else {
      // Try to find type/uuid pattern directly in path
      const typeIndex = pathParts.findIndex(part => 
        ['item', 'set', 'agent', 'place', 'concept', 'work', 'event'].includes(part)
      );
      
      if (typeIndex >= 0 && typeIndex + 1 < pathParts.length) {
        params.type = pathParts[typeIndex];
        params.uuid = pathParts[typeIndex + 1];
      }
    }
    
    return params;
  } catch (error) {
    console.warn(`Failed to parse data URL: ${url}`, error.message);
    return params;
  }
}
