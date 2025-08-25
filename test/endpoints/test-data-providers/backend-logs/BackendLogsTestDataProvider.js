import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TestDataProvider } from '../interface.js';

/**
 * Backend Logs Test Data Provider
 * 
 * Parses LUX backend error logs to extract endpoint test cases automatically.
 * This provider analyzes log files from backend operations to generate 
 * endpoint-specific test cases for various LUX API endpoints.
 * 
 * Supported log patterns:
 * - LuxSearch: Search requests with timing and parameters
 * - LuxFacets: Facet calculation requests with facet names and timing
 * - LuxRelatedList: Related list requests with URIs, scopes, and names
 * - LuxNamedProfiles: Document profile requests with URIs and profiles
 * - requestCompleted: Completed search requests with full parameters
 * 
 * Log file format expected: *.txt files in the raw/ subdirectory
 */
export class BackendLogsTestDataProvider extends TestDataProvider {
  /**
   * Constructor
   * @param {Object} options - Options for log parsing
   */
  constructor(options = {}) {
    super({
      encoding: 'utf8',
      strictValidation: false,
      maxTestCasesPerEndpoint: 50, // Limit to avoid overwhelming test suites
      includeFastRequests: true,   // Include requests under 100ms
      includeSlowRequests: true,   // Include requests over 1000ms
      ...options
    });
    
    // This provider processes all log files in the raw subdirectory
    this.sourceDir = path.dirname(fileURLToPath(import.meta.url));
    this.logFiles = [];

    // Cache for parsed log data to avoid re-parsing
    this.parsedDataCache = new Map();
  }

  /**
   * Discover all log files in the raw directory and subdirectories
   * @returns {Array<string>} - Array of log file paths
   */
  discoverLogFiles() {
    try {
      if (!fs.existsSync(this.sourceDir)) {
        console.warn(`Warning: Backend logs directory not found (${this.sourceDir})`);
        return [];
      }

      const logFiles = this.findLogFilesRecursively(this.sourceDir);
      this.logFiles = logFiles;
      return logFiles;
    } catch (error) {
      console.error(`Error discovering log files in ${this.sourceDir}:`, error.message);
      return [];
    }
  }

  /**
   * Recursively find all log files in a directory and its subdirectories
   * @param {string} dir - Directory to search
   * @returns {Array<string>} - Array of log file paths
   */
  findLogFilesRecursively(dir) {
    const logFiles = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subDirFiles = this.findLogFilesRecursively(fullPath);
          logFiles.push(...subDirFiles);
        } else if (entry.isFile()) {
          // Check if it's a log file we want to process
          if (this.isLogFile(entry.name)) {
            logFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
    }
    
    return logFiles;
  }

  /**
   * Check if a file is a log file we should process
   * @param {string} filename - The filename to check
   * @returns {boolean} - Whether this is a processable log file
   */
  isLogFile(filename) {
    const lowerName = filename.toLowerCase();
    
    // Include .txt files but exclude specific files we don't want
    if (!lowerName.endsWith('.txt')) {
      return false;
    }
    
    // Exclude mining scripts and other non-log files
    const excludePatterns = [
      'minebackendlogs',
      'readme',
      'config',
      'setup'
    ];
    
    for (const pattern of excludePatterns) {
      if (lowerName.includes(pattern)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Parse log files and extract test cases
   * @param {Object} apiDef - API definition object
   * @param {string} endpointKey - Unique endpoint key
   * @param {Array<string>} columns - Expected column structure
   * @returns {Promise<Array<Array>>} - Array of test data rows
   */
  async extractTestData(apiDef, endpointKey, columns) {
    try {
      // Check which endpoint this is for and decide if we should process
      if (!this.shouldProcessEndpoint(endpointKey)) {
        return [];
      }

      const logFiles = this.discoverLogFiles();
      
      if (logFiles.length === 0) {
        console.warn(`Warning: No log files found in ${this.sourceDir}`);
        return [];
      }

      console.log(`Processing ${logFiles.length} log file(s) for ${endpointKey} endpoint...`);

      const allTestRows = [];
      const processedDirs = new Set();

      // Process each log file
      for (const logFilePath of logFiles) {
        const relativePath = path.relative(this.sourceDir, logFilePath);
        const dirName = path.dirname(relativePath);
        
        // Log directory being processed (only once per directory)
        if (dirName !== '.' && !processedDirs.has(dirName)) {
          console.log(`  - Processing directory: ${dirName}/`);
          processedDirs.add(dirName);
        }
        
        console.log(`    - Analyzing log file: ${path.basename(logFilePath)}`);
        
        const logData = await this.parseLogFile(logFilePath);
        const endpointTestCases = this.extractTestCasesForEndpoint(logData, endpointKey, relativePath);

        if (endpointTestCases.length > 0) {
          console.log(`      ✓ Found ${endpointTestCases.length} test cases for ${endpointKey}`);
          
          // Convert to test rows
          const testRows = this.convertToTestRows(endpointTestCases, columns, relativePath);
          allTestRows.push(...testRows);
        }
      }

      // Apply limits and filtering
      const filteredRows = this.applyFiltersAndLimits(allTestRows, endpointKey);
      
      console.log(`✓ Generated ${filteredRows.length} test cases for ${endpointKey} from backend logs`);
      return filteredRows;

    } catch (error) {
      console.error(`Error processing backend logs for ${endpointKey}:`, error.message);
      return []; // Return empty array to not break other providers
    }
  }

  /**
   * Check if we should process this endpoint type
   * @param {string} endpointKey - The endpoint key to check
   * @returns {boolean} - Whether to process this endpoint
   */
  shouldProcessEndpoint(endpointKey) {
    const supportedEndpoints = [
      'get-search',
      'get-related-list',
      'get-data'
      // Note: get-facets, get-search-estimate, and get-search-will-match are handled by getSearchRelatedTestConfigs
    ];
    return supportedEndpoints.includes(endpointKey);
  }

  /**
   * Parse a single log file and extract relevant entries
   * @param {string} logFilePath - Path to the log file
   * @returns {Promise<Object>} - Parsed log data organized by type
   */
  async parseLogFile(logFilePath) {
    // Check cache first
    const cacheKey = `${logFilePath}:${fs.statSync(logFilePath).mtime.getTime()}`;
    if (this.parsedDataCache.has(cacheKey)) {
      return this.parsedDataCache.get(cacheKey);
    }

    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = logContent.split('\n');
    
    const parsedData = {
      successfulSearchRequests: [],
      failedSearchRequests: [],
      // facetRequests: [],
      relatedListRequests: [],
      documentRequests: [],
      // searchEstimates: [],
      // searchWillMatch: [],
      // requestsCompleted: []
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Parse different types of log entries
        if (line.includes('[Event:id=LuxSearch]')) {
          // if (line.includes('requestCompleted')) {
          //   // Parse completed search requests with parameters
          //   const completed = this.parseRequestCompleted(line, lines, i);
          //   if (completed) {
          //     parsedData.requestsCompleted.push(completed);
          //   }
          // } else if (line.includes('requestContext:')) {
          //   // Parse search request context entries - these contain the actual search requests
          //   const requestContext = this.parseSearchRequest(line, lines, i);
          //   if (requestContext) {
          //     parsedData.successfulSearchRequests.push(requestContext);
          //   }
          // } else if (line.includes('Calculated estimate')) {
          //   // Parse search estimates
          //   const estimate = this.parseSearchEstimate(line);
          //   if (estimate) {
          //     parsedData.searchEstimates.push(estimate);
          //   }
          // } else if (line.includes('Checked') && line.includes('searches in')) {
          //   // Parse search will match
          //   const willMatch = this.parseSearchWillMatch(line);
          //   if (willMatch) {
          //     parsedData.searchWillMatch.push(willMatch);
          //   }
          // }
          if (line.includes('"requestCompleted":true')) {
            // Parse search request context entries - these contain the actual search requests
            const requestContext = this.parseSearchRequest(line, lines, i);
            if (requestContext) {
              parsedData.successfulSearchRequests.push(requestContext);
            }
          // } else if (line.includes('"requestCompleted":false')) {
          //   // Parse failed search requests
          //   const failedRequest = this.parseFailedRequest(line, lines, i);
          //   if (failedRequest) {
          //     parsedData.failedSearchRequests.push(failedRequest);
          //   }
          }
        // } else if (line.includes('[Event:id=LuxFacets]')) {
        //   // Parse facet calculation requests
        //   const facet = this.parseFacetRequest(line);
        //   if (facet) {
        //     parsedData.facetRequests.push(facet);
        //   }
        } else if (line.includes('[Event:id=LuxRelatedList]')) {
          // Parse related list requests
          const relatedList = this.parseRelatedListRequest(line);
          if (relatedList) {
            parsedData.relatedListRequests.push(relatedList);
          }
        } else if (line.includes('[Event:id=LuxNamedProfiles]')) {
          // Parse document profile requests
          const document = this.parseDocumentRequest(line);
          if (document) {
            parsedData.documentRequests.push(document);
          }
        }
      } catch (error) {
        // Skip malformed lines
        console.warn(`Warning: Could not parse log line: ${line.substring(0, 100)}...`);
      }
    }

    // Cache the results
    this.parsedDataCache.set(cacheKey, parsedData);
    
    return parsedData;
  }

  // /**
  //  * Parse a completed search request log entry
  //  * @param {string} line - The log line
  //  * @param {Array<string>} lines - All lines for context
  //  * @param {number} index - Current line index
  //  * @returns {Object|null} - Parsed request or null
  //  */
  // parseRequestCompleted(line, lines, index) {
  //   // Extract timestamp
  //   const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/);
  //   if (!timestampMatch) return null;
    
  //   const timestamp = timestampMatch[1];

  //   // Find the JSON part of the log line
  //   const jsonStart = line.indexOf('{"requestId":');
  //   if (jsonStart === -1) return null;
    
  //   try {
  //     // The JSON might be truncated, so we need to extract what we can
  //     let jsonPart = line.substring(jsonStart);
      
  //     // Try to find the end of the JSON or take a reasonable portion
  //     // Look for the end of the criteria object which is what we mainly need
  //     const criteriaMatch = jsonPart.match(/"criteria":\{[^}]*(?:\{[^}]*\}[^}]*)*\}/);
      
  //     let searchRequest;
  //     try {
  //       // First try to parse the entire JSON if it's complete
  //       const fullJsonMatch = jsonPart.match(/^\{.*\}/);
  //       if (fullJsonMatch) {
  //         searchRequest = JSON.parse(fullJsonMatch[0]);
  //       } else {
  //         // If not complete, try to extract just the key parts we need
  //         const partialData = {
  //           requestCompleted: true,
  //           milliseconds: { total: 0 },
  //           scope: 'item',
  //           criteria: {}
  //         };
          
  //         // Extract individual fields
  //         const requestCompletedMatch = jsonPart.match(/"requestCompleted":(true|false)/);
  //         if (requestCompletedMatch) {
  //           partialData.requestCompleted = requestCompletedMatch[1] === 'true';
  //         }
          
  //         const totalTimeMatch = jsonPart.match(/"total":(\d+)/);
  //         if (totalTimeMatch) {
  //           partialData.milliseconds.total = parseInt(totalTimeMatch[1]);
  //         }
          
  //         const scopeMatch = jsonPart.match(/"scope":"([^"]+)"/);
  //         if (scopeMatch) {
  //           partialData.scope = scopeMatch[1];
  //         }
          
  //         // Extract criteria - this is the most complex part
  //         if (criteriaMatch) {
  //           try {
  //             const criteriaJson = criteriaMatch[0].replace(/^"criteria":/, '');
  //             partialData.criteria = JSON.parse(criteriaJson);
  //           } catch (e) {
  //             // If criteria parsing fails, extract what we can
  //             const textMatch = jsonPart.match(/"text":"([^"]+)"/);
  //             if (textMatch) {
  //               partialData.criteria.text = textMatch[1];
  //             }
  //           }
  //         }
          
  //         searchRequest = partialData;
  //       }
  //     } catch (e) {
  //       // Last fallback - extract basic info
  //       searchRequest = {
  //         requestCompleted: !line.includes('"requestCompleted":false'),
  //         milliseconds: { total: 0 },
  //         scope: 'item',
  //         criteria: {}
  //       };
        
  //       const totalMatch = line.match(/"total":(\d+)/);
  //       if (totalMatch) {
  //         searchRequest.milliseconds.total = parseInt(totalMatch[1]);
  //       }
  //     }

  //     return {
  //       timestamp,
  //       total: searchRequest.estimate || 0,
  //       duration: searchRequest.milliseconds?.total || 0,
  //       isSuccessful: searchRequest.requestCompleted !== false,
  //       scope: searchRequest.scope || 'item',
  //       searchParams: {
  //         scope: searchRequest.scope || 'item',
  //         ...searchRequest.criteria || {}
  //       },
  //       rawLine: line
  //     };
      
  //   } catch (error) {
  //     console.warn(`Warning: Could not parse search request JSON in line: ${line.substring(0, 100)}...`);
  //     return null;
  //   }
  // }

  /**
   * Parse a search request log entry
   * @param {string} line - The log line
   * @param {Array<string>} lines - All lines for context
   * @param {number} index - Current line index
   * @returns {Object|null} - Parsed request context or null
   */
  parseSearchRequest(line, lines, index) {
    // Extract timestamp
    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/);
    if (!timestampMatch) return null;
    
    const timestamp = timestampMatch[1];

    // Find the JSON part of the log line (after the log level and event info)
    const jsonMatch = line.match(/\[Event:id=LuxSearch\]\s*(\{.*\})/);
    if (!jsonMatch) return null;
    
    try {
      const jsonString = jsonMatch[1];
      const logData = JSON.parse(jsonString);
      
      // Extract search parameters from the log data
      const searchParams = {
        scope: logData.scope || 'item'
      };
      
      // Add criteria as the main search parameters
      if (logData.criteria) {
        // If criteria is a complex object, serialize it as q parameter
        if (typeof logData.criteria === 'object' && Object.keys(logData.criteria).length > 0) {
          searchParams.q = JSON.stringify(logData.criteria);
        }
      }
      
      // Add other search parameters that might be useful for testing
      const paramKeys = ['page', 'pageLength', 'pageWith', 'filterResults', 'facetsSoon'];
      for (const key of paramKeys) {
        if (logData[key] !== undefined) {
          searchParams[key] = logData[key];
        }
      }
      
      return {
        timestamp,
        total: logData.estimate || 0,
        duration: logData.milliseconds?.total || 0,
        isSuccessful: logData.requestCompleted === true,
        scope: logData.scope || 'item',
        searchParams,
        rawLine: line
      };
      
    } catch (error) {
      console.warn(`Warning: Could not parse request JSON in line: ${line.substring(0, 100)}...`);
      return null;
    }
  }

  /**
   * Parse a search estimate log entry
   * @param {string} line - The log line
   * @returns {Object|null} - Parsed estimate or null
   */
  parseSearchEstimate(line) {
    const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}).*Calculated estimate in (\d+) milliseconds?/);
    if (!match) return null;

    const [, timestamp, duration] = match;

    return {
      timestamp,
      duration: parseInt(duration),
      type: 'estimate',
      rawLine: line
    };
  }

  /**
   * Parse a search will match log entry
   * @param {string} line - The log line
   * @returns {Object|null} - Parsed will match or null
   */
  parseSearchWillMatch(line) {
    const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}).*Checked (\d+) searches in (\d+) milliseconds?/);
    if (!match) return null;

    const [, timestamp, searchCount, duration] = match;

    return {
      timestamp,
      searchCount: parseInt(searchCount),
      duration: parseInt(duration),
      type: 'will-match',
      rawLine: line
    };
  }

  /**
   * Parse a facet request log entry
   * @param {string} line - The log line
   * @returns {Object|null} - Parsed facet request or null
   */
  parseFacetRequest(line) {
    const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}).*Calculated the following facet in (\d+) milliseconds?: ([^(]+)(?:\(page: (\d+); pageLength: (\d+)\))?/);
    if (!match) return null;

    const [, timestamp, duration, facetName, page, pageLength] = match;

    return {
      timestamp,
      duration: parseInt(duration),
      facetName: facetName.trim(),
      page: page ? parseInt(page) : 1,
      pageLength: pageLength ? parseInt(pageLength) : 20,
      rawLine: line
    };
  }

  /**
   * Parse a related list request log entry  
   * @param {string} line - The log line
   * @returns {Object|null} - Parsed related list request or null
   */
  parseRelatedListRequest(line) {
    const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}).*Created the '([^']+)' list in scope '([^']+)' for '([^']+)' in (\d+) milliseconds?.*?(?:page: (\d+); pageLength: (\d+))?/);
    if (!match) return null;

    const [, timestamp, relationName, scope, uri, duration, page, pageLength] = match;

    return {
      timestamp,
      relationName,
      scope,
      uri,
      duration: parseInt(duration),
      page: page ? parseInt(page) : 1,
      pageLength: pageLength ? parseInt(pageLength) : 25,
      rawLine: line
    };
  }

  /**
   * Parse a document request log entry
   * @param {string} line - The log line
   * @returns {Object|null} - Parsed document request or null
   */
  parseDocumentRequest(line) {
    const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}).*Applied the '([^']+)' profile to '([^']+)' in (\d+) milliseconds?/);
    if (!match) return null;

    const [, timestamp, profile, uri, duration] = match;

    // Extract type and UUID from URI
    const uriMatch = uri.match(/\/data\/([^/]+)\/([^/]+)$/);
    const type = uriMatch ? uriMatch[1] : '';
    const uuid = uriMatch ? uriMatch[2] : '';

    return {
      timestamp,
      profile,
      uri,
      type,
      uuid,
      duration: parseInt(duration),
      rawLine: line
    };
  }

  /**
   * Extract test cases for a specific endpoint from parsed log data
   * @param {Object} logData - Parsed log data
   * @param {string} endpointKey - Endpoint key
   * @param {string} sourceFile - Source log file relative path
   * @returns {Array<Object>} - Array of test case objects
   */
  extractTestCasesForEndpoint(logData, endpointKey, sourceFile) {
    switch (endpointKey) {
      case 'get-search':
        return this.extractSearchTestCases(logData, sourceFile);
      case 'get-facets':
        return this.extractFacetTestCases(logData, sourceFile);
      case 'get-related-list':
        return this.extractRelatedListTestCases(logData, sourceFile);
      case 'get-data':
        return this.extractDocumentTestCases(logData, sourceFile);
      case 'get-search-estimate':
        return this.extractSearchEstimateTestCases(logData, sourceFile);
      case 'get-search-will-match':
        return this.extractSearchWillMatchTestCases(logData, sourceFile);
      default:
        return [];
    }
  }

  /**
   * Extract search test cases
   * @param {Object} logData - Parsed log data
   * @param {string} sourceFile - Source file relative path
   * @returns {Array<Object>} - Test cases
   */
  extractSearchTestCases(logData, sourceFile) {
    const testCases = [];
    const sourceLabel = this.createSourceLabel(sourceFile);
    
    // // Use completed search requests (original logic)
    // for (const request of logData.requestsCompleted) {
    //   // Determine the q parameter value
    //   let qParam = '';
    //   if (request.searchParams.q) {
    //     // Simple string query
    //     qParam = request.searchParams.q;
    //   } else if (request.searchParams.text) {
    //     // Text-based search
    //     qParam = request.searchParams.text;
    //   } else {
    //     // Check if we have complex criteria that should be serialized as JSON
    //     const criteriaWithoutScope = { ...request.searchParams };
    //     delete criteriaWithoutScope.scope; // Remove scope as it's handled separately
        
    //     if (Object.keys(criteriaWithoutScope).length > 0) {
    //       // We have complex search criteria - serialize as JSON string
    //       qParam = JSON.stringify(criteriaWithoutScope);
    //     }
    //   }
      
    //   const testCase = {
    //     testName: `Search (completed) ${sourceLabel} at ${request.timestamp}`,
    //     timestamp: request.timestamp,
    //     duration: request.duration,
    //     expectedStatus: request.isSuccessful ? 200 : 500,
    //     timeout: Math.max(30000, request.duration * 3), // 3x the actual duration or 30s minimum
    //     maxResponseTime: Math.max(5000, request.duration * 2), // 2x the actual duration or 5s minimum
    //     params: {
    //       scope: request.searchParams.scope || 'item',
    //       q: qParam,
    //       ...request.searchParams
    //     },
    //     sourceFile,
    //     rawLine: request.rawLine
    //   };
      
    //   testCases.push(testCase);
    // }
    
    // Also use search request contexts (new logic to capture more requests)
    for (const request of logData.successfulSearchRequests) {
      // Determine the q parameter value
      let qParam = '';
      if (request.searchParams.q) {
        // Simple string query
        qParam = request.searchParams.q;
      } else if (request.searchParams.text) {
        // Text-based search
        qParam = request.searchParams.text;
      } else {
        // Check if we have other search criteria
        const criteriaWithoutScope = { ...request.searchParams };
        delete criteriaWithoutScope.scope; // Remove scope as it's handled separately
        
        if (Object.keys(criteriaWithoutScope).length > 1) { // More than just scope
          // We have complex search criteria - serialize as JSON string
          qParam = JSON.stringify(criteriaWithoutScope);
        }
      }
      
      const testCase = {
        testName: `Search (context) ${sourceLabel} at ${request.timestamp}`,
        timestamp: request.timestamp,
        duration: request.duration || 5000, // Default duration since request context may not have timing
        expectedStatus: 200, // Assume successful
        timeout: 30000, // Default timeout
        maxResponseTime: 10000, // Default max response time
        params: {
          scope: request.searchParams.scope || 'item',
          q: qParam,
          ...request.searchParams
        },
        sourceFile,
        rawLine: request.rawLine
      };
      
      testCases.push(testCase);
    }

    return testCases;
  }

  /**
   * Extract facet test cases
   * @param {Object} logData - Parsed log data  
   * @param {string} sourceFile - Source file name
   * @returns {Array<Object>} - Test cases
   */
  extractFacetTestCases(logData, sourceFile) {
    const testCases = [];
    
    for (const facet of logData.facetRequests) {
      const testCase = {
        testName: `Facet ${facet.facetName} from ${sourceFile}`,
        timestamp: facet.timestamp,
        duration: facet.duration,
        expectedStatus: 200,
        timeout: Math.max(15000, facet.duration * 3),
        maxResponseTime: Math.max(3000, facet.duration * 2),
        params: {
          scope: 'item', // Default scope for facets
          name: facet.facetName,
          page: facet.page,
          pageLength: facet.pageLength
        },
        sourceFile,
        rawLine: facet.rawLine
      };
      
      testCases.push(testCase);
    }

    return testCases;
  }

  /**
   * Extract related list test cases
   * @param {Object} logData - Parsed log data
   * @param {string} sourceFile - Source file name
   * @returns {Array<Object>} - Test cases
   */
  extractRelatedListTestCases(logData, sourceFile) {
    const testCases = [];
    
    for (const relatedList of logData.relatedListRequests) {
      const testCase = {
        testName: `Related list ${relatedList.relationName} for ${relatedList.scope} from ${sourceFile}`,
        timestamp: relatedList.timestamp,
        duration: relatedList.duration,
        expectedStatus: 200,
        timeout: Math.max(20000, relatedList.duration * 3),
        maxResponseTime: Math.max(5000, relatedList.duration * 2),
        params: {
          scope: relatedList.scope,
          uri: relatedList.uri,
          name: relatedList.relationName,
          page: relatedList.page,
          pageLength: relatedList.pageLength
        },
        sourceFile,
        rawLine: relatedList.rawLine
      };
      
      testCases.push(testCase);
    }

    return testCases;
  }

  /**
   * Extract document test cases
   * @param {Object} logData - Parsed log data
   * @param {string} sourceFile - Source file name
   * @returns {Array<Object>} - Test cases
   */
  extractDocumentTestCases(logData, sourceFile) {
    const testCases = [];
    
    for (const document of logData.documentRequests) {
      const testCase = {
        testName: `Document ${document.type} with ${document.profile} profile from ${sourceFile}`,
        timestamp: document.timestamp,
        duration: document.duration,
        expectedStatus: 200,
        timeout: Math.max(10000, document.duration * 3),
        maxResponseTime: Math.max(2000, document.duration * 2),
        params: {
          type: document.type,
          uuid: document.uuid,
          profile: document.profile
        },
        sourceFile,
        rawLine: document.rawLine
      };
      
      testCases.push(testCase);
    }

    return testCases;
  }

  /**
   * Extract search estimate test cases
   * @param {Object} logData - Parsed log data
   * @param {string} sourceFile - Source file name
   * @returns {Array<Object>} - Test cases
   */
  extractSearchEstimateTestCases(logData, sourceFile) {
    const testCases = [];
    
    for (const estimate of logData.searchEstimates) {
      const testCase = {
        testName: `Search estimate from ${sourceFile} at ${estimate.timestamp}`,
        timestamp: estimate.timestamp,
        duration: estimate.duration,
        expectedStatus: 200,
        timeout: Math.max(10000, estimate.duration * 3),
        maxResponseTime: Math.max(2000, estimate.duration * 2),
        params: {
          scope: 'item' // Default scope for estimates
        },
        sourceFile,
        rawLine: estimate.rawLine
      };
      
      testCases.push(testCase);
    }

    return testCases;
  }

  /**
   * Extract search will match test cases
   * @param {Object} logData - Parsed log data
   * @param {string} sourceFile - Source file name
   * @returns {Array<Object>} - Test cases
   */
  extractSearchWillMatchTestCases(logData, sourceFile) {
    const testCases = [];
    
    for (const willMatch of logData.searchWillMatch) {
      const testCase = {
        testName: `Search will match (${willMatch.searchCount} searches) from ${sourceFile}`,
        timestamp: willMatch.timestamp,
        duration: willMatch.duration,
        expectedStatus: 200,
        timeout: Math.max(10000, willMatch.duration * 3),
        maxResponseTime: Math.max(2000, willMatch.duration * 2),
        params: {
          scope: 'item' // Default scope
        },
        sourceFile,
        rawLine: willMatch.rawLine
      };
      
      testCases.push(testCase);
    }

    return testCases;
  }

  /**
   * Convert test cases to test rows matching the column structure
   * @param {Array<Object>} testCases - Test case objects
   * @param {Array<string>} columns - Column structure
   * @param {string} sourceFile - Source file name
   * @returns {Array<Array>} - Test data rows
   */
  convertToTestRows(testCases, columns, sourceFile) {
    return testCases.map((testCase, index) => {
      return columns.map(columnName => {
        if (columnName === 'test_name') {
          return testCase.testName || `Backend log test ${index + 1}`;
        } else if (columnName === 'description') {
          return `Generated from backend logs: ${testCase.rawLine?.substring(0, 100)}...` || '';
        } else if (columnName === 'enabled') {
          return true;
        } else if (columnName === 'expected_status') {
          return testCase.expectedStatus || 200;
        } else if (columnName === 'timeout_ms') {
          return testCase.timeout || 30000;
        } else if (columnName === 'max_response_time') {
          return testCase.maxResponseTime || 10000;
        } else if (columnName === 'delay_after_ms') {
          return 0;
        } else if (columnName === 'tags') {
          return `backend-logs,${sourceFile.replace('.txt', '')}`;
        } else if (columnName.startsWith('param:')) {
          const paramName = columnName.replace('param:', '');
          return testCase.params?.[paramName] || '';
        } else {
          return '';
        }
      });
    });
  }

  /**
   * Apply filters and limits to test rows
   * @param {Array<Array>} testRows - Test data rows
   * @param {string} endpointKey - Endpoint key
   * @returns {Array<Array>} - Filtered test rows
   */
  applyFiltersAndLimits(testRows, endpointKey) {
    let filtered = [...testRows];

    // Remove duplicates based on parameter combinations
    const seen = new Set();
    filtered = filtered.filter((row, index) => {
      // Create a key from the parameter columns to detect duplicates
      // For now, we'll be less aggressive with deduplication and mainly focus on exact parameter matches
      const paramCols = [];
      row.forEach((val, idx) => {
        // Assume columns after index 8 are typically parameters (simplified approach)
        if (idx >= 8 && val && val.toString().trim()) {
          paramCols.push(val.toString().trim());
        }
      });
      const paramKey = paramCols.join('|');
      
      // Only filter out if we have an exact parameter match and it's not empty
      if (paramKey && paramKey !== '' && seen.has(paramKey)) {
        return false;
      }
      if (paramKey) {
        seen.add(paramKey);
      }
      return true;
    });

    // // Apply limits
    // const maxCases = this.options.maxTestCasesPerEndpoint || 50;
    // if (filtered.length > maxCases) {
    //   console.log(`  - Limiting ${endpointKey} test cases from ${filtered.length} to ${maxCases}`);
      
    //   // Try to get a good distribution by sorting by various criteria and taking from different parts
    //   filtered = filtered.sort((a, b) => {
    //     // Sort by test name to get some variety
    //     const nameA = a[0] || '';
    //     const nameB = b[0] || '';
    //     return nameA.localeCompare(nameB);
    //   });
      
    //   // Take every Nth item to get good coverage
    //   const step = Math.ceil(filtered.length / maxCases);
    //   const distributed = [];
    //   for (let i = 0; i < filtered.length && distributed.length < maxCases; i += step) {
    //     distributed.push(filtered[i]);
    //   }
    //   filtered = distributed;
    // }

    return filtered;
  }

  /**
   * Create a readable source label from file path
   * @param {string} sourceFile - Source file relative path
   * @returns {string} - Readable label
   */
  createSourceLabel(sourceFile) {
    if (sourceFile.includes('/') || sourceFile.includes('\\')) {
      // Has directory structure - create a nice label
      const parts = sourceFile.replace(/\\/g, '/').split('/');
      const dir = parts.slice(0, -1).join('/');
      const file = parts[parts.length - 1].replace(/\.txt$/i, '');
      return `from ${dir}/${file}`;
    } else {
      // Just a filename
      return `from ${sourceFile.replace(/\.txt$/i, '')}`;
    }
  }
}
