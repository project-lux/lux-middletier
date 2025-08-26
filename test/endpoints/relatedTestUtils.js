/**
 * Search Test Data Provider Sub-Interface
 *
 * Test data providers that serve up search test cases should extend this class to get
 * search-estimate, search-will-match, and facet requests for their search requests.
 */
import { FACETS_CONFIGS } from "./test-data-providers/facetsConfig.js";
import { ENDPOINT_KEYS } from "./constants.js";

// Common column names used across test configurations
const COLUMNS = {
  PROVIDER_ID: "provider_id",
  TEST_NAME: "test_name",
  DESCRIPTION: "description",
  ENABLED: "enabled",
  EXPECTED_STATUS: "expected_status",
  TIMEOUT_MS: "timeout_ms",
  MAX_RESPONSE_TIME: "max_response_time",
  DELAY_AFTER_MS: "delay_after_ms",
  TAGS: "tags",
  PARAM_SCOPE: "param:scope",
  PARAM_Q: "param:q",
  PARAM_NAME: "param:name",
};

/**
 * Find column indices from an array of column names
 * @param {Array} columns - Array of column names
 * @param {Array} columnNames - Array of column names to find indices for
 * @returns {Object} - Object mapping column names to their indices
 */
const findColumnIndices = (columns, columnNames) => {
  return columnNames.reduce((indices, columnName) => {
    indices[columnName] = columns.indexOf(columnName);
    return indices;
  }, {});
};

/**
 * Create and populate a test configuration row
 * @param {Array} columns - Array of all column names
 * @param {Object} columnIndices - Object mapping column names to indices
 * @param {Object} values - Object mapping column names to their values
 * @returns {Array} - Populated test configuration row
 */
const createTestConfig = (columns, columnIndices, values) => {
  const testConfig = new Array(columns.length).fill("");

  Object.entries(values).forEach(([columnName, value]) => {
    const index = columnIndices[columnName];
    if (index !== -1 && value !== undefined) {
      testConfig[index] = value;
    }
  });

  return testConfig;
};

/**
 * Convert query strings to JSON format with "text" property if needed, optionally adding scope as _scope property
 * @param {string} query - The original query string
 * @param {string} [scope] - Optional scope to add as _scope property
 * @returns {string} - The processed query (either original JSON or converted)
 */
const convertQueryToJson = (query, scope) => {
  let jsonQuery;

  if (query && typeof query === "string") {
    try {
      const parsed = JSON.parse(query);
      // If it parses to a simple string, convert it to {"text": string}
      if (typeof parsed === "string") {
        jsonQuery = { text: parsed };
      } else {
        // If it's already a complex object, use it as is
        jsonQuery = parsed;
      }
    } catch (e) {
      // Query is not valid JSON at all, wrap the raw string in a "text" property
      jsonQuery = { text: query };
    }
  } else {
    // Handle empty or non-string queries
    jsonQuery = { text: query || "" };
  }

  // Add scope if provided
  if (scope) {
    jsonQuery._scope = scope;
  }

  return JSON.stringify(jsonQuery);
};

/**
 * Process search test rows with common validation and setup
 * @param {Array} searchTestRows - Array of search test rows
 * @param {Array} searchColumns - Array of search column names
 * @param {Function} processor - Function to process each valid search test row
 * @returns {Array} - Array of processed results
 */
const processSearchTestRows = (searchTestRows, searchColumns, processor) => {
  const results = [];
  const scopeCounts = {};

  // Find column indices for search test data
  const searchColumnIndices = findColumnIndices(searchColumns, [
    COLUMNS.PROVIDER_ID,
    COLUMNS.TEST_NAME,
    COLUMNS.DESCRIPTION,
    COLUMNS.PARAM_SCOPE,
    COLUMNS.PARAM_Q,
  ]);

  if (searchColumnIndices[COLUMNS.PARAM_SCOPE] === -1) {
    console.warn("param:scope column not found in searchColumns");
    return [];
  }

  // Process each search test row
  searchTestRows.forEach((searchTestRow, rowIndex) => {
    const scope = searchTestRow[searchColumnIndices[COLUMNS.PARAM_SCOPE]];
    const query =
      searchColumnIndices[COLUMNS.PARAM_Q] !== -1
        ? searchTestRow[searchColumnIndices[COLUMNS.PARAM_Q]]
        : "";

    if (!scope) {
      console.warn(`No scope found for search test row ${rowIndex}`);
      return;
    }

    // Initialize scope count
    if (!scopeCounts[scope]) {
      scopeCounts[scope] = 0;
    }

    // Process this row
    const processed = processor({
      searchTestRow,
      rowIndex,
      scope,
      query,
      searchColumnIndices,
      scopeCounts,
    });

    if (Array.isArray(processed)) {
      results.push(...processed);
      scopeCounts[scope] += processed.length;
    } else if (processed) {
      results.push(processed);
      scopeCounts[scope]++;
    }
  });

  return { results, scopeCounts };
};

/**
 * Generate test configurations based on a configuration template
 * @param {string} endpointKey - The endpoint key
 * @param {Array} endpointColumns - Array of endpoint column names
 * @param {Array} searchTestRows - Array of search test rows
 * @param {Array} searchColumns - Array of search column names
 * @param {Object} config - Configuration object
 * @returns {Array} - Array of test configurations
 */
const generateTestConfigs = (
  endpointKey,
  endpointColumns,
  searchTestRows,
  searchColumns,
  config
) => {
  const endpointColumnIndices = findColumnIndices(endpointColumns, [
    COLUMNS.PROVIDER_ID,
    COLUMNS.TEST_NAME,
    COLUMNS.DESCRIPTION,
    COLUMNS.ENABLED,
    COLUMNS.EXPECTED_STATUS,
    COLUMNS.TIMEOUT_MS,
    COLUMNS.MAX_RESPONSE_TIME,
    COLUMNS.DELAY_AFTER_MS,
    COLUMNS.TAGS,
    COLUMNS.PARAM_SCOPE,
    COLUMNS.PARAM_Q,
    ...(config.additionalColumns || []),
  ]);

  const processor = ({ searchTestRow, scope, query, searchColumnIndices }) => {
    // Apply query transformation if configured
    const processedQuery = config.transformQuery
      ? config.transformQuery(query)
      : query;

    // Generate test configs for this search test row
    return config.generateConfigs({
      searchTestRow,
      scope,
      query: processedQuery,
      searchColumnIndices,
      endpointColumns,
      endpointColumnIndices,
      endpointKey,
      config,
    });
  };

  const { results, scopeCounts } = processSearchTestRows(
    searchTestRows,
    searchColumns,
    processor
  );

  // Report counts
  config.reportResults?.(results, searchTestRows, scopeCounts, endpointKey);

  return results;
};

/**
 * Provide related test configurations for each of the given search test configurations.
 * @returns {Object} - Object where keys are from ENDPOINT_KEYS and values are arrays of test configs
 */
export const getDerivedTestConfigs = (
  endpointKey,
  endpointColumns,
  searchTestRows,
  searchColumns
) => {
  if (!Array.isArray(searchTestRows) || !Array.isArray(searchColumns)) {
    return [];
  }

  const configMap = {
    [ENDPOINT_KEYS.GET_FACETS]: getDerivedFacetTestConfigs,
    [ENDPOINT_KEYS.GET_SEARCH_ESTIMATE]: getDerivedSearchEstimateConfigs,
    [ENDPOINT_KEYS.GET_SEARCH_WILL_MATCH]: getDerivedSearchWillMatchConfigs
  };

  const configFunction = configMap[endpointKey];
  return configFunction
    ? configFunction(
        endpointKey,
        endpointColumns,
        searchTestRows,
        searchColumns
      )
    : [];
};

const getDerivedFacetTestConfigs = (
  endpointKey,
  endpointColumns,
  searchTestRows,
  searchColumns
) => {
  console.log('In getDerivedFacetTestConfigs')
  return generateTestConfigs(
    endpointKey,
    endpointColumns,
    searchTestRows,
    searchColumns,
    {
      additionalColumns: [COLUMNS.PARAM_NAME],

      generateConfigs: ({
        searchTestRow,
        scope,
        query,
        searchColumnIndices,
        endpointColumns,
        endpointColumnIndices,
        endpointKey,
      }) => {
        if ("multi" === scope) {
          return [];
        }

        // Get available facets for this scope
        const availableFacets = FACETS_CONFIGS[scope];
        if (!availableFacets || availableFacets.length === 0) {
          console.warn(`No facets available for scope: ${scope}`);
          return [];
        }

        // Create a facet test configuration for each available facet
        return availableFacets.map((facetName) => {
          return createTestConfig(endpointColumns, endpointColumnIndices, {
            [COLUMNS.PARAM_NAME]: facetName,
            [COLUMNS.PARAM_SCOPE]: scope,
            [COLUMNS.PARAM_Q]: query,
            [COLUMNS.PROVIDER_ID]:
              searchTestRow[searchColumnIndices[COLUMNS.PROVIDER_ID]],
            [COLUMNS.TEST_NAME]: `${facetName} facet for search "${
              searchTestRow[searchColumnIndices[COLUMNS.TEST_NAME]]
            }"`,
            [COLUMNS.DESCRIPTION]: `${facetName} facet for search "${
              searchTestRow[searchColumnIndices[COLUMNS.DESCRIPTION]]
            }"`,
            [COLUMNS.ENABLED]: "true",
            [COLUMNS.EXPECTED_STATUS]: "200",
            [COLUMNS.TIMEOUT_MS]: "30000",
            [COLUMNS.MAX_RESPONSE_TIME]: "5000",
            [COLUMNS.DELAY_AFTER_MS]: "0",
            [COLUMNS.TAGS]: `${endpointKey},derived`,
          });
        });
      },

      reportResults: (results, searchTestRows, scopeCounts) => {
        const totalCount = results.length;
        console.log(
          `Generated ${totalCount} ${endpointKey} from ${searchTestRows.length} search tests, by search scope:`
        );
        Object.entries(scopeCounts)
          .sort()
          .forEach(([scope, count]) => {
            console.log(`  ${scope}: ${count}`);
          });
      },
    }
  );
};

const getDerivedSearchEstimateConfigs = (
  endpointKey,
  endpointColumns,
  searchTestRows,
  searchColumns
) => {
  return generateTestConfigs(
    endpointKey,
    endpointColumns,
    searchTestRows,
    searchColumns,
    {
      generateConfigs: ({
        searchTestRow,
        scope,
        query,
        searchColumnIndices,
        endpointColumns,
        endpointColumnIndices,
        endpointKey,
      }) => {
        // Transform query to JSON format
        const processedQuery = convertQueryToJson(query);

        return [
          createTestConfig(endpointColumns, endpointColumnIndices, {
            [COLUMNS.PARAM_SCOPE]: scope,
            [COLUMNS.PARAM_Q]: processedQuery,
            [COLUMNS.PROVIDER_ID]:
              searchTestRow[searchColumnIndices[COLUMNS.PROVIDER_ID]],
            [COLUMNS.TEST_NAME]: `For search "${
              searchTestRow[searchColumnIndices[COLUMNS.TEST_NAME]]
            }"`,
            [COLUMNS.DESCRIPTION]: `For search "${
              searchTestRow[searchColumnIndices[COLUMNS.DESCRIPTION]]
            }"`,
            [COLUMNS.ENABLED]: "true",
            [COLUMNS.EXPECTED_STATUS]: "200",
            [COLUMNS.TIMEOUT_MS]: "15000",
            [COLUMNS.MAX_RESPONSE_TIME]: "3000",
            [COLUMNS.DELAY_AFTER_MS]: "0",
            [COLUMNS.TAGS]: `${endpointKey},derived`,
          }),
        ];
      },

      reportResults: (results, searchTestRows, _, endpointKey) => {
        console.log(
          `Generated ${results.length} ${endpointKey} requests from ${searchTestRows.length} search tests.`
        );
      },
    }
  );
};

const getDerivedSearchWillMatchConfigs = (
  endpointKey,
  endpointColumns,
  searchTestRows,
  searchColumns
) => {
  return generateTestConfigs(
    endpointKey,
    endpointColumns,
    searchTestRows,
    searchColumns,
    {
      generateConfigs: ({
        searchTestRow,
        scope,
        query,
        searchColumnIndices,
        endpointColumns,
        endpointColumnIndices,
        endpointKey,
      }) => {
        // Transform query to JSON and add scope as _scope property
        const processedQuery = convertQueryToJson(query, scope);

        return [
          createTestConfig(endpointColumns, endpointColumnIndices, {
            [COLUMNS.PARAM_SCOPE]: scope,
            [COLUMNS.PARAM_Q]: processedQuery,
            [COLUMNS.PROVIDER_ID]:
              searchTestRow[searchColumnIndices[COLUMNS.PROVIDER_ID]],
            [COLUMNS.TEST_NAME]: `For search "${
              searchTestRow[searchColumnIndices[COLUMNS.TEST_NAME]]
            }"`,
            [COLUMNS.DESCRIPTION]: `For search "${
              searchTestRow[searchColumnIndices[COLUMNS.DESCRIPTION]]
            }"`,
            [COLUMNS.ENABLED]: "true",
            [COLUMNS.EXPECTED_STATUS]: "200",
            [COLUMNS.TIMEOUT_MS]: "10000",
            [COLUMNS.MAX_RESPONSE_TIME]: "2000",
            [COLUMNS.DELAY_AFTER_MS]: "0",
            [COLUMNS.TAGS]: `${endpointKey},derived`,
          }),
        ];
      },

      reportResults: (results, searchTestRows, _, endpointKey) => {
        console.log(
          `Generated ${results.length} ${endpointKey} requests from ${searchTestRows.length} search tests.`
        );
      },
    }
  );
};
