import fs from "fs";
import path from "path";
import { TestStatistics } from "./statistics.js";
import { filterProviders, filterEndpoints } from "./filter-utils.js";
import { TestDataProviderFactory } from "../test-data-providers/index.js";
import { ENDPOINT_KEYS } from "../constants.js";

/**
 * Create instances of all available TestDataProvider implementations
 * @param {Object} options - Options to pass to provider constructors
 * @returns {Array<TestDataProvider>} Array of filtered provider instances
 */
export function createAllProviders(options = {}) {
  console.log("Creating TestDataProvider instances...");

  // Create instances of all registered providers
  const allProviders = TestDataProviderFactory.createAllProviders(options);

  // Apply provider filtering if specified
  const filteredProviders = filterProviders(allProviders, options);

  console.log(`Created ${filteredProviders.length} provider instance(s):`);
  filteredProviders.forEach((provider) => {
    console.log(`  - ${provider.getProviderId()}`);
  });

  if (
    options.providerFilter &&
    options.providerFilter.length > 0 &&
    filteredProviders.length === 0
  ) {
    console.warn(
      "Warning: Provider filter resulted in no providers being selected"
    );
  }

  return filteredProviders;
}

/**
 * Clean up existing Excel files in the tests directory
 * @param {string} testsDir - Directory containing test files
 */
export function cleanupExistingFiles(testsDir) {
  console.log(`Deleting existing Excel files in ${testsDir}...`);
  try {
    const files = fs.readdirSync(testsDir);
    const excelFiles = files.filter((file) => file.endsWith(".xlsx"));

    if (excelFiles.length > 0) {
      console.log(
        `Found ${excelFiles.length} existing Excel file(s) to remove:`
      );
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
}

/**
 * Prepare endpoints for processing by applying filters
 * @param {Object} apiDefinitions - All API definitions
 * @param {Object} options - Configuration options
 * @returns {Array<string>} - Filtered array of endpoint keys
 */
export function prepareEndpoints(apiDefinitions, options) {
  console.log(
    `Found ${Object.keys(apiDefinitions).length} unique API endpoints\n`
  );

  // Apply endpoint filtering
  let endpointKeys = Object.keys(apiDefinitions);
  if (options.endpointFilter && options.endpointFilter.length > 0) {
    const originalCount = endpointKeys.length;
    endpointKeys = filterEndpoints(endpointKeys, options.endpointFilter);
    console.log(
      `Filtered endpoints: ${endpointKeys.length}/${originalCount} endpoints selected`
    );
    if (endpointKeys.length === 0) {
      console.warn(
        "Warning: Endpoint filter resulted in no endpoints being selected"
      );
      return [];
    }
  }

  return endpointKeys;
}

/**
 * Process priority endpoint (GET_SEARCH) first
 * @param {Array<string>} endpointKeys - Array of endpoint keys to process
 * @param {Object} apiDefinitions - All API definitions
 * @param {string} testsDir - Directory for test files
 * @param {Array} allProviders - Array of provider instances
 * @param {Object} options - Configuration options
 * @param {TestStatistics} statistics - Statistics tracking instance
 * @param {Function} createTestsForEndpoint - Function to create tests for an endpoint
 * @returns {Object|null} - Search test configurations or null
 */
export async function processPriorityEndpoint(
  endpointKeys,
  apiDefinitions,
  testsDir,
  allProviders,
  options,
  statistics,
  createTestsForEndpoint
) {
  const getSearchKey = ENDPOINT_KEYS.GET_SEARCH;
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
      statistics.recordEndpointStats(getSearchKey, result.stats, duration);
    }

    if (options.skipDeduplication) {
      statistics.setDeduplicationDisabled();
    }
  }

  return searchTestConfigs;
}

/**
 * Process remaining endpoints (non-priority)
 * @param {Array<string>} endpointKeys - Array of endpoint keys to process
 * @param {Object} apiDefinitions - All API definitions
 * @param {string} testsDir - Directory for test files
 * @param {Array} allProviders - Array of provider instances
 * @param {Object} options - Configuration options
 * @param {TestStatistics} statistics - Statistics tracking instance
 * @param {Object} searchTestConfigs - Search test configurations from priority endpoint
 * @param {Function} createTestsForEndpoint - Function to create tests for an endpoint
 */
export async function processRemainingEndpoints(
  endpointKeys,
  apiDefinitions,
  testsDir,
  allProviders,
  options,
  statistics,
  searchTestConfigs,
  createTestsForEndpoint
) {
  const getSearchKey = ENDPOINT_KEYS.GET_SEARCH;

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
        statistics.recordEndpointStats(endpointKey, result.stats, duration);
      }

      if (options.skipDeduplication) {
        statistics.setDeduplicationDisabled();
      }
    }
  }
}
