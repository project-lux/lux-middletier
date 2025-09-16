import { TestDataProviderFactory } from "../test-data-providers/index.js";
import { ENDPOINT_KEYS } from "../constants.js";

/**
 * Get list of available provider IDs
 */
function getAvailableProviders() {
  const allProviders = TestDataProviderFactory.createAllProviders({});
  return allProviders.map((provider) => provider.getProviderId()).sort();
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
  providers.forEach((provider) => console.log(`  ${provider}`));

  console.log("\n=== AVAILABLE ENDPOINTS ===");
  const endpoints = getAvailableEndpoints();
  endpoints.forEach((endpoint) => console.log(`  ${endpoint}`));

  console.log("\n=== FILTERING EXAMPLES ===");
  console.log("Include specific providers:");
  console.log(
    "  --providers AdvancedSearchQueriesTestDataProvider,BenchmarkQueriesTestDataProvider"
  );
  console.log("\nExclude specific providers:");
  console.log("  --providers ^BackendLogsTestDataProvider");
  console.log("\nInclude specific endpoints:");
  console.log("  --endpoints get-search,get-auto-complete");
  console.log("\nExclude specific endpoints:");
  console.log("  --endpoints ^get-facets,^get-translate");
  console.log("\nCombine filters:");
  console.log(
    "  --providers AdvancedSearchQueriesTestDataProvider --endpoints ^get-facets"
  );
}

/**
 * Validate provider and endpoint filters
 */
function validateFilters(providerFilter, endpointFilter) {
  const errors = [];

  if (providerFilter && providerFilter.length > 0) {
    const availableProviders = getAvailableProviders();
    const invalidProviders = providerFilter.filter((p) => {
      const providerName = p.startsWith("^") ? p.substring(1) : p;
      return !availableProviders.includes(providerName);
    });

    if (invalidProviders.length > 0) {
      errors.push(
        `Unknown provider(s): ${invalidProviders.join(", ")}\n` +
          `Available providers: ${availableProviders.join(", ")}`
      );
    }
  }

  if (endpointFilter && endpointFilter.length > 0) {
    const availableEndpoints = getAvailableEndpoints();
    const invalidEndpoints = endpointFilter.filter((e) => {
      const endpointName = e.startsWith("^") ? e.substring(1) : e;
      return !availableEndpoints.includes(endpointName);
    });

    if (invalidEndpoints.length > 0) {
      errors.push(
        `Unknown endpoint(s): ${invalidEndpoints.join(", ")}\n` +
          `Available endpoints: ${availableEndpoints.join(", ")}`
      );
    }
  }

  return errors;
}

/**
 * Parse command line arguments and return configuration options
 */
export function parseCommandLineArgs() {
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
      console.log(
        "  --test-count=<number>         Maximum number of test cases to generate per provider"
      );
      console.log(
        "  --no-dedup                    Skip deduplication of test cases for faster processing"
      );
      console.log(
        "  --no-derive-related-tests     Skip generating get-facets, get-search-estimate and"
      );
      console.log(
        "                                get-search-will-match tests unless overridden by individual providers."
      )
      console.log(
        "  --providers, -p <providers>   Comma-separated list of test data providers to use"
      );
      console.log(
        "                                Use ^ prefix to exclude: ^BackendLogsTestDataProvider"
      );
      console.log(
        "  --endpoints, -e <endpoints>   Comma-separated list of endpoint types to generate"
      );
      console.log(
        "                                Use ^ prefix to exclude: ^get-facets,^get-translate"
      );
      console.log(
        "  --list-options                Show available providers and endpoints for filtering"
      );
      console.log("  --help, -h                    Show this help message");
      console.log("");
      console.log("Examples:");
      console.log("  node create-tests.js");
      console.log("  node create-tests.js --no-dedup");
      console.log("  node create-tests.js --no-derive-related-tests");
      console.log("  node create-tests.js --test-count=100");
      console.log(
        "  node create-tests.js --providers AdvancedSearchQueriesTestDataProvider"
      );
      console.log(
        "  node create-tests.js --providers ^BackendLogsTestDataProvider"
      );
      console.log(
        "  node create-tests.js --endpoints get-search,get-auto-complete"
      );
      console.log(
        "  node create-tests.js --endpoints ^get-facets,^get-translate"
      );
      console.log(
        "  node create-tests.js --providers AdvancedSearchQueriesTestDataProvider --endpoints get-search"
      );
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
        console.error(
          "Error: --providers requires a comma-separated list of provider names"
        );
        console.log(
          "Example: --providers AdvancedSearchQueriesTestDataProvider,BenchmarkQueriesTestDataProvider"
        );
        process.exit(1);
      }
    } else if (arg === "--endpoints" || arg === "-e") {
      // Next argument should be comma-separated list of endpoints
      i++;
      if (i < args.length) {
        options.endpointFilter = args[i].split(",").map((e) => e.trim());
      } else {
        console.error(
          "Error: --endpoints requires a comma-separated list of endpoint types"
        );
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
    } else if (arg === "--no-derive-related-tests") {
      options.noDeriveRelatedTests = true;
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
    const validationErrors = validateFilters(
      options.providerFilter,
      options.endpointFilter
    );
    if (validationErrors.length > 0) {
      console.error("Filter validation errors:");
      validationErrors.forEach((error) => console.error(`  ${error}`));
      console.log(
        "\nUse --list-options to see available providers and endpoints"
      );
      process.exit(1);
    }
  }

  return options;
}
