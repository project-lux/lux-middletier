import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TestDataProvider } from "../interface.js";
import { ENDPOINT_KEYS } from "../../constants.js";

/**
 * Test data provider that extracts test cases from JSON array files
 * Located in the data/ directory alongside this provider
 */
export class JsonArrayTestDataProvider extends TestDataProvider {
  /**
   * Constructor
   * @param {Object} options - Provider-specific options
   */
  constructor(options = {}) {
    super(options);
    this.sourceDir = path.dirname(fileURLToPath(import.meta.url));
    this.dataDir = path.join(this.sourceDir, "data");
  }

  /**
   * Find all JSON files in the data directory
   * @returns {Array<string>} - Array of JSON file paths
   */
  discoverJsonFiles() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        console.warn(`Data directory not found: ${this.dataDir}`);
        return [];
      }

      const files = fs.readdirSync(this.dataDir);
      return files
        .filter((file) => file.endsWith(".json"))
        .map((file) => path.join(this.dataDir, file));
    } catch (error) {
      console.error(`Error discovering JSON files: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if we should process this endpoint type
   * @param {string} endpointKey - The endpoint key to check
   * @returns {boolean} - Whether to process this endpoint
   */
  shouldProcessEndpoint(endpointKey) {
    return endpointKey === ENDPOINT_KEYS.GET_SEARCH;
  }

  /**
   * Parse and extract test cases from JSON array files
   * @param {Object} apiDef - API definition object containing endpoint information
   * @param {string} endpointKey - Unique key for the endpoint
   * @param {Array<string>} columns - Array of column names for the test spreadsheet
   * @returns {Promise<Array<Array>>} - Array of test data rows, each row is an array of values matching the columns
   */
  async extractTestData(apiDef, endpointKey, columns) {
    try {
      // Check if we should process this endpoint
      if (!this.shouldProcessEndpoint(endpointKey)) {
        console.log(
          `JsonArrayTestDataProvider: Skipping ${endpointKey} endpoint`,
        );
        return [];
      }

      console.log(`Processing the ${endpointKey} endpoint from JSON arrays`);

      const jsonFiles = this.discoverJsonFiles();

      if (jsonFiles.length === 0) {
        console.log("No JSON files found in data directory");
        return [];
      }

      console.log(
        `Processing ${jsonFiles.length} JSON file(s) for ${endpointKey} endpoint...`,
      );

      let allTestCases = [];

      // Process each JSON file
      for (const jsonFilePath of jsonFiles) {
        try {
          const testCases = await this.parseJsonFile(jsonFilePath, endpointKey);
          allTestCases = allTestCases.concat(testCases);
        } catch (error) {
          console.error(
            `Error processing file ${jsonFilePath}: ${error.message}`,
          );
          // Continue processing other files
        }
      }

      // Convert test cases to rows matching the column structure
      const testRows = this.convertToTestRows(allTestCases, columns);

      console.log(
        `✓ Generated ${testRows.length} test cases for ${endpointKey} from JSON arrays`,
      );

      return testRows;
    } catch (error) {
      console.error(
        `Error processing JSON arrays for ${endpointKey}:`,
        error.message,
      );
      return []; // Return empty array to not break other providers
    }
  }

  /**
   * Parse a single JSON file and extract test cases
   * @param {string} jsonFilePath - Path to the JSON file
   * @param {string} endpointKey - The specific endpoint key to parse data for
   * @returns {Promise<Array<Object>>} - Array of test case objects
   */
  async parseJsonFile(jsonFilePath, endpointKey) {
    try {
      const jsonContent = fs.readFileSync(jsonFilePath, "utf8");
      const jsonArray = JSON.parse(jsonContent);

      if (!Array.isArray(jsonArray)) {
        console.warn(`JSON file ${jsonFilePath} does not contain an array`);
        return [];
      }

      const testCases = [];
      const sourceFile = path.basename(jsonFilePath);

      for (let i = 0; i < jsonArray.length; i++) {
        const item = jsonArray[i];

        // Skip items where expected.error = true
        if (item.expected?.error === true) {
          console.log(
            `Skipping the '${item.name}' test case in ${sourceFile} because it is marked as expected.error`,
          );
          continue;
        }

        // Skip items marked as Optic only.
        if (item.opticOnly === true) {
          console.log(
            `Skipping the '${item.name}' test case in ${sourceFile} because it is marked as opticOnly`,
          );
          continue;
        }

        // Extract test case based on endpoint type
        if (endpointKey === ENDPOINT_KEYS.GET_SEARCH) {
          const testCase = this.extractSearchTestCase(item, i, sourceFile);
          if (testCase) {
            testCases.push(testCase);
          }
        }
      }

      return testCases;
    } catch (error) {
      throw new Error(
        `Failed to parse JSON file ${jsonFilePath}: ${error.message}`,
      );
    }
  }

  /**
   * Extract a search test case from a JSON array item
   * @param {Object} item - JSON array item
   * @param {number} index - Index in the array
   * @param {string} sourceFile - Source file name
   * @returns {Object|null} - Test case object or null if invalid
   */
  extractSearchTestCase(item, index, sourceFile) {
    try {
      // Validate required structure
      if (!item.input || !item.input.searchCriteria) {
        console.warn(
          `Item ${index + 1} in ${sourceFile} missing input.searchCriteria`,
        );
        return null;
      }

      const searchCriteria = item.input.searchCriteria;

      // Extract scope from searchCriteria._scope or default to "item"
      const scope = searchCriteria._scope || "item";

      // Use searchCriteria as the q parameter (serialize as JSON string)
      const qParam = JSON.stringify(searchCriteria);

      // Create test case object similar to BackendLogsTestDataProvider
      const testCase = {
        testName: item.name || `Test ${index + 1} in ${sourceFile}`,
        timestamp: new Date().toISOString(), // Use current time since we don't have log timestamps
        duration: 5000, // Default duration
        expectedStatus: 200, // Assume successful unless expected.error is true
        timeout: 30000, // Default timeout
        maxResponseTime: 10000, // Default max response time
        params: {
          scope: scope,
          q: qParam,
          // Add any other search parameters that might be at the top level of searchCriteria
          ...(searchCriteria.page && { page: searchCriteria.page }),
          ...(searchCriteria.pageLength && {
            pageLength: searchCriteria.pageLength,
          }),
        },
        sourceFile: sourceFile,
        rawData: item, // Store original item for reference
        expectedValue: item.expected ? item.expected.value : null,
      };

      return testCase;
    } catch (error) {
      console.warn(
        `Error extracting test case ${index + 1} from ${sourceFile}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Convert test cases to test rows matching the column structure
   * @param {Array<Object>} testCases - Test case objects
   * @param {Array<string>} columns - Column structure
   * @returns {Array<Array>} - Test data rows
   */
  convertToTestRows(testCases, columns) {
    return testCases.map((testCase, index) => {
      return columns.map((columnName) => {
        if (columnName === "test_name") {
          return `JSON array test ${index + 1}`;
        } else if (columnName === "description") {
          return testCase.testName || "";
        } else if (columnName === "enabled") {
          return true;
        } else if (columnName === "expected_status") {
          return testCase.expectedStatus || 200;
        } else if (columnName === "timeout_ms") {
          return testCase.timeout || 30000;
        } else if (columnName === "max_response_time") {
          return testCase.maxResponseTime || 10000;
        } else if (columnName === "delay_after_ms") {
          return 0;
        } else if (columnName === "tags") {
          return `json-arrays,${testCase.sourceFile.replace(".json", "")}`;
        } else if (columnName.startsWith("param:")) {
          const paramName = columnName.replace("param:", "");
          return testCase.params?.[paramName] || "";
        } else {
          // Default empty value for unrecognized columns
          return "";
        }
      });
    });
  }

  /**
   * Get metadata about the test data source
   * @returns {Object} - Metadata object with information about the source
   */
  getSourceMetadata() {
    const jsonFiles = this.discoverJsonFiles();
    return {
      type: this.constructor.name,
      providerId: this.getProviderId(),
      options: this.options,
      dataDirectory: this.dataDir,
      jsonFileCount: jsonFiles.length,
      lastModified: this.getLastModified(jsonFiles),
      recordCount: 0, // Will be updated after extraction
    };
  }

  /**
   * Get the most recent modification time of JSON files
   * @param {Array<string>} jsonFiles - Array of JSON file paths
   * @returns {string|null} - ISO timestamp of most recent modification
   */
  getLastModified(jsonFiles) {
    try {
      let latestTime = 0;
      for (const filePath of jsonFiles) {
        const stats = fs.statSync(filePath);
        if (stats.mtime.getTime() > latestTime) {
          latestTime = stats.mtime.getTime();
        }
      }
      return latestTime > 0 ? new Date(latestTime).toISOString() : null;
    } catch (error) {
      return null;
    }
  }
}
