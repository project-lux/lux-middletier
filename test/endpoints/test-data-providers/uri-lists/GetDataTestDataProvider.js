import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TestDataProvider } from "../interface.js";
import { extractDataParamsFromUrl } from '../../utils.js';

export class GetDataTestDataProvider extends TestDataProvider {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Extract test data for get-data endpoints, including virtual endpoints
   * @param {Object} apiDef - API definition object
   * @param {string} endpointKey - Unique endpoint key (including virtual endpoints)
   * @param {Array<string>} columns - Expected column structure
   * @returns {Promise<Array<Array>>} - Array of test data rows
   */
  async extractTestData(apiDef, endpointKey, columns) {
    // Determine URI list to use, if any at all.
    let filename = null;
    if (this.isGetDataWithProfile(endpointKey)) {
      this.withProfiles = true;
      filename = '2025-12-03-uris-with-profile.txt';
    } else if (this.isGetDataNoProfile(endpointKey)) {
      this.withProfiles = false;
      filename = '2025-12-03-uris-plain.txt';
    } else {
      return [];
    }

    try {
      // Path to the URI list file - one URI per line
      this.uriListPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), filename);

      // Check if URI list file exists
      if (!fs.existsSync(this.uriListPath)) {
        console.warn(`GetDataTestDataProvider: URI list file not found at ${this.uriListPath}`);
        return [];
      }

      // Read URIs from file
      const content = fs.readFileSync(this.uriListPath, 'utf-8');
      const uris = content
        .split('\n')
      //   .map(line => line.trim())
      //   .filter(line => line && !line.startsWith('#')); // Filter out empty lines and comments

      if (uris.length === 0) {
        console.warn(`GetDataTestDataProvider: No valid URIs found in '${filename}'`);
        return [];
      }

      const testRows = [];
      
      for (let i = 0; i < uris.length; i++) {
        const uri = uris[i];
        
        // Extract parameters from URI
        const params = extractDataParamsFromUrl(uri);
        if (!params.type || !params.uuid) {
          console.warn(`GetDataTestDataProvider: Could not extract type/uuid from URI: ${uri}`);
          continue;
        }

        // Check if this URI has a profile parameter
        const hasProfile = params.profile && params.profile.trim() !== '';
        
        // Filter based on virtual endpoint type
        if (this.isGetDataWithProfile(endpointKey) && !hasProfile) {
          continue; // Skip URIs without profile for with-profile endpoint
        }
        if (this.isGetDataNoProfile(endpointKey) && hasProfile) {
          continue; // Skip URIs with profile for no-profile endpoint
        }

        // Create test case
        const testRow = this.createTestRow(columns, params, uri, i + 1, endpointKey);
        testRows.push(testRow);
      }

      console.log(`GetDataTestDataProvider: Generated ${testRows.length} test cases for ${endpointKey} from ${uris.length} URIs`);
      return testRows;

    } catch (error) {
      console.error(`GetDataTestDataProvider error: ${error.message}`);
      return [];
    }
  }

  /**
   * Create a test row from URI parameters
   * @param {Array<string>} columns - Expected column structure
   * @param {Object} params - Extracted parameters from URI
   * @param {string} uri - Original URI
   * @param {number} index - Index for test naming
   * @param {string} endpointKey - Virtual endpoint key
   * @returns {Array} - Test data row
   */
  createTestRow(columns, params, uri, index, endpointKey) {
    const row = new Array(columns.length).fill('');
    
    columns.forEach((columnName, colIndex) => {
      if (columnName === 'provider_id') {
        row[colIndex] = this.getProviderId();
      } else if (columnName === 'test_name') {
        const profileSuffix = this.isGetDataWithProfile(endpointKey) ? ' with profile' : 
                             this.isGetDataNoProfile(endpointKey) ? ' no profile' : '';
        row[colIndex] = `Get data ${params.type}/${params.uuid}${profileSuffix}`;
      } else if (columnName === 'description') {
        row[colIndex] = `Retrieve ${params.type} document with UUID ${params.uuid}`;
      } else if (columnName === 'enabled') {
        row[colIndex] = true;
      } else if (columnName === 'expected_status') {
        row[colIndex] = 200;
      } else if (columnName === 'timeout_ms') {
        row[colIndex] = this.withProfiles ? 10000 : 60000;
      } else if (columnName === 'max_response_time') {
        row[colIndex] = this.withProfiles ? 5000 : 30000;
      } else if (columnName === 'delay_after_ms') {
        row[colIndex] = 0;
      } else if (columnName === 'tags') {
        const tags = ['get-data-provider'];
        if (this.isGetDataWithProfile(endpointKey)) {
          tags.push('with-profile');
        } else if (this.isGetDataNoProfile(endpointKey)) {
          tags.push('no-profile');
        }
        row[colIndex] = tags.join(',');
      } else if (columnName === 'duplicate_count') {
        row[colIndex] = 0; // Will be updated by deduplication logic if enabled
      } else if (columnName.startsWith('param:')) {
        const paramName = columnName.replace('param:', '');
        row[colIndex] = params[paramName] || '';
      }
    });

    return row;
  }
}

