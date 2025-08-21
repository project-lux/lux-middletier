import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEndpointKeyFromPath } from './utils.js';
import { TestDataProviderFactory } from './test-data-providers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create instances of all available TestDataProvider implementations
 * @returns {Array<TestDataProvider>} Array of all available provider instances
 */
function createAllProviders() {
  console.log('Creating all TestDataProvider instances...');
  
  // Create instances of all registered providers
  const allProviders = TestDataProviderFactory.createAllProviders();
  
  console.log(`Created ${allProviders.length} provider instance(s):`);
  allProviders.forEach(provider => {
    console.log(`  - ${provider.getProviderId()}`);
  });
  
  return allProviders;
}

/**
 * Create separate Excel test files for each API endpoint with parameter-specific columns
 * Based on endpoints-spec.json file and ALL available TestDataProvider implementations
 */
async function createEndpointTests(testsDir, options = {}) {
  console.log('Analyzing endpoints-spec.json to create individual test files...');

  // Get all API definitions
  const apiDefinitions = analyzeEndpointsSpec();
  console.log(
    `Found ${Object.keys(apiDefinitions).length} unique API endpoints\n`
  );

  // Create instances of all available TestDataProvider implementations
  const allProviders = createAllProviders();

  // Create tests directory if it doesn't exist
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  // Generate Excel test files for each API endpoint
  for (const endpointKey of Object.keys(apiDefinitions)) {
    const apiDef = apiDefinitions[endpointKey];
    await createTestsForAPI(apiDef, endpointKey, testsDir, allProviders, options);
  }

  console.log('\nTest file generation complete!');
  console.log('Next steps:');
  console.log('1. Review generated test cases in the Excel files');
  console.log('2. Add additional test configurations as needed');
  console.log('3. Yellow highlighted columns contain required parameters');
  console.log('4. Run tests with: npm test');
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
      
      // Parse path parameters - first try from specification, then extract from path
      let pathParams = endpoint.parameters.path || [];
      
      // If no path params in specification, extract them from the path string
      if (pathParams.length === 0) {
        const pathParamMatches = endpoint.path.match(/:([^/]+)/g);
        if (pathParamMatches) {
          pathParams = pathParamMatches.map(match => ({
            name: match.substring(1), // Remove the ':' prefix
            type: 'string'
          }));
        }
      }
      
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
        const requiredQueryParams = endpoint.required.query || [];
        const paramInfo = {
          name: param.name,
          datatype: param.type || 'string',
          nullable: !requiredQueryParams.includes(param.name),
        };

        if (requiredQueryParams.includes(param.name)) {
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
 * Create test file for a specific API endpoint using ALL available providers
 */
async function createTestsForAPI(apiDef, endpointKey, testsDir, allProviders, options = {}) {
  const filename = `${endpointKey}-tests.xlsx`;
  const filePath = path.join(testsDir, filename);

  console.log(`Creating test file for ${endpointKey}: ${filename}`);

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
    'provider_id', // New column for tracing tests to their data source
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

  // Collect test data from ALL providers for this endpoint
  const allTestData = await collectTestDataFromAllProviders(allProviders, apiDef, endpointKey, columns);

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([columns, ...allTestData]);

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
  console.log(`✓ Created ${filePath} with ${allTestData.length} test cases`);
}

/**
 * Collect test data from ALL available providers and combine them
 */
async function collectTestDataFromAllProviders(allProviders, apiDef, endpointKey, columns) {
  const allTestData = [];
  
  console.log(`Collecting test data from ${allProviders.length} providers for ${endpointKey}...`);

  // Collect from each provider
  for (const provider of allProviders) {
    try {
      console.log(`  - Trying provider: ${provider.constructor.name}`);
      
      const testData = await provider.extractTestData(apiDef, endpointKey, columns);
      
      if (testData && testData.length > 0) {
        console.log(`    ✓ Got ${testData.length} test cases from ${provider.constructor.name}`);
        
        // Add provider ID to each test row
        const providerId = provider.getProviderId();
        const providerIdIndex = columns.indexOf('provider_id');
        
        const enrichedTestData = testData.map(row => {
          // Create a copy of the row to avoid modifying the original
          const enrichedRow = [...row];
          
          // Set the provider ID at the correct column index
          if (providerIdIndex !== -1) {
            enrichedRow[providerIdIndex] = providerId;
          }
          
          return enrichedRow;
        });
        
        allTestData.push(...enrichedTestData);
      } else {
        console.log(`    - No data from ${provider.constructor.name}`);
      }
    } catch (error) {
      console.log(`    ⚠ Error from ${provider.constructor.name}: ${error.message}`);
    }
  }

  // If no data was collected from any provider, fall back to sample data
  if (allTestData.length === 0) {
    console.log(`  ! No data from any provider, falling back to sample data...`);
    
    // Try to find sample provider in the list
    const sampleProvider = allProviders.find(p => p.constructor.name === 'SampleTestDataProvider');
    if (sampleProvider) {
      const fallbackData = await sampleProvider.extractTestData(apiDef, endpointKey, columns);
      if (fallbackData && fallbackData.length > 0) {
        // Add provider ID to fallback data
        const providerId = sampleProvider.getProviderId();
        const providerIdIndex = columns.indexOf('provider_id');
        
        const enrichedFallbackData = fallbackData.map(row => {
          const enrichedRow = [...row];
          if (providerIdIndex !== -1) {
            enrichedRow[providerIdIndex] = providerId;
          }
          return enrichedRow;
        });
        
        allTestData.push(...enrichedFallbackData);
        console.log(`    ✓ Generated ${fallbackData.length} fallback test cases`);
      }
    }
  }

  console.log(`Total test cases collected: ${allTestData.length}`);
  return allTestData;
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
    ['provider_id', 'Identifier of the data provider that generated this test'],
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

// Main execution with optional configuration
const testsDir = path.join(__dirname, 'configs');

// Parse command line arguments for configuration
const args = process.argv.slice(2);
const options = {};

// Check for data source arguments
// Usage examples:
// node create-tests.js --data-source=./test-data.csv
// node create-tests.js --test-count=5 --include-errors=false
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--data-source=')) {
    options.dataSource = arg.split('=')[1];
  } else if (arg.startsWith('--test-count=')) {
    options.testCaseCount = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--include-errors=')) {
    options.includeErrorCases = arg.split('=')[1].toLowerCase() === 'true';
  } else if (arg.startsWith('--fallback=')) {
    options.fallbackToSample = arg.split('=')[1].toLowerCase() === 'true';
  }
}

if (options.dataSource) {
  console.log(`Using data source: ${options.dataSource}`);
}

await createEndpointTests(testsDir, options);
