#!/usr/bin/env node

/**
 * Script to analyze app.js and extract endpoint information
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeAppJs() {
  try {
    const appJsPath = path.join(__dirname, '..', '..', 'app', 'app.js');
    console.log(`Analyzing ${appJsPath}`);
    const content = await fs.readFile(appJsPath, 'utf-8');
    
    const endpoints = [];
    
    // Parse route definitions from the run() method
    const routes = extractRoutes(content);
    
    // For each route, analyze the corresponding handler
    for (const route of routes) {
      const handlerInfo = analyzeHandler(content, route.handlerName);
      
      const endpoint = {
        path: route.path,
        method: route.method,
        description: handlerInfo.description,
        parameters: {
          path: handlerInfo.pathParams,
          query: handlerInfo.queryParams,
          body: handlerInfo.bodyParam
        },
        required: {
          path: handlerInfo.requiredPathParams,
          query: handlerInfo.requiredQueryParams
        }
      };
      
      if (handlerInfo.bodyParam) {
        endpoint.required.body = true;
      }
      
      endpoints.push(endpoint);
    }
    
    // Add special endpoints that are inline
    endpoints.push({
      path: "/health",
      method: "GET", 
      description: "Health check endpoint",
      parameters: {
        path: [],
        query: [],
        body: null
      },
      required: {
        path: [],
        query: []
      }
    });
    
    const result = { endpoints };
    
    const outputPath = path.join(__dirname, 'endpoints-definition.json');
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`Endpoints specification: ${outputPath}`);
    
  } catch (error) {
    console.error('Error analyzing app.js:', error.message);
    process.exit(1);
  }
}

function extractRoutes(content) {
  const routes = [];
  
  // Regex to match Express route definitions
  const routeRegex = /exp\.(get|post|put|delete|patch)\(['"]([^'"]+)['"],\s*this\.(\w+)\.bind\(this\)\)/g;
  
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const [, method, path, handlerName] = match;
    routes.push({
      method: method.toUpperCase(),
      path,
      handlerName
    });
  }
  
  // Also handle static method handlers
  const staticRouteRegex = /exp\.(get|post|put|delete|patch)\(['"]([^'"]+)['"],\s*App\.(\w+)\)/g;
  while ((match = staticRouteRegex.exec(content)) !== null) {
    const [, method, path, handlerName] = match;
    routes.push({
      method: method.toUpperCase(),
      path,
      handlerName
    });
  }
  
  return routes;
}

function analyzeHandler(content, handlerName) {
  const handlerInfo = {
    description: '',
    pathParams: [],
    queryParams: [],
    bodyParam: null,
    requiredPathParams: [],
    requiredQueryParams: []
  };
  
  // Find the handler method
  const handlerRegex = new RegExp(`async\\s+${handlerName}\\s*\\([^{]*\\{([^}]|\\{[^}]*\\})*`, 'gs');
  const handlerMatch = handlerRegex.exec(content);
  
  if (!handlerMatch) {
    // Try static handler
    const staticHandlerRegex = new RegExp(`static\\s+${handlerName}\\s*=\\s*\\([^{]*\\{([^}]|\\{[^}]*\\})*`, 'gs');
    const staticMatch = staticHandlerRegex.exec(content);
    if (staticMatch) {
      handlerInfo.description = getDescriptionForHandler(handlerName);
      return handlerInfo;
    }
    return handlerInfo;
  }
  
  const handlerCode = handlerMatch[0];
  
  // Extract path parameters
  const pathParamMatches = handlerCode.match(/const\s*{\s*([^}]+)\s*}\s*=\s*req\.params/);
  if (pathParamMatches) {
    const pathParamNames = pathParamMatches[1]
      .split(',')
      .map(p => p.trim())
      .filter(p => p);
    
    pathParamNames.forEach(paramName => {
      const param = { name: paramName, type: 'string' };
      
      // Add validation info for specific endpoints
      if (handlerName === 'handleResolve') {
        if (paramName === 'scope') {
          param.validValues = ['objects', 'works'];
        } else if (paramName === 'unit') {
          param.validValues = ['lml', 'pmc', 'ycba', 'ypm', 'yuag', 'yul'];
        }
      }
      
      handlerInfo.pathParams.push(param);
      handlerInfo.requiredPathParams.push(paramName);
    });
  }
  
  // Extract query parameters
  const queryPatterns = [
    /const\s+(\w+)\s*=\s*req\.query\.(\w+)(?:\s*\|\|\s*['"]([^'"]*)['"]\s*|\s*\|\|\s*(\d+)\s*|\s*\|\|\s*(true|false|null))?/g,
    /const\s*{\s*([^}]+)\s*}\s*=\s*req\.query/g
  ];
  
  queryPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(handlerCode)) !== null) {
      if (pattern.source.includes('{')) {
        // Destructuring pattern
        const queryParamNames = match[1]
          .split(',')
          .map(p => p.trim())
          .filter(p => p);
        
        queryParamNames.forEach(paramName => {
          handlerInfo.queryParams.push({
            name: paramName,
            type: 'string'
          });
        });
      } else {
        // Individual assignment pattern
        const [, varName, paramName, stringDefault, numDefault, boolDefault] = match;
        
        const param = {
          name: paramName,
          type: 'string'
        };
        
        if (stringDefault !== undefined) {
          param.default = stringDefault;
        } else if (numDefault !== undefined) {
          param.type = 'integer';
          param.default = parseInt(numDefault);
        } else if (boolDefault !== undefined) {
          param.type = 'boolean';
          param.default = boolDefault === 'true';
        }
        
        handlerInfo.queryParams.push(param);
      }
    }
  });
  
  // Look for more complex query parameter handling
  analyzeComplexQueryParams(handlerCode, handlerInfo);
  
  // Check for body parameter usage
  if (handlerCode.includes('req.body')) {
    handlerInfo.bodyParam = {
      type: 'object',
      description: 'Document data in JSON format'
    };
    
    if (handlerName === 'handleUpdateDocument') {
      handlerInfo.bodyParam.description = 'Updated document data in JSON format';
    }
  }
  
  // Set description
  handlerInfo.description = getDescriptionForHandler(handlerName);
  
  // Check for required query parameters
  analyzeRequiredParams(handlerCode, handlerInfo);
  
  return handlerInfo;
}

function analyzeComplexQueryParams(handlerCode, handlerInfo) {
  // Handle specific patterns found in handlers
  
  // AutoComplete handler has many specific parameters
  if (handlerCode.includes('handleAutoComplete')) {
    const autoCompleteParams = [
      { name: 'text', type: 'string', default: '' },
      { name: 'context', type: 'string', default: '' },
      { name: 'fullyHonorContext', type: 'boolean', default: true },
      { name: 'onlyMatchOnPrimaryNames', type: 'boolean', default: true },
      { name: 'onlyReturnPrimaryNames', type: 'boolean', default: false },
      { name: 'page', type: 'integer', default: 1 },
      { name: 'pageLength', type: 'integer', default: 10 },
      { name: 'filterIndex', type: 'integer', default: 0 },
      { name: 'previouslyFiltered', type: 'integer', default: 1 },
      { name: 'timeoutInMilliseconds', type: 'integer', default: 0 }
    ];
    
    handlerInfo.queryParams = autoCompleteParams;
  }
  
  // Search handler parameters
  if (handlerCode.includes('handleSearch')) {
    const searchParams = [
      { name: 'q', type: 'string' },
      { name: 'mayChangeScope', type: 'boolean', default: false },
      { name: 'page', type: 'integer', default: 1 },
      { name: 'pageLength', type: 'integer', default: 20 },
      { name: 'pageWith', type: 'string', default: '' },
      { name: 'sort', type: 'string', default: '' },
      { name: 'filterResults', type: 'boolean', default: true },
      { name: 'facetsSoon', type: 'boolean', default: true },
      { name: 'synonymsEnabled', type: 'boolean', default: true }
    ];
    
    handlerInfo.queryParams = searchParams;
  }
  
  // Related list handler
  if (handlerCode.includes('handleRelatedList')) {
    const relatedListParams = [
      { name: 'name', type: 'string', default: '' },
      { name: 'uri', type: 'string', default: '' },
      { name: 'page', type: 'integer', default: 1 },
      { name: 'pageLength', type: 'integer', default: null },
      { name: 'filterResults', type: 'boolean', default: true },
      { name: 'relationshipsPerRelation', type: 'integer', default: null }
    ];
    
    handlerInfo.queryParams = relatedListParams;
  }
  
  // Document handlers (GET)
  if (handlerCode.includes('handleGetDocument')) {
    handlerInfo.queryParams = [
      { name: 'profile', type: 'string' },
      { name: 'lang', type: 'string' }
    ];
  }
}

function analyzeRequiredParams(handlerCode, handlerInfo) {
  // Check for translate handler which requires 'q' parameter
  if (handlerCode.includes('handleTranslate')) {
    handlerInfo.requiredQueryParams.push('q');
  }
}

function getDescriptionForHandler(handlerName) {
  const descriptions = {
    'handleAdvancedSearchConfig': 'Get advanced search configuration',
    'handleAutoComplete': 'Auto-complete functionality for search terms',
    'handleFacets': 'Get faceted search results for a given scope',
    'handleRelatedList': 'Get related items for a given scope and entity',
    'handleResolve': 'Resolve an identifier within a scope and unit to a resource URL',
    'handleSearch': 'Perform search within a given scope',
    'handleSearchEstimate': 'Get estimated count of search results for a given scope',
    'handleSearchInfo': 'Get search configuration information',
    'handleSearchWillMatch': 'Check if a search query will match any results',
    'handleStats': 'Get system statistics',
    'handleTenantStatus': 'Get tenant status information',
    'handleTranslate': 'Translate natural language queries or redirect to AI service for \'I want\' queries',
    'handleVersionInfo': 'Get version information',
    'handleGetDocument': 'Retrieve a specific document by type and UUID',
    'handleCreateDocument': 'Create a new document',
    'handleUpdateDocument': 'Update an existing document by type and UUID',
    'handleDeleteDocument': 'Delete a document by type and UUID',
    '_handleInfo': 'Get application information including memory usage, version, and system details'
  };
  
  return descriptions[handlerName] || `Handler: ${handlerName}`;
}

analyzeAppJs();
