/**
 * Search Test Data Provider Sub-Interface
 *
 * Test data providers that serve up search test cases should extend this class to get
 * search-estimate, search-will-match, and facet requests for their search requests.
 */
import { FACETS_CONFIGS } from "./test-data-providers/facetsConfig.js";
import { ENDPOINT_KEYS } from "./constants.js";

/**
 * Provide related test configurations for each of the given search test configurations.
 * @param {Array<Object>} searchTestRows - Array of search test configuration objects
 * @returns {Object} - Object where keys are from ENDPOINT_KEYS and values are arrays of test configs
 */
export const getSearchRelatedTestConfigs = (
  endpointKey,
  endpointColumns,
  searchTestRows,
  searchColumns
) => {
  if (Array.isArray(searchTestRows) && Array.isArray(searchColumns)) {
    if (ENDPOINT_KEYS.GET_FACETS === endpointKey) {
      return getFacetTestConfigs(
        endpointKey,
        endpointColumns,
        searchTestRows,
        searchColumns
      );
    }
    if (ENDPOINT_KEYS.GET_SEARCH_ESTIMATE === endpointKey) {
      return getSearchEstimateConfigs(
        endpointKey,
        endpointColumns,
        searchTestRows,
        searchColumns
      );
    }
    if (ENDPOINT_KEYS.GET_SEARCH_WILL_MATCH === endpointKey) {
      return getSearchWillMatchConfigs(
        endpointKey,
        endpointColumns,
        searchTestRows,
        searchColumns
      );
    }
  }
  return [];
};

const getFacetTestConfigs = (
  endpointKey,
  endpointColumns,
  searchTestRows,
  searchColumns
) => {
  const facetTestConfigs = [];
  const scopeCounts = {};

  // Find the column indices for scope and query parameters
  const searchTestProviderIdColumnIndex = searchColumns.indexOf("provider_id");
  const searchTestNameColumnIndex = searchColumns.indexOf("test_name");
  const searchTestDescriptionColumnIndex = searchColumns.indexOf("description");
  const scopeColumnIndex = searchColumns.indexOf("param:scope");
  const queryColumnIndex = searchColumns.indexOf("param:q");

  if (scopeColumnIndex === -1) {
    console.warn("param:scope column not found in searchColumns");
    return [];
  }

  // Process each search test row
  searchTestRows.forEach((searchTestRow, rowIndex) => {
    const scope = searchTestRow[scopeColumnIndex];
    const query =
      queryColumnIndex !== -1 ? searchTestRow[queryColumnIndex] : "";

    if (!scope) {
      console.warn(`No scope found for search test row ${rowIndex}`);
      return;
    }

    // Get available facets for this scope
    const availableFacets = FACETS_CONFIGS[scope];
    if (!availableFacets || availableFacets.length === 0) {
      console.warn(`No facets available for scope: ${scope}`);
      return;
    }

    // Initialize scope count if not exists
    if (!scopeCounts[scope]) {
      scopeCounts[scope] = 0;
    }

    // Create a facet test configuration for each available facet
    availableFacets.forEach((facetName) => {
      // Find column indices for facet test configuration
      const nameColumnIndex = endpointColumns.indexOf("param:name");
      const facetScopeColumnIndex = endpointColumns.indexOf("param:scope");
      const facetQueryColumnIndex = endpointColumns.indexOf("param:q");
      const providerIdColumnIndex = endpointColumns.indexOf("provider_id");
      const testNameColumnIndex = endpointColumns.indexOf("test_name");
      const descriptionColumnIndex = endpointColumns.indexOf("description");
      const enabledColumnIndex = endpointColumns.indexOf("enabled");
      const expectedStatusColumnIndex =
        endpointColumns.indexOf("expected_status");
      const timeoutMsColumnIndex = endpointColumns.indexOf("timeout_ms");
      const maxResponseTimeColumnIndex =
        endpointColumns.indexOf("max_response_time");
      const delayAfterMsColumnIndex = endpointColumns.indexOf("delay_after_ms");
      const tagsColumnIndex = endpointColumns.indexOf("tags");

      // Create new facet test configuration row
      const facetTestConfig = new Array(endpointColumns.length).fill("");

      // Set the facet-specific values
      if (nameColumnIndex !== -1) {
        facetTestConfig[nameColumnIndex] = facetName;
      }
      if (facetScopeColumnIndex !== -1) {
        facetTestConfig[facetScopeColumnIndex] = scope;
      }
      if (facetQueryColumnIndex !== -1) {
        facetTestConfig[facetQueryColumnIndex] = query;
      }
      if (providerIdColumnIndex !== -1) {
        facetTestConfig[providerIdColumnIndex] =
          searchTestRow[searchTestProviderIdColumnIndex];
      }
      if (testNameColumnIndex !== -1) {
        facetTestConfig[
          testNameColumnIndex
        ] = `${facetName} facet for search "${searchTestRow[searchTestNameColumnIndex]}"`;
      }
      if (descriptionColumnIndex !== -1) {
        facetTestConfig[
          descriptionColumnIndex
        ] = `${facetName} facet for search "${searchTestRow[searchTestDescriptionColumnIndex]}"`;
      }
      if (enabledColumnIndex !== -1) {
        facetTestConfig[enabledColumnIndex] = "true";
      }
      if (expectedStatusColumnIndex !== -1) {
        facetTestConfig[expectedStatusColumnIndex] = "200";
      }
      if (timeoutMsColumnIndex !== -1) {
        facetTestConfig[timeoutMsColumnIndex] = "30000";
      }
      if (maxResponseTimeColumnIndex !== -1) {
        facetTestConfig[maxResponseTimeColumnIndex] = "5000";
      }
      if (delayAfterMsColumnIndex !== -1) {
        facetTestConfig[delayAfterMsColumnIndex] = "0";
      }
      if (tagsColumnIndex !== -1) {
        facetTestConfig[tagsColumnIndex] = "facet,search-related";
      }

      facetTestConfigs.push(facetTestConfig);
      scopeCounts[scope]++;
    });
  });

  // Report counts of facet test configs by search scope
  const totalCount = Object.values(scopeCounts).reduce(
    (sum, count) => sum + count,
    0
  );
  console.log(
    `${totalCount} facet tests generated from ${searchTestRows.length} search tests, by search scope:`
  );
  Object.entries(scopeCounts)
    .sort()
    .forEach(([scope, count]) => {
      console.log(`  ${scope}: ${count}`);
    });

  return facetTestConfigs;
};

/**
 * Convert query strings to JSON format with "text" property if needed
 * @param {string} query - The original query string
 * @returns {string} - The processed query (either original JSON or converted)
 */
const convertQueryToJson = (query) => {
  if (query && typeof query === "string") {
    try {
      const parsed = JSON.parse(query);
      // If it parses to a simple string, convert it to {"text": string}
      if (typeof parsed === "string") {
        return JSON.stringify({ "text": parsed });
      }
      // If it's already a complex object, return original
      return query;
    } catch (e) {
      // Query is not valid JSON at all, wrap the raw string in a "text" property
      return JSON.stringify({ "text": query });
    }
  }
  return query;
};

/**
 * Create search-related test configurations (estimate or will-match)
 * @param {string} endpointKey - The endpoint key (get-search-estimate or get-search-will-match)
 * @param {Array} endpointColumns - Array of column names for the endpoint
 * @param {Array} searchTestRows - Array of search test rows
 * @param {Array} searchColumns - Array of search column names
 * @param {Object} config - Configuration object with endpoint-specific settings
 * @returns {Array} - Array of test configurations
 */
const createSearchRelatedConfigs = (endpointKey, endpointColumns, searchTestRows, searchColumns, config) => {
  const testConfigs = [];
  const scopeCounts = {};

  // Find the column indices for scope and query parameters in search columns
  const searchTestProviderIdColumnIndex = searchColumns.indexOf("provider_id");
  const searchTestNameColumnIndex = searchColumns.indexOf("test_name");
  const searchTestDescriptionColumnIndex = searchColumns.indexOf("description");
  const scopeColumnIndex = searchColumns.indexOf("param:scope");
  const queryColumnIndex = searchColumns.indexOf("param:q");

  if (scopeColumnIndex === -1) {
    console.warn("param:scope column not found in searchColumns");
    return [];
  }

  // Process each search test row to create a corresponding test
  searchTestRows.forEach((searchTestRow, rowIndex) => {
    const scope = searchTestRow[scopeColumnIndex];
    let query = queryColumnIndex !== -1 ? searchTestRow[queryColumnIndex] : "";

    // Convert queries to JSON format if needed
    query = convertQueryToJson(query);

    if (!scope) {
      console.warn(`No scope found for search test row ${rowIndex}`);
      return;
    }

    // Initialize scope count if not exists
    if (!scopeCounts[scope]) {
      scopeCounts[scope] = 0;
    }

    // Find column indices for test configuration
    const testScopeColumnIndex = endpointColumns.indexOf("param:scope");
    const testQueryColumnIndex = endpointColumns.indexOf("param:q");
    const providerIdColumnIndex = endpointColumns.indexOf("provider_id");
    const testNameColumnIndex = endpointColumns.indexOf("test_name");
    const descriptionColumnIndex = endpointColumns.indexOf("description");
    const enabledColumnIndex = endpointColumns.indexOf("enabled");
    const expectedStatusColumnIndex = endpointColumns.indexOf("expected_status");
    const timeoutMsColumnIndex = endpointColumns.indexOf("timeout_ms");
    const maxResponseTimeColumnIndex = endpointColumns.indexOf("max_response_time");
    const delayAfterMsColumnIndex = endpointColumns.indexOf("delay_after_ms");
    const tagsColumnIndex = endpointColumns.indexOf("tags");

    // Create new test configuration row
    const testConfig = new Array(endpointColumns.length).fill("");

    // Set the test specific values
    if (testScopeColumnIndex !== -1) {
      testConfig[testScopeColumnIndex] = scope;
    }
    if (testQueryColumnIndex !== -1) {
      testConfig[testQueryColumnIndex] = query;
    }
    if (providerIdColumnIndex !== -1) {
      testConfig[providerIdColumnIndex] = searchTestRow[searchTestProviderIdColumnIndex];
    }
    if (testNameColumnIndex !== -1) {
      testConfig[testNameColumnIndex] = `${config.namePrefix} for search "${searchTestRow[searchTestNameColumnIndex]}"`;
    }
    if (descriptionColumnIndex !== -1) {
      testConfig[descriptionColumnIndex] = `${config.descriptionPrefix} for search "${searchTestRow[searchTestDescriptionColumnIndex]}"`;
    }
    if (enabledColumnIndex !== -1) {
      testConfig[enabledColumnIndex] = "true";
    }
    if (expectedStatusColumnIndex !== -1) {
      testConfig[expectedStatusColumnIndex] = "200";
    }
    if (timeoutMsColumnIndex !== -1) {
      testConfig[timeoutMsColumnIndex] = config.timeoutMs;
    }
    if (maxResponseTimeColumnIndex !== -1) {
      testConfig[maxResponseTimeColumnIndex] = config.maxResponseTime;
    }
    if (delayAfterMsColumnIndex !== -1) {
      testConfig[delayAfterMsColumnIndex] = "0";
    }
    if (tagsColumnIndex !== -1) {
      testConfig[tagsColumnIndex] = `${endpointKey},search-related`;
    }

    testConfigs.push(testConfig);
    scopeCounts[scope]++;
  });

  // Report counts
  console.log(`Generated ${testConfigs.length} ${endpointKey} requests from ${searchTestRows.length} search tests.`);

  return testConfigs;
};

const getSearchEstimateConfigs = (
  endpointKey,
  endpointColumns,
  searchTestRows,
  searchColumns
) => {
  return createSearchRelatedConfigs(endpointKey, endpointColumns, searchTestRows, searchColumns, {
    namePrefix: "Search estimate",
    descriptionPrefix: "Get search estimate",
    timeoutMs: "15000",
    maxResponseTime: "3000"
  });
};

const getSearchWillMatchConfigs = (
  endpointKey,
  endpointColumns,
  searchTestRows,
  searchColumns
) => {
  return createSearchRelatedConfigs(endpointKey, endpointColumns, searchTestRows, searchColumns, {
    namePrefix: "Search will match",
    descriptionPrefix: "Check if search will match",
    timeoutMs: "10000",
    maxResponseTime: "2000"
  });
};
