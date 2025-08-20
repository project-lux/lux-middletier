/**
 * Shared utility functions for endpoint testing framework
 */

import fs from 'fs';
import path from 'path';

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
    console
    return null;
  }
};