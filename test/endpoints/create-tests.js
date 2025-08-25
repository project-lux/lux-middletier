import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { getEndpointKeyFromPath, isDefined } from "./utils.js";
import { TestDataProviderFactory } from "./test-data-providers/index.js";
import { ENDPOINT_KEYS } from "./constants.js";
import { getSearchRelatedTestConfigs } from "./relatedTestUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create instances of all available TestDataProvider implementations
 * @param {Array<string>} providerFilter - Optional filter for specific providers
 * @returns {Array<TestDataProvider>} Array of filtered provider instances
 */
function createAllProviders(providerFilter = null) {
  console.log("Creating TestDataProvider instances...");

  // Create instances of all registered providers
  const allProviders = TestDataProviderFactory.createAllProviders();

  // Apply provider filtering if specified
  let filteredProviders = allProviders;
  if (providerFilter && providerFilter.length > 0) {
    filteredProviders = allProviders.filter(provider => 
      shouldIncludeProvider(provider.getProviderId(), providerFilter)
    );
  }

  console.log(`Created ${filteredProviders.length} provider instance(s):`);
  filteredProviders.forEach((provider) => {
    console.log(`  - ${provider.getProviderId()}`);
  });

  if (providerFilter && providerFilter.length > 0 && filteredProviders.length === 0) {
    console.warn("Warning: Provider filter resulted in no providers being selected");
  }

  return filteredProviders;
}

/**
 * Determine if a provider should be included based on filter criteria
 * Supports inclusion (default) and exclusion (with ^ prefix)
 */
function shouldIncludeProvider(providerId, providerFilter) {
  if (!providerFilter || providerFilter.length === 0) {
    return true; // No filter means include all
  }

  // Separate inclusion and exclusion filters
  const inclusionFilters = [];
  const exclusionFilters = [];

  for (const filter of providerFilter) {
    if (filter.startsWith('^')) {
      exclusionFilters.push(filter.substring(1)); // Remove ^ prefix
    } else {
      inclusionFilters.push(filter);
    }
  }

  // If provider matches any exclusion filter, exclude it
  if (exclusionFilters.length > 0 && exclusionFilters.includes(providerId)) {
    return false;
  }

  // If there are inclusion filters, provider must match at least one
  if (inclusionFilters.length > 0) {
    return inclusionFilters.includes(providerId);
  }

  // If only exclusion filters exist and provider wasn't excluded, include it
  return true;
}

/**
 * Determine if an endpoint should be included based on filter criteria
 * Supports inclusion (default) and exclusion (with ^ prefix)
 */
function shouldIncludeEndpoint(endpointKey, endpointFilter) {
  if (!endpointFilter || endpointFilter.length === 0) {
    return true; // No filter means include all
  }

  // Separate inclusion and exclusion filters
  const inclusionFilters = [];
  const exclusionFilters = [];

  for (const filter of endpointFilter) {
    if (filter.startsWith('^')) {
      exclusionFilters.push(filter.substring(1)); // Remove ^ prefix
    } else {
      inclusionFilters.push(filter);
    }
  }

  // If endpoint matches any exclusion filter, exclude it
  if (exclusionFilters.length > 0 && exclusionFilters.includes(endpointKey)) {
    return false;
  }

  // If there are inclusion filters, endpoint must match at least one
  if (inclusionFilters.length > 0) {
    return inclusionFilters.includes(endpointKey);
  }

  // If only exclusion filters exist and endpoint wasn't excluded, include it
  return true;
}

/**
 * Create separate Excel test files for each API endpoint with parameter-specific columns
 * Based on endpoints-spec.json file and filtered TestDataProvider implementations
 */
async function createEndpointTests(testsDir, options = {}) {
  console.log(
    "Analyzing endpoints-spec.json to create individual test files..."
  );

  // Create tests directory if it doesn't exist
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  // Clean up existing Excel files
  console.log(`Deleting existing Excel files in ${testsDir}...`);
  try {
    const files = fs.readdirSync(testsDir);
    const excelFiles = files.filter(file => file.endsWith('.xlsx'));
    
    if (excelFiles.length > 0) {
      console.log(`Found ${excelFiles.length} existing Excel file(s) to remove:`);
      for (const file of excelFiles) {
        const filePath = path.join(testsDir, file);
        fs.unlinkSync(filePath);
        console.log(`  - Deleted: ${file}`);
      }
    } else {
      console.log("  No existing Excel files found");
    }
  } catch (error) {
    console.error(`Unable to delete spreadsheets: ${error.message}`);
    process.exit(1);
  }

  // Get all API definitions
  const apiDefinitions = analyzeEndpointsSpec();
  console.log(
    `Found ${Object.keys(apiDefinitions).length} unique API endpoints\n`
  );

  // Apply endpoint filtering
  let endpointKeys = Object.keys(apiDefinitions);
  if (options.endpointFilter && options.endpointFilter.length > 0) {
    const originalCount = endpointKeys.length;
    endpointKeys = endpointKeys.filter(key => 
      shouldIncludeEndpoint(key, options.endpointFilter)
    );
    console.log(
      `Filtered endpoints: ${endpointKeys.length}/${originalCount} endpoints selected`
    );
    if (endpointKeys.length === 0) {
      console.warn("Warning: Endpoint filter resulted in no endpoints being selected");
      return;
    }
  }

  // Create instances of filtered TestDataProvider implementations
  const allProviders = createAllProviders(options.providerFilter);
  if (allProviders.length === 0) {
    console.warn("Warning: No providers available for test generation");
    return;
  }

  // Generate Excel test files for each API endpoint
  // Prioritize GET_SEARCH tests first
  const getSearchKey = ENDPOINT_KEYS.GET_SEARCH;

  // Track statistics for summary
  const endpointStats = {};
  let totalUniqueTests = 0;
  let totalDuplicatesFound = 0;
  let totalTestsBeforeDedup = 0;
  const overallStartTime = Date.now();

  // Generate the search requests first.
  let searchTestConfigs = null;
  if (endpointKeys.includes(getSearchKey)) {
    console.log(`\nProcessing priority endpoint: ${getSearchKey}`);
    const apiDef = apiDefinitions[getSearchKey];
    
    const startTime = Date.now();
    const result = await createTestsForEndpoint(
      apiDef,
      getSearchKey,
      testsDir,
      allProviders,
      options
    );
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    searchTestConfigs = result;
    
    // Record stats for search endpoint
    if (result && result.stats) {
      endpointStats[getSearchKey] = {
        ...result.stats,
        duration: duration
      };
      totalUniqueTests += result.stats.uniqueTests;
      totalDuplicatesFound += result.stats.duplicatesRemoved;
      totalTestsBeforeDedup += result.stats.totalBeforeDedup;
    }

    if (options.skipDeduplication) {
      totalDuplicatesFound = "Disabled";
    }
  }

  // Process remaining endpoints
  for (const endpointKey of endpointKeys) {
    if (endpointKey !== getSearchKey) {
      const apiDef = apiDefinitions[endpointKey];
      
      const startTime = Date.now();
      const result = await createTestsForEndpoint(
        apiDef,
        endpointKey,
        testsDir,
        allProviders,
        options,
        searchTestConfigs
      );
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Record stats for this endpoint
      if (result && result.stats) {
        endpointStats[endpointKey] = {
          ...result.stats,
          duration: duration
        };
        totalUniqueTests += result.stats.uniqueTests;
        totalDuplicatesFound += result.stats.duplicatesRemoved;
        totalTestsBeforeDedup += result.stats.totalBeforeDedup;
      }

      if (options.skipDeduplication) {
        totalDuplicatesFound = "Disabled";
      }
    }
  }

  const overallEndTime = Date.now();
  const totalDuration = overallEndTime - overallStartTime;

  // Helper function to format duration in a human-readable way
  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  };

  // Print summary
  console.log("\n" + "=".repeat(92));
  console.log("TEST GENERATION SUMMARY");
  console.log("=".repeat(92));

  // Sort endpoints by name for consistent output
  const sortedEndpoints = Object.keys(endpointStats).sort();
  
  // Helper function to format numbers with commas
  const formatNumber = (num) => num.toLocaleString();
  
  // Calculate column widths based on the data
  const endpointKeyWidth = Math.max(
    "Endpoint".length,
    ...sortedEndpoints.map(key => key.length),
    "TOTALS".length
  ) + 2;
  
  const totalBeforeWidth = Math.max(
    "Total Before Dedup".length,
    formatNumber(totalTestsBeforeDedup).length,
    ...sortedEndpoints.map(key => formatNumber(endpointStats[key].totalBeforeDedup).length)
  ) + 2;
  
  const uniqueTestsWidth = Math.max(
    "Unique Tests".length,
    formatNumber(totalUniqueTests).length,
    ...sortedEndpoints.map(key => formatNumber(endpointStats[key].uniqueTests).length)
  ) + 2;
  
  const duplicatesWidth = Math.max(
    "Duplicates Removed".length,
    formatNumber(totalDuplicatesFound).length,
    ...sortedEndpoints.map(key => formatNumber(endpointStats[key].duplicatesRemoved).length)
  ) + 2;
  
  const durationWidth = Math.max(
    "Duration".length,
    formatDuration(totalDuration).length,
    ...sortedEndpoints.map(key => formatDuration(endpointStats[key].duration).length)
  ) + 2;

  // Print table header
  console.log("\n" + 
    "Endpoint".padEnd(endpointKeyWidth) +
    "Total Before Dedup".padStart(totalBeforeWidth) +
    "Unique Tests".padStart(uniqueTestsWidth) +
    "Duplicates Removed".padStart(duplicatesWidth) +
    "Duration".padStart(durationWidth)
  );
  
  console.log(
    "-".repeat(endpointKeyWidth) +
    "-".repeat(totalBeforeWidth) +
    "-".repeat(uniqueTestsWidth) +
    "-".repeat(duplicatesWidth) +
    "-".repeat(durationWidth)
  );
  
  // Print each endpoint's data
  for (const endpointKey of sortedEndpoints) {
    const stats = endpointStats[endpointKey];
    console.log(
      endpointKey.padEnd(endpointKeyWidth) +
      formatNumber(stats.totalBeforeDedup).padStart(totalBeforeWidth) +
      formatNumber(stats.uniqueTests).padStart(uniqueTestsWidth) +
      formatNumber(stats.duplicatesRemoved).padStart(duplicatesWidth) +
      formatDuration(stats.duration).padStart(durationWidth)
    );
  }
  
  // Print separator line before totals
  console.log(
    "-".repeat(endpointKeyWidth) +
    "-".repeat(totalBeforeWidth) +
    "-".repeat(uniqueTestsWidth) +
    "-".repeat(duplicatesWidth) +
    "-".repeat(durationWidth)
  );
  
  // Print totals row
  console.log(
    "TOTALS".padEnd(endpointKeyWidth) +
    formatNumber(totalTestsBeforeDedup).padStart(totalBeforeWidth) +
    formatNumber(totalUniqueTests).padStart(uniqueTestsWidth) +
    formatNumber(totalDuplicatesFound).padStart(duplicatesWidth) +
    formatDuration(totalDuration).padStart(durationWidth)
  );
  
  console.log(`\nEndpoints processed: ${Object.keys(endpointStats).length}`);
  
  // Show excluded providers and endpoints if filtering was applied
  if (options.providerFilter || options.endpointFilter) {
    console.log("\n" + "=".repeat(50));
    console.log("FILTERING SUMMARY");
    console.log("=".repeat(50));
    
    // Show excluded providers
    if (options.providerFilter && options.providerFilter.length > 0) {
      const allAvailableProviders = TestDataProviderFactory.createAllProviders().map(p => p.getProviderId());
      const filteredProviders = createAllProviders(options.providerFilter);
      const includedProviders = filteredProviders.map(p => p.getProviderId());
      const excludedProviders = allAvailableProviders.filter(p => !includedProviders.includes(p));
      
      console.log(`\nProviders included (${includedProviders.length}/${allAvailableProviders.length}):`);
      includedProviders.sort().forEach(provider => console.log(`  ✓ ${provider}`));
      
      if (excludedProviders.length > 0) {
        console.log(`\nProviders excluded (${excludedProviders.length}/${allAvailableProviders.length}):`);
        excludedProviders.sort().forEach(provider => console.log(`  ✗ ${provider}`));
      }
    }
    
    // Show excluded endpoints
    if (options.endpointFilter && options.endpointFilter.length > 0) {
      const allAvailableEndpoints = Object.values(ENDPOINT_KEYS).sort();
      const includedEndpoints = endpointKeys.sort();
      const excludedEndpoints = allAvailableEndpoints.filter(e => !includedEndpoints.includes(e));
      
      console.log(`\nEndpoints included (${includedEndpoints.length}/${allAvailableEndpoints.length}):`);
      includedEndpoints.forEach(endpoint => console.log(`  ✓ ${endpoint}`));
      
      if (excludedEndpoints.length > 0) {
        console.log(`\nEndpoints excluded (${excludedEndpoints.length}/${allAvailableEndpoints.length}):`);
        excludedEndpoints.forEach(endpoint => console.log(`  ✗ ${endpoint}`));
      }
    }
  }
  
  console.log("\nTest file generation complete!");
}

/**
 * Analyze endpoints-spec.json file to extract endpoint definitions and parameters
 */
function analyzeEndpointsSpec() {
  const endpointsSpecPath = path.resolve(__dirname, "endpoints-spec.json");
  const endpoints = {};

  try {
    console.log(`Reading endpoints specification from: ${endpointsSpecPath}`);
    const content = fs.readFileSync(endpointsSpecPath, "utf8");
    const spec = JSON.parse(content);

    if (!spec.endpoints || !Array.isArray(spec.endpoints)) {
      throw new Error(
        "Invalid endpoints-spec.json format: missing endpoints array"
      );
    }

    spec.endpoints.forEach((endpoint) => {
      const endpointKey = getEndpointKeyFromPath(
        endpoint.path,
        endpoint.method
      );

      // Parse path parameters - first try from specification, then extract from path
      let pathParams = endpoint.parameters.path || [];

      // If no path params in specification, extract them from the path string
      if (pathParams.length === 0) {
        const pathParamMatches = endpoint.path.match(/:([^/]+)/g);
        if (pathParamMatches) {
          pathParams = pathParamMatches.map((match) => ({
            name: match.substring(1), // Remove the ':' prefix
            type: "string",
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
          datatype: param.type || "string",
          nullable: false,
        };
        requiredParams.push(paramInfo);
      });

      // Process query parameters
      queryParams.forEach((param) => {
        const requiredQueryParams = endpoint.required.query || [];
        const paramInfo = {
          name: param.name,
          datatype: param.type || "string",
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
          name: "body",
          datatype: "jsonDocument",
          nullable: !endpoint.required.body,
        };

        if (endpoint.required.body) {
          requiredParams.push(bodyParam);
        } else {
          optionalParams.push(bodyParam);
        }
      }

      endpoints[endpointKey] = {
        functionName: endpointKey.replace(/-/g, " "),
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
async function createTestsForEndpoint(
  apiDef,
  endpointKey,
  testsDir,
  allProviders,
  options = {},
  searchTestConfigs = null
) {
  const filename = `${endpointKey}-tests.xlsx`;
  const filePath = path.join(testsDir, filename);

  console.log(`Creating test file for ${endpointKey}: ${filename}`);

  // Build columns array
  const baseColumns = [
    "provider_id",
    "test_name",
    "description",
    "enabled",
    "expected_status",
    "timeout_ms",
    "max_response_time",
    "delay_after_ms",
    "tags",
    "duplicate_count",
  ];

  // Add required parameters first
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
  const collectionResult = await collectTestDataFromAllProviders(
    allProviders,
    apiDef,
    endpointKey,
    columns,
    options
  );
  
  let allTestData = collectionResult.testData;
  let totalBeforeDedup = collectionResult.totalCollected;

  // Add search-related test data if available
  if (isDefined(searchTestConfigs)) {
    const searchRelatedTestData = getSearchRelatedTestConfigs(
      endpointKey,
      columns,
      searchTestConfigs.testRows,
      searchTestConfigs.columns
    );
    
    if (searchRelatedTestData.length > 0) {
      console.log(`Adding ${searchRelatedTestData.length} search-related test cases...`);
      allTestData = allTestData.concat(searchRelatedTestData);
      totalBeforeDedup += searchRelatedTestData.length;
    }
  }

  // Now handle deduplication for all data (provider + search-related)
  let finalTestData;
  let duplicatesRemoved = 0;
  
  if (options.skipDeduplication) {
    console.log(`Skipping deduplication for ${endpointKey} (--no-dedup specified)`);
    finalTestData = allTestData;
    
    // Initialize duplicate_count column to 1 for all rows if the column exists
    const duplicateCountIndex = columns.indexOf("duplicate_count");
    if (duplicateCountIndex !== -1) {
      finalTestData = allTestData.map(row => {
        const newRow = [...row];
        newRow[duplicateCountIndex] = 1;
        return newRow;
      });
    }
  } else {
    if (totalBeforeDedup > allTestData.length) {
      // This shouldn't happen, but just in case
      totalBeforeDedup = allTestData.length;
    }
    
    console.log(`Deduplicating ${allTestData.length} test cases for ${endpointKey}...`);
    finalTestData = deduplicateTestRows(allTestData, columns);
    duplicatesRemoved = totalBeforeDedup - finalTestData.length;
  }

  // Calculate final statistics
  const stats = {
    totalBeforeDedup: totalBeforeDedup,
    uniqueTests: finalTestData.length,
    duplicatesRemoved: duplicatesRemoved
  };
  
  allTestData = finalTestData;

  if (allTestData.length > 0) {
    console.log(`Adding the ${endpointKey} tests to its spreadsheet...`);

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([columns, ...allTestData]);

    // Set column widths for better readability
    const colWidths = columns.map((col) => ({
      width: col.startsWith("param:")
        ? 20
        : col === "description"
        ? 30
        : col === "test_name"
        ? 25
        : col === "duplicate_count"
        ? 15
        : 15,
    }));
    ws["!cols"] = colWidths;

    // Enable autoFilter for the worksheet
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: columns.length - 1, r: allTestData.length } }) };

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Tests");

    // Add documentation sheet
    const docWs = createDocumentationSheetForAPI(
      apiDef,
      endpointKey,
      columns,
      requiredParamColumns
    );
    XLSX.utils.book_append_sheet(wb, docWs, "Documentation");

    // Write the file
    XLSX.writeFile(wb, filePath);
    console.log(`✓ Created ${filePath} with ${allTestData.length} test cases`);
  } else {
    console.log(`✗ No test cases found for ${endpointKey}`);
  }

  // Return the columns and rows as they may be used to create related test configs, plus stats.
  return { columns, testRows: allTestData, stats };
}

/**
 * Create a hash of parameter values for efficient duplicate detection
 * @param {Object} parameters - Object containing parameter values
 * @returns {string} - SHA256 hash of the parameters
 */
function createParameterHash(parameters) {
  // Create a normalized string representation for consistent hashing
  const sortedEntries = Object.entries(parameters)
    .sort(([a], [b]) => a.localeCompare(b)) // Sort by key for consistency
    .map(([key, value]) => `${key}:${value || ''}`); // Handle null/undefined values
  
  const normalizedString = sortedEntries.join('|');
  return crypto.createHash('sha256').update(normalizedString, 'utf8').digest('hex');
}

/**
 * Extract parameter values from a test row, ignoring non-parameter columns
 * @param {Array} testRow - Array of test values
 * @param {Array<string>} columns - Array of column names
 * @returns {Object} - Object containing only parameter values
 */
function extractParameterValues(testRow, columns) {
  const paramValues = {};
  
  columns.forEach((columnName, index) => {
    if (columnName.startsWith("param:")) {
      const paramName = columnName.replace("param:", "");
      paramValues[paramName] = testRow[index] || "";
    }
  });
  
  return paramValues;
}

/**
 * De-duplicate test rows based on parameter values, keeping the first occurrence
 * and adding duplicate count to a new column
 * @param {Array<Array>} testRows - Array of test data rows
 * @param {Array<string>} columns - Array of column names
 * @returns {Array<Array>} - De-duplicated test rows with duplicate counts
 */
function deduplicateTestRows(testRows, columns) {
  if (testRows.length === 0) {
    return testRows;
  }

  const duplicateCountIndex = columns.indexOf("duplicate_count");
  const uniqueRows = [];
  const seenParameterHashes = new Map(); // Map from parameter hash to row index in uniqueRows

  for (const testRow of testRows) {
    const parameters = extractParameterValues(testRow, columns);
    const paramHash = createParameterHash(parameters);
    
    if (seenParameterHashes.has(paramHash)) {
      // This is a duplicate - increment the count in the existing row
      const existingRowIndex = seenParameterHashes.get(paramHash);
      if (duplicateCountIndex !== -1) {
        const currentCount = uniqueRows[existingRowIndex][duplicateCountIndex] || 1;
        uniqueRows[existingRowIndex][duplicateCountIndex] = currentCount + 1;
      }
    } else {
      // This is the first occurrence of this parameter combination
      const newRow = [...testRow];
      if (duplicateCountIndex !== -1) {
        newRow[duplicateCountIndex] = 1; // Initialize duplicate count to 1
      }
      uniqueRows.push(newRow);
      seenParameterHashes.set(paramHash, uniqueRows.length - 1);
    }
  }

  const duplicateCount = testRows.length - uniqueRows.length;
  if (duplicateCount > 0) {
    console.log(`    ✓ Removed ${duplicateCount} duplicate test cases (${testRows.length} → ${uniqueRows.length})`);
  }

  return uniqueRows;
}

/**
 * Collect test data from ALL available providers and combine them
 */
async function collectTestDataFromAllProviders(
  allProviders,
  apiDef,
  endpointKey,
  columns,
  options = {}
) {
  const allTestData = [];

  console.log(
    `Collecting test data from ${allProviders.length} providers for ${endpointKey}...`
  );

  // Collect from each provider
  for (const provider of allProviders) {
    try {
      console.log(`  - Trying provider: ${provider.constructor.name}`);

      const testData = await provider.extractTestData(
        apiDef,
        endpointKey,
        columns
      );

      if (testData && testData.length > 0) {
        console.log(
          `    ✓ Got ${testData.length} test cases from ${provider.constructor.name}`
        );

        // Add provider ID to each test row
        const providerId = provider.getProviderId();
        const providerIdIndex = columns.indexOf("provider_id");

        const enrichedTestData = testData.map((row) => {
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
      console.log(
        `    ⚠ Error from ${provider.constructor.name}: ${error.message}`
      );
    }
  }

  console.log(`Total test cases collected: ${allTestData.length}`);
  
  // Return raw data without deduplication - let the caller handle deduplication
  return { testData: allTestData, totalCollected: allTestData.length };
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
    [""],
    ["HTTP Method:", apiDef.method],
    ["Path:", apiDef.path],
    ["Description:", apiDef.description],
    [""],
    ["Column Descriptions:"],
    ["provider_id", "Identifier of the data provider that generated this test"],
    ["test_name", "Unique identifier for the test"],
    ["description", "Human-readable description of what the test does"],
    ["enabled", "Whether to run this test (true/false)"],
    ["expected_status", "Expected HTTP status code (200, 404, etc.)"],
    ["timeout_ms", "Request timeout in milliseconds"],
    ["max_response_time", "Maximum acceptable response time in ms"],
    ["delay_after_ms", "Delay after test completion in ms"],
    ["tags", "Comma-separated tags for filtering tests"],
    ["duplicate_count", "Number of duplicate test cases found with identical parameter values (including this one)"],
    [""],
  ];

  // Add parameter documentation
  if (apiDef.allParams.length > 0) {
    docData.push(["Parameter Descriptions:"]);

    apiDef.allParams.forEach((param) => {
      const paramCol = `param:${param.name}`;
      const isRequired = requiredParamColumns.includes(paramCol);
      const description = getParameterDescription(param.name, param.datatype);
      docData.push([
        paramCol,
        `${description} (${param.datatype})${
          isRequired ? " (REQUIRED)" : " (optional)"
        }`,
      ]);
    });
  }

  // Add endpoint-specific notes
  docData.push([""], ["Endpoint-Specific Notes:"]);
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
    unitname: "Unit name for multi-tenant deployments",
    q: "Search query (string or JSON object)",
    scope: "Search scope (work, person, place, concept, event, etc.)",
    page: "Page number for pagination (1-based)",
    pagelength: "Number of results per page",
    sort: "Sort order for results",
    uri: "URI of the resource",
    doc: "JSON document for create/update operations",
    profile: "Response profile (summary, full, etc.)",
    lang: "Language code (en, es, fr, etc.)",
    text: "Text to auto-complete or process",
    context: "Context for auto-completion (person, place, concept, etc.)",
    name: "Name parameter (varies by endpoint)",
  };

  return descriptions[name] || `${paramName} parameter`;
}

/**
 * Get list of available provider IDs
 */
function getAvailableProviders() {
  const allProviders = TestDataProviderFactory.createAllProviders();
  return allProviders.map(provider => provider.getProviderId()).sort();
}

/**
 * Get list of available endpoint keys
 */
function getAvailableEndpoints() {
  return Object.values(ENDPOINT_KEYS).sort();
}

/**
 * Display available providers and endpoints for filtering
 */
function displayAvailableOptions() {
  console.log("\n=== AVAILABLE PROVIDERS ===");
  const providers = getAvailableProviders();
  providers.forEach(provider => console.log(`  ${provider}`));
  
  console.log("\n=== AVAILABLE ENDPOINTS ===");
  const endpoints = getAvailableEndpoints();
  endpoints.forEach(endpoint => console.log(`  ${endpoint}`));
  
  console.log("\n=== FILTERING EXAMPLES ===");
  console.log("Include specific providers:");
  console.log("  --providers AdvancedSearchQueriesTestDataProvider,BenchmarkQueriesTestDataProvider");
  console.log("\nExclude specific providers:");
  console.log("  --providers ^BackendLogsTestDataProvider");
  console.log("\nInclude specific endpoints:");
  console.log("  --endpoints get-search,get-auto-complete");
  console.log("\nExclude specific endpoints:");
  console.log("  --endpoints ^get-facets,^get-translate");
  console.log("\nCombine filters:");
  console.log("  --providers AdvancedSearchQueriesTestDataProvider --endpoints ^get-facets");
}

/**
 * Validate provider and endpoint filters
 */
function validateFilters(providerFilter, endpointFilter) {
  const errors = [];

  if (providerFilter && providerFilter.length > 0) {
    const availableProviders = getAvailableProviders();
    const invalidProviders = providerFilter.filter(p => {
      const providerName = p.startsWith('^') ? p.substring(1) : p;
      return !availableProviders.includes(providerName);
    });
    
    if (invalidProviders.length > 0) {
      errors.push(
        `Unknown provider(s): ${invalidProviders.join(', ')}\n` +
        `Available providers: ${availableProviders.join(', ')}`
      );
    }
  }

  if (endpointFilter && endpointFilter.length > 0) {
    const availableEndpoints = getAvailableEndpoints();
    const invalidEndpoints = endpointFilter.filter(e => {
      const endpointName = e.startsWith('^') ? e.substring(1) : e;
      return !availableEndpoints.includes(endpointName);
    });
    
    if (invalidEndpoints.length > 0) {
      errors.push(
        `Unknown endpoint(s): ${invalidEndpoints.join(', ')}\n` +
        `Available endpoints: ${availableEndpoints.join(', ')}`
      );
    }
  }

  return errors;
}

/**
 * Get endpoint-specific notes and tips
 */
function getEndpointNotes(endpointKey, apiDef) {
  const notes = [
    `• Method: ${apiDef.method}`,
    `• Path: ${apiDef.path}`,
    `• Description: ${apiDef.description}`,
  ];

  if (apiDef.requiredParams.length > 0) {
    notes.push(
      `• Required parameters: ${apiDef.requiredParams
        .map((p) => p.name)
        .join(", ")}`
    );
  }

  if (apiDef.optionalParams.length > 0) {
    notes.push(
      `• Optional parameters: ${apiDef.optionalParams
        .map((p) => p.name)
        .join(", ")}`
    );
  }

  // Add specific notes based on endpoint type
  if (apiDef.path.includes("/data/") || endpointKey.includes("document")) {
    notes.push(
      "• Document operations may require different parameters based on the operation type"
    );
  }

  if (apiDef.path.includes("/search") || endpointKey.includes("search")) {
    notes.push("• Search queries can be strings or complex JSON objects");
  }

  if (apiDef.method === "POST" || apiDef.method === "PUT") {
    notes.push("• This endpoint may require a JSON body payload");
  }

  return notes;
}

// Main execution with optional configuration
const testsDir = path.join(__dirname, "configs");

// Parse command line arguments for configuration
const args = process.argv.slice(2);
const options = {};
let showAvailableOptions = false;

// Check for data source arguments
// Usage examples:
// node create-tests.js --test-count=5
// node create-tests.js --no-dedup
// node create-tests.js --providers AdvancedSearchQueriesTestDataProvider,BenchmarkQueriesTestDataProvider
// node create-tests.js --endpoints get-search,get-auto-complete
// node create-tests.js --endpoints ^get-facets,^get-translate
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === "--help" || arg === "-h") {
    console.log("Usage: node create-tests.js [options]");
    console.log("");
    console.log("Options:");
    console.log("  --test-count=<number>         Maximum number of test cases to generate per provider");
    console.log("  --no-dedup                    Skip deduplication of test cases for faster processing");
    console.log("  --providers, -p <providers>   Comma-separated list of test data providers to use");
    console.log("                                Use ^ prefix to exclude: ^BackendLogsTestDataProvider");
    console.log("  --endpoints, -e <endpoints>   Comma-separated list of endpoint types to generate");
    console.log("                                Use ^ prefix to exclude: ^get-facets,^get-translate");
    console.log("  --list-options                Show available providers and endpoints for filtering");
    console.log("  --help, -h                    Show this help message");
    console.log("");
    console.log("Examples:");
    console.log("  node create-tests.js");
    console.log("  node create-tests.js --no-dedup");
    console.log("  node create-tests.js --test-count=100");
    console.log("  node create-tests.js --providers AdvancedSearchQueriesTestDataProvider");
    console.log("  node create-tests.js --providers ^BackendLogsTestDataProvider");
    console.log("  node create-tests.js --endpoints get-search,get-auto-complete");
    console.log("  node create-tests.js --endpoints ^get-facets,^get-translate");
    console.log("  node create-tests.js --providers AdvancedSearchQueriesTestDataProvider --endpoints get-search");
    console.log("  node create-tests.js --list-options");
    process.exit(0);
  } else if (arg === "--list-options") {
    showAvailableOptions = true;
  } else if (arg === "--providers" || arg === "-p") {
    // Next argument should be comma-separated list of providers
    i++;
    if (i < args.length) {
      options.providerFilter = args[i].split(",").map((p) => p.trim());
    } else {
      console.error("Error: --providers requires a comma-separated list of provider names");
      console.log("Example: --providers AdvancedSearchQueriesTestDataProvider,BenchmarkQueriesTestDataProvider");
      process.exit(1);
    }
  } else if (arg === "--endpoints" || arg === "-e") {
    // Next argument should be comma-separated list of endpoints
    i++;
    if (i < args.length) {
      options.endpointFilter = args[i].split(",").map((e) => e.trim());
    } else {
      console.error("Error: --endpoints requires a comma-separated list of endpoint types");
      console.log("Example: --endpoints get-search,get-auto-complete");
      process.exit(1);
    }
  } else if (arg.startsWith("--test-count=")) {
    const value = arg.split("=")[1];
    if (!value) {
      console.error("Error: --test-count requires a value");
      console.log("Example: --test-count=100");
      process.exit(1);
    }
    const count = parseInt(value);
    if (isNaN(count) || count <= 0) {
      console.error("Error: --test-count must be a positive number");
      console.log("Example: --test-count=100");
      process.exit(1);
    }
    options.testCaseCount = count;
  } else if (arg === "--no-dedup") {
    options.skipDeduplication = true;
  } else if (arg === "--test-count") {
    console.error("Error: --test-count requires a value");
    console.log("Example: --test-count=100");
    process.exit(1);
  } else if (arg.startsWith("-")) {
    // Unknown option starting with "-"
    console.error(`Error: Unknown option '${arg}'`);
    console.log("Use --help for a list of available options");
    process.exit(1);
  } else {
    // Unknown positional argument
    console.error(`Error: Unexpected argument '${arg}'`);
    console.log("Use --help for usage information");
    process.exit(1);
  }
}

// Show available options if requested
if (showAvailableOptions) {
  displayAvailableOptions();
  process.exit(0);
}

// Validate filters before proceeding
if (options.providerFilter || options.endpointFilter) {
  const validationErrors = validateFilters(options.providerFilter, options.endpointFilter);
  if (validationErrors.length > 0) {
    console.error("Filter validation errors:");
    validationErrors.forEach(error => console.error(`  ${error}`));
    console.log("\nUse --list-options to see available providers and endpoints");
    process.exit(1);
  }
}

  if (options.dataSource) {
    console.log(`Using data source: ${options.dataSource}`);
  }
  
  if (options.skipDeduplication) {
    console.log("Deduplication disabled (--no-dedup specified)");
  }

  if (options.providerFilter && options.providerFilter.length > 0) {
    console.log(`Provider filter applied: ${options.providerFilter.join(", ")}`);
  }

  if (options.endpointFilter && options.endpointFilter.length > 0) {
    console.log(`Endpoint filter applied: ${options.endpointFilter.join(", ")}`);
  }

  if (!options.providerFilter && !options.endpointFilter) {
    console.log("No filters applied - processing all providers and endpoints");
  }

await createEndpointTests(testsDir, options);
