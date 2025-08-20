import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create separate Excel files for each API endpoint with parameter-specific columns
 * Based on endpoints-spec.json file
 */
function createEndpointSpecificTemplates(templateDir) {
  console.log('Analyzing endpoints-spec.json to create individual templates...');

  // Get all API definitions
  const apiDefinitions = analyzeEndpointsSpec();
  console.log(
    `Found ${Object.keys(apiDefinitions).length} unique API endpoints`
  );

  // Create templates directory if it doesn't exist
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  // Generate Excel files for each API endpoint
  Object.keys(apiDefinitions).forEach((endpointKey) => {
    const apiDef = apiDefinitions[endpointKey];
    createTemplateForAPI(apiDef, endpointKey, templateDir);
  });

  console.log('\nTemplate generation complete!');
  console.log('Next steps:');
  console.log('1. Fill in test configurations in the Excel files');
  console.log('2. Yellow highlighted columns contain required parameters');
  console.log('3. Run tests with: npm test');
}

/**
 * Analyze endpoints-spec.json file to extract endpoint definitions and parameters
 */
function analyzeEndpointsSpec() {
  const endpointsSpecPath = path.resolve(__dirname, 'endpoints-spec.json');
  const endpoints = {};

  try {
    console.log(`Reading endpoints specification from: ${endpointsSpecPath}`);
    const content = fs.readFileSync(endpointsSpecPath, 'utf8');
    const spec = JSON.parse(content);

    if (!spec.endpoints || !Array.isArray(spec.endpoints)) {
      throw new Error('Invalid endpoints-spec.json format: missing endpoints array');
    }

    spec.endpoints.forEach((endpoint) => {
      const endpointKey = getEndpointKeyFromPath(endpoint.path, endpoint.method);
      
      // Parse path parameters
      const pathParams = endpoint.parameters.path || [];
      const queryParams = endpoint.parameters.query || [];
      
      const requiredParams = [];
      const optionalParams = [];

      // Process path parameters (these are always required)
      pathParams.forEach((param) => {
        const paramInfo = {
          name: param.name,
          datatype: param.type || 'string',
          nullable: false,
        };
        requiredParams.push(paramInfo);
      });

      // Process query parameters
      queryParams.forEach((param) => {
        const paramInfo = {
          name: param.name,
          datatype: param.type || 'string',
          nullable: !endpoint.required.query.includes(param.name),
        };

        if (endpoint.required.query.includes(param.name)) {
          requiredParams.push(paramInfo);
        } else {
          optionalParams.push(paramInfo);
        }
      });

      // Add body parameter if it exists
      if (endpoint.parameters.body) {
        const bodyParam = {
          name: 'body',
          datatype: 'jsonDocument',
          nullable: !endpoint.required.body,
        };

        if (endpoint.required.body) {
          requiredParams.push(bodyParam);
        } else {
          optionalParams.push(bodyParam);
        }
      }

      endpoints[endpointKey] = {
        functionName: endpointKey.replace(/-/g, ' '),
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
        requiredParams,
        optionalParams,
        allParams: [...requiredParams, ...optionalParams],
      };
    });

    return endpoints;
  } catch (error) {
    console.error(`Error reading endpoints-spec.json: ${error.message}`);
    throw error;
  }
}

/**
 * Generate endpoint key from path and HTTP method
 */
function getEndpointKeyFromPath(path, method) {
  // Convert path like "/api/search/:scope" to "search-scope"
  // and "/data/:type/:uuid" to "data-type-uuid"
  // Convert path like "/api/search/:scope" to "search"
  // and "/data/:type/:uuid" to "data"
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

/**
 * Create template for a specific API endpoint
 */
function createTemplateForAPI(apiDef, endpointKey, templateDir) {
  const filename = `${endpointKey}-tests.xlsx`;
  const filePath = path.join(templateDir, filename);

  console.log(`Creating template for ${endpointKey}: ${filename}`);

  // Build columns array
  const baseColumns = [
    'test_name',
    'description',
    'enabled',
    'expected_status',
    'timeout_ms',
    'max_response_time',
    'delay_after_ms',
    'tags',
  ];

  // Add required parameters first (will be highlighted)
  const requiredParamColumns = apiDef.requiredParams.map(
    (param) => `param:${param.name}`
  );

  // Add optional parameters after required ones
  const optionalParamColumns = apiDef.optionalParams.map(
    (param) => `param:${param.name}`
  );

  const columns = [
    ...baseColumns,
    ...requiredParamColumns,
    ...optionalParamColumns,
  ];

  // Generate sample data
  const sampleData = generateSampleData(apiDef, endpointKey, columns);

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([columns, ...sampleData]);

  // Apply styling to required parameter columns (light yellow background)
  if (requiredParamColumns.length > 0) {
    requiredParamColumns.forEach((requiredParam) => {
      const colIndex = columns.indexOf(requiredParam);
      if (colIndex !== -1) {
        // Convert column index to Excel column letter
        const colLetter = XLSX.utils.encode_col(colIndex);

        // Apply yellow background to header cell
        const headerCell = ws[colLetter + '1'];
        if (headerCell) {
          if (!headerCell.s) headerCell.s = {};
          headerCell.s.fill = {
            fgColor: { rgb: 'FFFF99' }, // Light yellow
          };
        }
      }
    });
  }

  // Set column widths for better readability
  const colWidths = columns.map((col) => ({
    width: col.startsWith('param:')
      ? 20
      : col === 'description'
      ? 30
      : col === 'test_name'
      ? 25
      : 15,
  }));
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Tests');

  // Add documentation sheet
  const docWs = createDocumentationSheetForAPI(
    apiDef,
    endpointKey,
    columns,
    requiredParamColumns
  );
  XLSX.utils.book_append_sheet(wb, docWs, 'Documentation');

  // Write the file
  XLSX.writeFile(wb, filePath);
  console.log(`✓ Created ${filePath}`);
}

/**
 * Generate sample test data for an API endpoint
 */
function generateSampleData(apiDef, endpointKey, columns) {
  const sampleRows = [];

  // Generate 2-3 sample test cases per endpoint
  const testCases = getSampleTestCases(apiDef, endpointKey);

  testCases.forEach((testCase, index) => {
    const row = [];

    columns.forEach((col) => {
      if (col === 'test_name') {
        row.push(testCase.name);
      } else if (col === 'description') {
        row.push(testCase.description);
      } else if (col === 'enabled') {
        row.push('true');
      } else if (col === 'expected_status') {
        row.push(testCase.expectedStatus || 200);
      } else if (col === 'timeout_ms') {
        row.push(10000);
      } else if (col === 'max_response_time') {
        row.push(testCase.maxResponseTime || 3000);
      } else if (col === 'delay_after_ms') {
        row.push(500);
      } else if (col === 'tags') {
        row.push(testCase.tags || `${endpointKey},functional`);
      } else if (col.startsWith('param:')) {
        const paramName = col.replace('param:', '');
        row.push(testCase.params[paramName] || '');
      } else {
        row.push('');
      }
    });

    sampleRows.push(row);
  });

  return sampleRows;
}

/**
 * Get sample test cases for an endpoint
 */
function getSampleTestCases(apiDef, endpointKey) {
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
    baseCase.params[param.name] = getSampleParamValue(param, endpointKey);
  });

  // Create variations for different test scenarios
  const testCases = [baseCase];

  // Add error test case if there are required parameters
  if (apiDef.requiredParams.length > 0) {
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

  return testCases;
}

/**
 * Generate sample parameter values based on parameter name and type
 */
function getSampleParamValue(param, endpointKey) {
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
 * Create documentation sheet for a specific API endpoint
 */
function createDocumentationSheetForAPI(
  apiDef,
  endpointKey,
  columns,
  requiredParamColumns
) {
  const docData = [
    [`LUX Endpoint Testing Framework - ${endpointKey.toUpperCase()}`],
    [''],
    ['HTTP Method:', apiDef.method],
    ['Path:', apiDef.path],
    ['Description:', apiDef.description],
    [''],
    ['Column Descriptions:'],
    ['test_name', 'Unique identifier for the test'],
    ['description', 'Human-readable description of what the test does'],
    ['enabled', 'Whether to run this test (true/false)'],
    ['expected_status', 'Expected HTTP status code (200, 404, etc.)'],
    ['timeout_ms', 'Request timeout in milliseconds'],
    ['max_response_time', 'Maximum acceptable response time in ms'],
    ['delay_after_ms', 'Delay after test completion in ms'],
    ['tags', 'Comma-separated tags for filtering tests'],
    [''],
  ];

  // Add parameter documentation
  if (apiDef.allParams.length > 0) {
    docData.push(['Parameter Descriptions:']);

    apiDef.allParams.forEach((param) => {
      const paramCol = `param:${param.name}`;
      const isRequired = requiredParamColumns.includes(paramCol);
      const description = getParameterDescription(param.name, param.datatype);
      docData.push([
        paramCol,
        `${description} (${param.datatype})${
          isRequired ? ' (REQUIRED - highlighted in yellow)' : ' (optional)'
        }`,
      ]);
    });
  }

  // Add endpoint-specific notes
  docData.push([''], ['Endpoint-Specific Notes:']);
  const endpointNotes = getEndpointNotes(endpointKey, apiDef);
  endpointNotes.forEach((note) => docData.push([note]));

  return XLSX.utils.aoa_to_sheet(docData);
}

/**
 * Get parameter descriptions based on parameter name and type
 */
function getParameterDescription(paramName, datatype) {
  const name = paramName.toLowerCase();

  const descriptions = {
    unitname: 'Unit name for multi-tenant deployments',
    q: 'Search query (string or JSON object)',
    scope: 'Search scope (work, person, place, concept, event, etc.)',
    page: 'Page number for pagination (1-based)',
    pagelength: 'Number of results per page',
    sort: 'Sort order for results',
    uri: 'URI of the resource',
    doc: 'JSON document for create/update operations',
    profile: 'Response profile (summary, full, etc.)',
    lang: 'Language code (en, es, fr, etc.)',
    text: 'Text to auto-complete or process',
    context: 'Context for auto-completion (person, place, concept, etc.)',
    name: 'Name parameter (varies by endpoint)',
  };

  return descriptions[name] || `${paramName} parameter`;
}

/**
 * Get endpoint-specific notes and tips
 */
function getEndpointNotes(endpointKey, apiDef) {
  const notes = [
    `• Method: ${apiDef.method}`,
    `• Path: ${apiDef.path}`,
    `• Description: ${apiDef.description}`
  ];

  if (apiDef.requiredParams.length > 0) {
    notes.push(
      `• Required parameters: ${apiDef.requiredParams
        .map((p) => p.name)
        .join(', ')}`
    );
  }

  if (apiDef.optionalParams.length > 0) {
    notes.push(
      `• Optional parameters: ${apiDef.optionalParams
        .map((p) => p.name)
        .join(', ')}`
    );
  }

  // Add specific notes based on endpoint type
  if (apiDef.path.includes('/data/') || endpointKey.includes('document')) {
    notes.push(
      '• Document operations may require different parameters based on the operation type'
    );
  }

  if (apiDef.path.includes('/search') || endpointKey.includes('search')) {
    notes.push('• Search queries can be strings or complex JSON objects');
  }

  if (apiDef.method === 'POST' || apiDef.method === 'PUT') {
    notes.push('• This endpoint may require a JSON body payload');
  }

  return notes;
}

const templateDir = path.join(__dirname, 'templates');
createEndpointSpecificTemplates(templateDir);
