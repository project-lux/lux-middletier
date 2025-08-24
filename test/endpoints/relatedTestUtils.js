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

const getSearchEstimateConfigs = (
  endpointKey,
  endpointColumns,
  searchTestRows,
  searchColumns
) => {
  const searchEstimateConfigs = [];
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

  // Process each search test row to create a corresponding search estimate test
  searchTestRows.forEach((searchTestRow, rowIndex) => {
    const scope = searchTestRow[scopeColumnIndex];
    let query = queryColumnIndex !== -1 ? searchTestRow[queryColumnIndex] : "";

    // Convert non-JSON queries to JSON format with "text" property
    if (query && typeof query === "string") {
      // Check if query is already a complex JSON object
      try {
        const parsed = JSON.parse(query);
        // If it parses to a simple string, convert it to {"text": string}
        if (typeof parsed === "string") {
          query = JSON.stringify({ "text": parsed });
          console.log(`Converted string to JSON: ${query}`);
        }
        // If it's already a complex object, leave as-is
      } catch (e) {
        // Query is not valid JSON at all, wrap the raw string in a "text" property
        query = JSON.stringify({ "text": query });
      }
    }

    if (!scope) {
      console.warn(`No scope found for search test row ${rowIndex}`);
      return;
    }

    // Initialize scope count if not exists
    if (!scopeCounts[scope]) {
      scopeCounts[scope] = 0;
    }

    // Find column indices for search estimate test configuration
    const estimateScopeColumnIndex = endpointColumns.indexOf("param:scope");
    const estimateQueryColumnIndex = endpointColumns.indexOf("param:q");
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

    // Create new search estimate test configuration row
    const searchEstimateConfig = new Array(endpointColumns.length).fill("");

    // Set the search estimate specific values
    if (estimateScopeColumnIndex !== -1) {
      searchEstimateConfig[estimateScopeColumnIndex] = scope;
    }
    if (estimateQueryColumnIndex !== -1) {
      searchEstimateConfig[estimateQueryColumnIndex] = query;
    }
    if (providerIdColumnIndex !== -1) {
      searchEstimateConfig[providerIdColumnIndex] =
        searchTestRow[searchTestProviderIdColumnIndex];
    }
    if (testNameColumnIndex !== -1) {
      searchEstimateConfig[
        testNameColumnIndex
      ] = `Search estimate for search "${searchTestRow[searchTestNameColumnIndex]}"`;
    }
    if (descriptionColumnIndex !== -1) {
      searchEstimateConfig[
        descriptionColumnIndex
      ] = `Get search estimate for search "${searchTestRow[searchTestDescriptionColumnIndex]}"`;
    }
    if (enabledColumnIndex !== -1) {
      searchEstimateConfig[enabledColumnIndex] = "true";
    }
    if (expectedStatusColumnIndex !== -1) {
      searchEstimateConfig[expectedStatusColumnIndex] = "200";
    }
    if (timeoutMsColumnIndex !== -1) {
      searchEstimateConfig[timeoutMsColumnIndex] = "15000";
    }
    if (maxResponseTimeColumnIndex !== -1) {
      searchEstimateConfig[maxResponseTimeColumnIndex] = "3000";
    }
    if (delayAfterMsColumnIndex !== -1) {
      searchEstimateConfig[delayAfterMsColumnIndex] = "0";
    }
    if (tagsColumnIndex !== -1) {
      searchEstimateConfig[tagsColumnIndex] = "search-estimate,search-related";
    }

    searchEstimateConfigs.push(searchEstimateConfig);
    scopeCounts[scope]++;
  });

  // Report counts of search estimate test configs by search scope
  console.log(
    `Generated ${searchEstimateConfigs.length} search estimate requests from ${searchTestRows.length} search tests.`
  );

  const totalCount = Object.values(scopeCounts).reduce(
    (sum, count) => sum + count,
    0
  );
  console.log(`Total search estimate test configurations: ${totalCount}`);

  return searchEstimateConfigs;
};

const getSearchWillMatchConfigs = (
  endpointKey,
  endpointColumns,
  searchTestRows,
  searchColumns
) => {
  // TODO
  return [];
};
