#!/usr/bin/env node

/**
 * Compare two endpoint test reports and generate a detailed diff
 * Usage: node compare-reports.js <baseline-report.json> <current-report.json> [output-dir]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { findFileInSubdir } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReportComparator {
  constructor(baselineFile, currentFile, outputDir = './comparisons', comparisonName = null) {
    this.baselineFile = baselineFile;
    this.currentFile = currentFile;
    this.outputDir = outputDir;
    this.comparisonName = comparisonName;
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Load and parse JSON report
   */
  loadReport(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load report ${filePath}: ${error.message}`);
    }
  }

  /**
   * Compare two test reports and generate diff
   */
  async compareReports() {
    console.log('Loading reports...');
    const baseline = this.loadReport(this.baselineFile);
    const current = this.loadReport(this.currentFile);

    // Add stable keys for efficient matching
    this.addStableKeys(baseline.results);
    this.addStableKeys(current.results);

    console.log(`Baseline: ${baseline.results.length} tests (${baseline.summary.timestamp})`);
    console.log(`Current:  ${current.results.length} tests (${current.summary.timestamp})`);

    // Create test lookup maps for efficient comparison
    const baselineTests = this.createTestMap(baseline.results);
    const currentTests = this.createTestMap(current.results);

    // Generate comparison data
    const comparison = {
      metadata: {
        baseline_file: path.basename(this.baselineFile),
        current_file: path.basename(this.currentFile),
        baseline_dir: this.extractReportDirName(this.baselineFile),
        current_dir: this.extractReportDirName(this.currentFile),
        baseline_timestamp: baseline.summary.timestamp,
        current_timestamp: current.summary.timestamp,
        comparison_timestamp: new Date().toISOString()
      },
      functional_comparison: this.performFunctionalComparison(baselineTests, currentTests),
      summary: this.compareSummaries(baseline.summary, current.summary),
      detailed_performance: this.performDetailedPerformanceAnalysis(baseline.results, current.results),
      test_differences: this.compareTests(baselineTests, currentTests),
      endpoint_analysis: this.analyzeByEndpoint(baselineTests, currentTests),
      provider_analysis: this.analyzeByProvider(baseline.results, current.results),
      response_size_analysis: this.analyzeResponseSizePerformance(baseline.results, current.results),
      slowest_baseline_analysis: this.generateSlowestBaselineAnalysis(baseline.results, current.results),
      slowest_current_analysis: this.generateSlowestCurrentAnalysis(baseline.results, current.results)
    };

    await this.generateReports(comparison, baseline, current);
    return comparison;
  }

  /**
   * Extract key from test data
   * Keys are used to find the same request in the comparison report.
   * Uses unique request_id when available, falling back to flawed fallbacks for backward compatibility
   * Regardless of the method, the reports being compared need to have used the same test configuration files.
   */
  extractKey(test) {
    // Primary approach: use simple unique request ID (when available)
    // Valid when the tests being compared used the same test configuration files.
    if (test.request_id) {
      return test.request_id.toString();
    }

    /*
     * WARNING: FALLBACK METHODS ARE NOT RELIABLE.
     */
    
    // Fallback for old test data format - use response_body_file path (most reliable when available)
    if (test.response_body_file) {
      // Extract the stable portion: provider + filename (excludes timestamp directory)
      const parts = test.response_body_file.split('/');
      const testsIndex = parts.findIndex(part => part.endsWith('-tests'));
      
      if (testsIndex !== -1 && testsIndex < parts.length - 1) {
        // Return everything after the tests directory (provider + filename)
        return parts.slice(testsIndex + 1).join('/');
      }
      
      // Fallback: use just the filename
      return parts[parts.length - 1];
    }
    
    // Final fallback for tests without request_id or response_body_file (failed/timeout tests)
    // Create composite key from multiple stable fields to ensure uniqueness
    const keyParts = [];
    
    if (test.endpoint_type) keyParts.push(test.endpoint_type);
    if (test.provider_id) keyParts.push(test.provider_id);
    if (test.test_name) keyParts.push(test.test_name);
    if (test.source_file) keyParts.push(test.source_file);
    
    // Add parameter signature for additional uniqueness
    if (test.parameters && typeof test.parameters === 'object') {
      const paramSignature = JSON.stringify(test.parameters);
      const paramHash = this.simpleHash(paramSignature);
      keyParts.push(`params:${paramHash}`);
    }
    
    // Add URL path (without domain) for additional uniqueness
    if (test.url) {
      try {
        const urlObj = new URL(test.url);
        keyParts.push(`path:${urlObj.pathname}${urlObj.search}`);
      } catch (e) {
        // If URL parsing fails, just use the whole URL
        keyParts.push(`url:${test.url}`);
      }
    }
    
    if (keyParts.length === 0) {
      // Last resort: use timestamp if available
      return test.timestamp || 'unknown';
    }
    
    return keyParts.join('|');
  }

  /**
   * Simple hash function for creating consistent short identifiers
   */
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Add stable keys to test results for efficient matching
   */
  addStableKeys(results) {
    results.forEach(test => {
      test.stableKey = this.extractKey(test);
    });
  }

  /**
   * Create a map of tests keyed by stable key for efficient lookup
   */
  createTestMap(results) {
    const map = new Map();
    results.forEach(test => {
      if (test.stableKey) {
        map.set(test.stableKey, test);
      }
    });
    return map;
  }

  /**
   * Calculate percentiles from an array of numbers (optimized for large datasets)
   */
  calculatePercentiles(values, percentiles = [50, 90, 95, 99, 99.9]) {
    if (!values || values.length === 0) return {};
    
    // Use slice() instead of spread operator to avoid stack overflow
    const sorted = values.slice().sort((a, b) => a - b);
    const result = {};
    
    percentiles.forEach(p => {
      const index = (p / 100) * (sorted.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index % 1;
      
      if (lower === upper) {
        result[`p${p}`] = sorted[lower];
      } else {
        result[`p${p}`] = sorted[lower] * (1 - weight) + sorted[upper] * weight;
      }
    });
    
    return result;
  }

  /**
   * Calculate statistical metrics for performance analysis
   */
  calculateStats(values) {
    if (!values || values.length === 0) return {};
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;
    
    return {
      mean: Math.round(mean * 100) / 100,
      median: this.calculatePercentiles(values, [50]).p50,
      std_deviation: Math.round(stdDev * 100) / 100,
      coefficient_of_variation: Math.round(cv * 1000) / 1000,
      min: values.length > 0 ? values.reduce((min, val) => val < min ? val : min, values[0]) : 0,
      max: values.length > 0 ? values.reduce((max, val) => val > max ? val : max, values[0]) : 0
    };
  }

  /**
   * Perform functional comparison between baseline and current test results
   * Compares actual response content for functional parity
   */
  performFunctionalComparison(baselineTests, currentTests) {
    console.log('Performing functional comparison...');
    
    // Convert Maps to arrays of keys for analysis
    const baselineKeys = Array.from(baselineTests.keys());
    const currentKeys = Array.from(currentTests.keys());
    
    // Find tests that exist in both, baseline-only, and current-only
    const commonKeys = baselineKeys.filter(key => currentTests.has(key));
    const baselineOnlyKeys = baselineKeys.filter(key => !currentTests.has(key));
    const currentOnlyKeys = currentKeys.filter(key => !baselineTests.has(key));
    
    const functionalResults = {
      summary: {
        total_tests_baseline: baselineKeys.length,
        total_tests_current: currentKeys.length,
        common_tests: commonKeys.length,
        baseline_only_tests: baselineOnlyKeys.length,
        current_only_tests: currentOnlyKeys.length,
        total_comparisons: 0,
        successful_comparisons: 0,
        failed_comparisons: 0,
        missing_responses: 0
      },
      test_set_differences: {
        baseline_only: baselineOnlyKeys.map(key => ({
          key: key,
          test_name: baselineTests.get(key).test_name,
          endpoint_type: baselineTests.get(key).endpoint_type
        })),
        current_only: currentOnlyKeys.map(key => ({
          key: key,
          test_name: currentTests.get(key).test_name,
          endpoint_type: currentTests.get(key).endpoint_type
        }))
      },
      endpoint_results: {},
      detailed_differences: []
    };

    // Get all tests that exist in both baseline and current
    for (const key of commonKeys) {
      const baselineTest = baselineTests.get(key);
      const currentTest = currentTests.get(key);
      
      // Skip if either test doesn't have response body files
      if (!baselineTest.response_body_file || !currentTest.response_body_file) {
        functionalResults.summary.missing_responses++;
        continue;
      }

      functionalResults.summary.total_comparisons++;
      
      try {
        const comparison = this.compareFunctionalResponse(baselineTest, currentTest);
        
        if (comparison.has_differences) {
          functionalResults.summary.failed_comparisons++;
          functionalResults.detailed_differences.push(comparison);
        } else {
          functionalResults.summary.successful_comparisons++;
        }
        
        // Group by endpoint for analysis
        const endpointType = baselineTest.endpoint_type || 'unknown';
        if (!functionalResults.endpoint_results[endpointType]) {
          functionalResults.endpoint_results[endpointType] = {
            total: 0,
            passed: 0,
            failed: 0,
            differences: []
          };
        }
        
        functionalResults.endpoint_results[endpointType].total++;
        if (comparison.has_differences) {
          functionalResults.endpoint_results[endpointType].failed++;
          functionalResults.endpoint_results[endpointType].differences.push(comparison);
        } else {
          functionalResults.endpoint_results[endpointType].passed++;
        }
        
      } catch (error) {
        functionalResults.summary.failed_comparisons++;
        functionalResults.detailed_differences.push({
          test_key: key,
          test_name: baselineTest.test_name,
          description: baselineTest.description,
          endpoint_type: baselineTest.endpoint_type,
          has_differences: true,
          error: `Failed to compare responses: ${error.message}`,
          baseline_file: baselineTest.response_body_file,
          current_file: currentTest.response_body_file
        });
      }
    }
    
    // Log warnings about test set mismatches
    if (functionalResults.summary.baseline_only_tests > 0 || functionalResults.summary.current_only_tests > 0) {
      console.log(`⚠️  WARNING: Test set mismatch detected!`);
      console.log(`   Baseline-only tests: ${functionalResults.summary.baseline_only_tests}`);
      console.log(`   Current-only tests: ${functionalResults.summary.current_only_tests}`);
      console.log(`   This may indicate different test configurations were used.`);
    }
    
    console.log(`Functional comparison complete: ${functionalResults.summary.successful_comparisons}/${functionalResults.summary.total_comparisons} tests passed`);
    return functionalResults;
  }

  /**
   * Compare functional aspects of two response bodies
   */
  compareFunctionalResponse(baselineTest, currentTest) {
    const baselineResponse = this.loadResponseBody(baselineTest.response_body_file, this.baselineFile);
    const currentResponse = this.loadResponseBody(currentTest.response_body_file, this.currentFile);
    
    const comparison = {
      test_key: baselineTest._stable_key,
      test_name: baselineTest.test_name,
      description: baselineTest.description,
      endpoint_type: baselineTest.endpoint_type,
      baseline_url: baselineTest.url || '',
      has_differences: false,
      differences: [],
      baseline_file: baselineTest.response_body_file,
      current_file: currentTest.response_body_file
    };

    // Perform endpoint-specific functional comparison
    const endpointType = baselineTest.endpoint_type;
    
    if (endpointType === 'get-search') {
      this.compareSearchResponses(baselineResponse, currentResponse, comparison);
    } else if (endpointType === 'get-facets') {
      this.compareFacetResponses(baselineResponse, currentResponse, comparison);
    } else if (endpointType === 'get-related-list') {
      this.compareRelatedListResponses(baselineResponse, currentResponse, comparison);
    }
    // Add more endpoint types as needed
    
    comparison.has_differences = comparison.differences.length > 0;
    return comparison;
  }

  /**
   * Load response body from file
   */
  loadResponseBody(responseBodyFile, reportFile) {
    try {
      // Response body files are in the responses directory structure, not endpoints
      // e.g., reportFile: cts-v-optic/cts/endpoints/get-search/endpoint-test-report.json
      // Need to map to: cts-v-optic/cts/responses/get-search-tests/JsonArrayTestDataProvider/...
      
      const reportDir = path.dirname(reportFile);
      
      // Replace the endpoint name (get-search) with responses directory
      // Keep the full path structure but replace endpoints/get-search with responses
      let responseDir = reportDir;
      
      // Replace /endpoints/get-search with /responses (preserving the rest of the path)
      responseDir = responseDir.replace(/([\/\\])endpoints([\/\\])[^\/\\]*$/, '$1responses');
      
      // Extract just the filename from the response body file path
      // Skip the reports/test-run-*/responses/ prefix and use just the final parts
      let cleanedResponseFile = responseBodyFile;
      if (responseBodyFile.includes('responses' + path.sep)) {
        const responsesIndex = responseBodyFile.lastIndexOf('responses' + path.sep);
        cleanedResponseFile = responseBodyFile.substring(responsesIndex + 'responses'.length + 1);
      } else if (responseBodyFile.includes('responses/')) {
        const responsesIndex = responseBodyFile.lastIndexOf('responses/');
        cleanedResponseFile = responseBodyFile.substring(responsesIndex + 'responses/'.length);
      }
      
      const fullPath = path.resolve(responseDir, cleanedResponseFile);
      const content = fs.readFileSync(fullPath, 'utf8');
      const response = JSON.parse(content);
      return response.data; // Extract the actual response data
    } catch (error) {
      throw new Error(`Failed to load response body ${responseBodyFile}: ${error.message}`);
    }
  }

  /**
   * Compare search endpoint responses for functional parity
   */
  compareSearchResponses(baselineData, currentData, comparison) {
    // Compare total items count
    const baselineTotalItems = baselineData?.partOf?.[0]?.totalItems;
    const currentTotalItems = currentData?.partOf?.[0]?.totalItems;
    
    // Always store total items info for display purposes
    comparison.total_items_info = {
      type: 'total_items_info',
      baseline_total: baselineTotalItems,
      current_total: currentTotalItems,
      difference: currentTotalItems - baselineTotalItems,
      is_mismatch: baselineTotalItems !== currentTotalItems
    };
    
    // Only add to differences if there's a mismatch
    if (baselineTotalItems !== currentTotalItems) {
      comparison.differences.push(comparison.total_items_info);
    }
    
    // Compare ordered items (result ordering)
    const PAGE_SIZE = 20;
    const baselineItems = baselineData?.orderedItems || [];
    const currentItems = currentData?.orderedItems || [];
    
    // Use orderedItems count when available, otherwise estimate from totalItems
    const baselineResultCount = baselineItems.length > 0
      ? baselineItems.length
      : Math.min(baselineTotalItems || 0, PAGE_SIZE);
    const currentResultCount = currentItems.length > 0
      ? currentItems.length
      : Math.min(currentTotalItems || 0, PAGE_SIZE);
    
    // Always store result count info for display purposes
    comparison.result_count_info = {
      type: 'result_count_mismatch',
      baseline_count: baselineResultCount,
      current_count: currentResultCount,
      is_mismatch: baselineResultCount !== currentResultCount
    };
    
    // Only add to differences if there's a mismatch
    if (baselineResultCount !== currentResultCount) {
      comparison.differences.push(comparison.result_count_info);
    }

    // TODO: reenable once relevance sort is implemented; this populates the "Result Set" column.
    //
    // // Check if the same items are present (regardless of order)
    // const baselineIds = new Set(baselineItems.map(item => item.id));
    // const currentIds = new Set(currentItems.map(item => item.id));
    
    // const missingInCurrent = [...baselineIds].filter(id => !currentIds.has(id));
    // const extraInCurrent = [...currentIds].filter(id => !baselineIds.has(id));
    
    // if (missingInCurrent.length > 0 || extraInCurrent.length > 0) {
    //   comparison.differences.push({
    //     type: 'result_set_mismatch',
    //     missing_in_current: missingInCurrent,
    //     extra_in_current: extraInCurrent,
    //     missing_count: missingInCurrent.length,
    //     extra_count: extraInCurrent.length
    //   });
    // }
    
    // TODO: reenable once relevance sort is implemented; this populates the "Ordering" column.
    //
    // // Check ordering differences for overlapping items (regardless of missing/extra items)
    // const overlappingIds = [...baselineIds].filter(id => currentIds.has(id));
    
    // if (overlappingIds.length > 0) {
    //   // Create ordered lists of overlapping items based on their appearance in each result set
    //   const baselineOverlapOrder = baselineItems.filter(item => overlappingIds.includes(item.id)).map(item => item.id);
    //   const currentOverlapOrder = currentItems.filter(item => overlappingIds.includes(item.id)).map(item => item.id);
      
    //   // Count how many individual items moved from their baseline position
    //   let itemsMoved = 0;
    //   for (let i = 0; i < baselineOverlapOrder.length; i++) {
    //     const itemId = baselineOverlapOrder[i];
    //     const currentPosition = currentOverlapOrder.indexOf(itemId);
        
    //     // If the item is not at the same position, it moved
    //     if (currentPosition !== i) {
    //       itemsMoved++;
    //     }
    //   }
      
    //   if (itemsMoved > 0) {
    //     comparison.differences.push({
    //       type: 'ordering_differences',
    //       overlapping_items_count: overlappingIds.length,
    //       total_items_baseline: baselineItems.length,
    //       total_items_current: currentItems.length,
    //       items_moved: itemsMoved,
    //       baseline_order: baselineOverlapOrder.slice(0, 5), // First 5 for debugging
    //       current_order: currentOverlapOrder.slice(0, 5)
    //     });
    //   }
    // }
  }

  /**
   * Compare facet endpoint responses (placeholder for future implementation)
   */
  compareFacetResponses(baselineData, currentData, comparison) {
    // TODO: Implement facet-specific comparison logic
    // This will compare facet categories, counts, etc.
  }

  /**
   * Compare related list endpoint responses (placeholder for future implementation)
   */
  compareRelatedListResponses(baselineData, currentData, comparison) {
    // TODO: Implement related list-specific comparison logic
    // This will compare related items, relationships, etc.
  }

  /**
   * Sample an array efficiently for large datasets
   */
  sampleArray(array, targetSize) {
    if (array.length <= targetSize) return array;
    
    const step = Math.floor(array.length / targetSize);
    const sample = [];
    
    for (let i = 0; i < array.length; i += step) {
      if (sample.length < targetSize) {
        sample.push(array[i]);
      }
    }
    
    return sample;
  }

  /**
   * Extract the report directory name from a file path
   * For path like "reports/ML-Mini-16-2025-11-14_19-14-58/endpoints/get-facets/endpoint-test-report.json"
   * Returns "ML-Mini-16-2025-11-14_19-14-58"
   */
  extractReportDirName(filePath) {
    const pathParts = filePath.split(/[\\/]/);
    // Find the LAST occurrence of 'endpoints' since there might be multiple
    let endpointsIndex = -1;
    for (let i = pathParts.length - 1; i >= 0; i--) {
      if (pathParts[i] === 'endpoints') {
        endpointsIndex = i;
        break;
      }
    }
    if (endpointsIndex > 0) {
      return pathParts[endpointsIndex - 1];
    }
    // Fallback to directory containing the file
    return path.basename(path.dirname(filePath));
  }

  /**
   * Compare summary statistics
   */
  compareSummaries(baseline, current) {
    const summary = {
      test_count: {
        baseline: baseline.total_tests,
        current: current.total_tests,
        difference: current.total_tests - baseline.total_tests
      },
      pass_rate: {
        baseline: baseline.total_tests > 0 ? (baseline.passed / baseline.total_tests * 100).toFixed(1) : 0,
        current: current.total_tests > 0 ? (current.passed / current.total_tests * 100).toFixed(1) : 0
      },
      performance: {
        avg_duration_baseline: Math.round(baseline.average_duration || 0),
        avg_duration_current: Math.round(current.average_duration || 0),
        duration_change: Math.round((current.average_duration || 0) - (baseline.average_duration || 0))
      },
      status_changes: {
        passed: { baseline: baseline.passed, current: current.passed, change: current.passed - baseline.passed },
        failed: { baseline: baseline.failed, current: current.failed, change: current.failed - baseline.failed },
        errors: { baseline: baseline.errors, current: current.errors, change: current.errors - baseline.errors },
        slow: { baseline: baseline.slow, current: current.slow, change: current.slow - baseline.slow }
      }
    };

    // Calculate pass rate change
    summary.pass_rate.change = (parseFloat(summary.pass_rate.current) - parseFloat(summary.pass_rate.baseline)).toFixed(1);

    return summary;
  }

  /**
   * Perform detailed performance analysis with percentiles and statistical metrics
   */
  performDetailedPerformanceAnalysis(baselineResults, currentResults) {
    // Extract duration values from successful tests only
    const baselineDurations = baselineResults
      .filter(test => test.status === 'PASS')
      .map(test => test.duration_ms || 0);
    
    const currentDurations = currentResults
      .filter(test => test.status === 'PASS')
      .map(test => test.duration_ms || 0);

    if (baselineDurations.length === 0 || currentDurations.length === 0) {
      return { error: 'Insufficient data for performance analysis' };
    }

    // Calculate percentiles
    const baselinePercentiles = this.calculatePercentiles(baselineDurations);
    const currentPercentiles = this.calculatePercentiles(currentDurations);
    
    // Calculate statistical metrics
    const baselineStats = this.calculateStats(baselineDurations);
    const currentStats = this.calculateStats(currentDurations);

    // Build comparison object
    const percentileComparison = {};
    Object.keys(baselinePercentiles).forEach(key => {
      const baselineVal = baselinePercentiles[key];
      const currentVal = currentPercentiles[key];
      const change = currentVal - baselineVal;
      const relativeChange = baselineVal > 0 ? (change / baselineVal) * 100 : 0;
      
      percentileComparison[key] = {
        baseline: Math.round(baselineVal * 100) / 100,
        current: Math.round(currentVal * 100) / 100,
        change: Math.round(change * 100) / 100,
        relative_change: Math.round(relativeChange * 10) / 10
      };
    });

    return {
      sample_sizes: {
        baseline: baselineDurations.length,
        current: currentDurations.length
      },
      percentiles: percentileComparison,
      statistical_metrics: {
        mean: {
          baseline: baselineStats.mean,
          current: currentStats.mean,
          change: Math.round((currentStats.mean - baselineStats.mean) * 100) / 100,
          relative_change: baselineStats.mean > 0 ? Math.round(((currentStats.mean - baselineStats.mean) / baselineStats.mean) * 1000) / 10 : 0
        },
        std_deviation: {
          baseline: baselineStats.std_deviation,
          current: currentStats.std_deviation,
          change: Math.round((currentStats.std_deviation - baselineStats.std_deviation) * 100) / 100
        },
        coefficient_of_variation: {
          baseline: baselineStats.coefficient_of_variation,
          current: currentStats.coefficient_of_variation,
          change: Math.round((currentStats.coefficient_of_variation - baselineStats.coefficient_of_variation) * 1000) / 1000
        },
        range: {
          baseline: { min: baselineStats.min, max: baselineStats.max },
          current: { min: currentStats.min, max: currentStats.max }
        }
      }
    };
  }

  /**
   * Compare individual tests
   */
  compareTests(baselineTests, currentTests) {
    const differences = {
      regressions: [], // Tests that were passing but now fail
      improvements: [], // Tests that were failing but now pass
      new_tests: [], // Tests in current but not in baseline
      missing_tests: [], // Tests in baseline but not in current
      performance_changes: [], // Significant performance changes
      status_unchanged: 0 // Tests with same status
    };

    // Check tests in current report
    for (const [testStableKey, currentTest] of currentTests) {
      const baselineTest = baselineTests.get(testStableKey);

      if (!baselineTest) {
        differences.new_tests.push({
          test_name: currentTest.test_name,
          status: currentTest.status,
          endpoint_type: currentTest.endpoint_type
        });
      } else {
        const comparison = this.compareIndividualTest(baselineTest, currentTest);
        
        if (comparison.status_changed) {
          if (comparison.is_regression) {
            differences.regressions.push(comparison);
          } else if (comparison.is_improvement) {
            differences.improvements.push(comparison);
          }
        } else {
          differences.status_unchanged++;
        }

        if (comparison.significant_performance_change) {
          differences.performance_changes.push(comparison);
        }
      }
    }

    // Check for missing tests (in baseline but not current)
    for (const [testStableKey, baselineTest] of baselineTests) {
      if (!currentTests.has(testStableKey)) {
        differences.missing_tests.push({
          test_name: baselineTest.test_name,
          status: baselineTest.status,
          endpoint_type: baselineTest.endpoint_type
        });
      }
    }

    return differences;
  }

  /**
   * Compare a single test between baseline and current
   */
  compareIndividualTest(baseline, current) {
    const statusChanged = baseline.status !== current.status;
    const durationChange = (current.duration_ms || 0) - (baseline.duration_ms || 0);
    const significantPerfChange = Math.abs(durationChange) > 1000; // More than 1 second difference

    return {
      test_name: current.test_name,
      endpoint_type: current.endpoint_type,
      baseline_status: baseline.status,
      current_status: current.status,
      status_changed: statusChanged,
      is_regression: statusChanged && baseline.status === 'PASS' && current.status !== 'PASS',
      is_improvement: statusChanged && baseline.status !== 'PASS' && current.status === 'PASS',
      baseline_duration: baseline.duration_ms || 0,
      current_duration: current.duration_ms || 0,
      duration_change: durationChange,
      significant_performance_change: significantPerfChange,
      baseline_error: baseline.error_message,
      current_error: current.error_message
    };
  }

  /**
   * Analyze changes by endpoint type
   */
  analyzeByEndpoint(baselineTests, currentTests) {
    const endpointStats = new Map();

    // Initialize stats for all endpoint types
    const allEndpointTypes = new Set();
    for (const test of baselineTests.values()) {
      allEndpointTypes.add(test.endpoint_type);
    }
    for (const test of currentTests.values()) {
      allEndpointTypes.add(test.endpoint_type);
    }

    allEndpointTypes.forEach(type => {
      endpointStats.set(type, {
        endpoint_type: type,
        baseline_total: 0,
        current_total: 0,
        baseline_passed: 0,
        current_passed: 0,
        regressions: 0,
        improvements: 0,
        avg_duration_change: 0
      });
    });

    // Count baseline stats
    for (const test of baselineTests.values()) {
      const stats = endpointStats.get(test.endpoint_type);
      stats.baseline_total++;
      if (test.status === 'PASS') stats.baseline_passed++;
    }

    // Count current stats and changes
    let totalDurationChanges = 0;
    let durationChangeCount = 0;

    for (const test of currentTests.values()) {
      const stats = endpointStats.get(test.endpoint_type);
      stats.current_total++;
      if (test.status === 'PASS') stats.current_passed++;

      const baselineTest = baselineTests.get(test.test_name);
      if (baselineTest) {
        if (baselineTest.status === 'PASS' && test.status !== 'PASS') {
          stats.regressions++;
        } else if (baselineTest.status !== 'PASS' && test.status === 'PASS') {
          stats.improvements++;
        }

        const durationChange = (test.duration_ms || 0) - (baselineTest.duration_ms || 0);
        totalDurationChanges += durationChange;
        durationChangeCount++;
      }
    }

    // Calculate average duration change for each endpoint type
    if (durationChangeCount > 0) {
      for (const [type, stats] of endpointStats) {
        const typeTests = [...currentTests.values()].filter(t => t.endpoint_type === type);
        let typeDurationChange = 0;
        let typeCount = 0;

        typeTests.forEach(test => {
          const baselineTest = baselineTests.get(test.test_name);
          if (baselineTest) {
            typeDurationChange += (test.duration_ms || 0) - (baselineTest.duration_ms || 0);
            typeCount++;
          }
        });

        stats.avg_duration_change = typeCount > 0 ? Math.round(typeDurationChange / typeCount) : 0;
      }
    }

    return Array.from(endpointStats.values());
  }

  /**
   * Generate slowest 100 tests from baseline and how current test performed on those same tests
   */
  generateSlowestBaselineAnalysis(baselineResults, currentResults) {
    // Include all tests with durations (including timeouts which are the actual slowest) and sort by duration descending
    const slowestBaseline = baselineResults
      .filter(test => test.duration_ms)
      .sort((a, b) => (b.duration_ms || 0) - (a.duration_ms || 0))
      .slice(0, 100);

    // Create lookup map for current test results
    const currentTestsMap = new Map();
    currentResults.forEach(test => {
      if (test.stableKey) {
        currentTestsMap.set(test.stableKey, test);
      }
    });

    // Create analysis with baseline slowest and corresponding current performance
    return slowestBaseline.map(baselineTest => {
      const currentTest = currentTestsMap.get(baselineTest.stableKey);
      const currentDuration = currentTest ? (currentTest.duration_ms || 0) : null;
      const currentStatus = currentTest ? currentTest.status : 'MISSING*';
      
      return {
        test_name: baselineTest.test_name,
        baseline_duration: baselineTest.duration_ms || 0,
        baseline_url: baselineTest.url || '',
        baseline_description: baselineTest.description || '',
        current_duration: currentDuration,
        current_url: currentTest ? (currentTest.url || '') : '',
        current_description: currentTest ? (currentTest.description || '') : '',
        current_status: currentStatus,
        duration_change: currentDuration !== null ? (currentDuration - (baselineTest.duration_ms || 0)) : null,
        relative_change: (baselineTest.duration_ms || 0) > 0 && currentDuration !== null 
          ? (((currentDuration - (baselineTest.duration_ms || 0)) / (baselineTest.duration_ms || 0)) * 100) 
          : null
      };
    });
  }

  /**
   * Generate slowest 100 tests from current and how baseline test performed on those same tests
   */
  generateSlowestCurrentAnalysis(baselineResults, currentResults) {
    // Include all tests with durations (including timeouts which are the actual slowest) and sort by duration descending
    const slowestCurrent = currentResults
      .filter(test => test.duration_ms)
      .sort((a, b) => (b.duration_ms || 0) - (a.duration_ms || 0))
      .slice(0, 100);

    // Create lookup map for baseline test results
    const baselineTestsMap = new Map();
    baselineResults.forEach(test => {
      if (test.stableKey) {
        baselineTestsMap.set(test.stableKey, test);
      }
    });

    // Create analysis with current slowest and corresponding baseline performance
    return slowestCurrent.map(currentTest => {
      const baselineTest = baselineTestsMap.get(currentTest.stableKey);
      const baselineDuration = baselineTest ? (baselineTest.duration_ms || 0) : null;
      const baselineStatus = baselineTest ? baselineTest.status : 'MISSING*';
      
      return {
        test_name: currentTest.test_name,
        current_duration: currentTest.duration_ms || 0,
        current_url: currentTest.url || '',
        current_description: currentTest.description || '',
        baseline_duration: baselineDuration,
        baseline_url: baselineTest ? (baselineTest.url || '') : '',
        baseline_description: baselineTest ? (baselineTest.description || '') : '',
        baseline_status: baselineStatus,
        duration_change: baselineDuration !== null ? ((currentTest.duration_ms || 0) - baselineDuration) : null,
        relative_change: baselineDuration !== null && baselineDuration > 0 
          ? (((currentTest.duration_ms || 0) - baselineDuration) / baselineDuration * 100) 
          : null
      };
    });
  }

  /**
   * Generate comparison reports in multiple formats
   */
  async generateReports(comparison, baseline = {}, current = {}) {
    // Extract endpoint type from output directory path for consistent naming
    const endpointType = path.basename(this.outputDir);
    const baseFileName = `${endpointType}-comparison`;

    // JSON Report
    const jsonFile = path.join(this.outputDir, `${baseFileName}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(comparison, null, 2));

    // HTML Report
    const htmlFile = path.join(this.outputDir, `${baseFileName}.html`);
    const htmlContent = await this.generateHTMLReport(comparison, baseline.results, current.results);
    fs.writeFileSync(htmlFile, htmlContent);

    // Console Summary
    this.printConsoleSummary(comparison);

    console.log(`\nComparison reports generated:`);
    console.log(`- JSON: ${jsonFile}`);
    console.log(`- HTML: ${htmlFile}`);
  }

  /**
   * Print summary to console
   */
  printConsoleSummary(comparison) {
    const { summary, test_differences, functional_comparison } = comparison;

    console.log('\n=== COMPARISON SUMMARY ===');
    console.log(`Test Count: ${summary.test_count.baseline} → ${summary.test_count.current} (${summary.test_count.difference >= 0 ? '+' : ''}${summary.test_count.difference})`);
    console.log(`Pass Rate: ${summary.pass_rate.baseline}% → ${summary.pass_rate.current}% (${summary.pass_rate.change >= 0 ? '+' : ''}${summary.pass_rate.change}%)`);
    console.log(`Avg Duration: ${summary.performance.avg_duration_baseline}ms → ${summary.performance.avg_duration_current}ms (${summary.performance.duration_change >= 0 ? '+' : ''}${summary.performance.duration_change}ms)`);

    if (functional_comparison) {
      console.log('\n=== FUNCTIONAL PARITY ===');
      
      // Check for test set mismatches and show prominent warning
      const hasMismatches = functional_comparison.summary.baseline_only_tests > 0 || 
                           functional_comparison.summary.current_only_tests > 0;
      
      if (hasMismatches) {
        console.log('⚠️  🚨 WARNING: TEST SET MISMATCH DETECTED! 🚨');
        console.log(`   Tests only in baseline: ${functional_comparison.summary.baseline_only_tests}`);
        console.log(`   Tests only in current:  ${functional_comparison.summary.current_only_tests}`);
        console.log(`   Common tests:           ${functional_comparison.summary.common_tests}`);
        console.log('   ❗ This suggests different test configurations were used.');
        console.log('   ❗ Comparison results may not be valid.');
        console.log('');
      }
      
      console.log(`🔍 Functional Tests: ${functional_comparison.summary.successful_comparisons}/${functional_comparison.summary.total_comparisons} passed`);
      console.log(`❌ Failed Comparisons: ${functional_comparison.summary.failed_comparisons}`);
      console.log(`📄 Missing Response Files: ${functional_comparison.summary.missing_responses}`);
      
      if (Object.keys(functional_comparison.endpoint_results).length > 0) {
        console.log('\n📊 By Endpoint:');
        Object.entries(functional_comparison.endpoint_results).forEach(([endpoint, results]) => {
          const passRate = (results.passed / results.total * 100).toFixed(1);
          console.log(`  ${endpoint}: ${results.passed}/${results.total} (${passRate}%)`);
        });
      }
    }

    console.log('\n=== CHANGES ===');
    console.log(`🔴 Regressions: ${test_differences.regressions.length}`);
    console.log(`🟢 Improvements: ${test_differences.improvements.length}`);
    console.log(`🆕 New Tests: ${test_differences.new_tests.length}`);
    console.log(`❌ Missing Tests: ${test_differences.missing_tests.length}`);
    console.log(`⚡ Performance Changes: ${test_differences.performance_changes.length}`);
    console.log(`➡️  Unchanged: ${test_differences.status_unchanged}`);

    if (test_differences.regressions.length > 0) {
      console.log('\n🔴 REGRESSIONS:');
      test_differences.regressions.forEach(reg => {
        console.log(`  - ${reg.test_name} (${reg.baseline_status} → ${reg.current_status})`);
      });
    }

    if (test_differences.improvements.length > 0) {
      console.log('\n🟢 IMPROVEMENTS:');
      test_differences.improvements.forEach(imp => {
        console.log(`  - ${imp.test_name} (${imp.baseline_status} → ${imp.current_status})`);
      });
    }
  }

  /**
   * Generate HTML comparison report
   */
  async generateHTMLReport(comparison, baselineResults = [], currentResults = []) {
    const { metadata, summary, test_differences, endpoint_analysis, detailed_performance, provider_analysis, response_size_analysis, slowest_baseline_analysis, slowest_current_analysis } = comparison;
    const title = this.comparisonName || "Test Report Comparison";
    
    // Read Chart.js from node_modules for inline inclusion
    // COMMENTED OUT for performance: Chart.js library is ~200KB inline
    // const chartJsPath = path.resolve(__dirname, './node_modules/chart.js/dist/chart.umd.min.js');
    // const chartJsContent = await fs.promises.readFile(chartJsPath, 'utf8');
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
    <!-- COMMENTED OUT: Chart.js library for performance -->
    <!-- <script>Chart.js library would be embedded here</script> -->
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary-grid { display: grid; grid-tests-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .metric-card { background: white; border: 1px solid #ddd; border-radius: 5px; padding: 15px; }
        .metric-value { font-size: 1.5em; font-weight: bold; }
        .positive { color: green; }
        .negative { color: red; }
        .neutral { color: #667; }
        .json-link { color: #0066cc; text-decoration: none; cursor: pointer; margin-left: 8px; font-size: 14px; padding: 2px 6px; background-color: #f0f8ff; border: 1px solid #0066cc; border-radius: 3px; display: inline-block; vertical-align: middle; }
        .json-link:hover { background-color: #e6f3ff; color: #0052a3; }
        .json-popup { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 1000; }
        .json-popup-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; padding: 20px; border-radius: 8px; max-width: 80%; max-height: 80%; overflow: auto; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); }
        .json-popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .json-popup-buttons { display: flex; gap: 10px; }
        .json-popup-copy { background: #4CAF50; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-size: 14px; }
        .json-popup-copy:hover { background: #45a049; }
        .json-popup-close { background: #f44336; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-size: 14px; }
        .json-popup-close:hover { background: #d32f2f; }
        .json-content { background: #f8f9fa; padding: 15px; border-radius: 4px; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 14px; max-height: 60vh; overflow: auto; border: 1px solid #dee2e6; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .regression { background-color: #ffebee; }
        .improvement { background-color: #e8f5e8; }
        .new-test { background-color: #fff3e0; }
        .missing-test { background-color: #fafafa; }
        .section { margin-bottom: 30px; }
    </style>
</head>
<body>
    <div class="header">
    <h1>${title}</h1>
    <p><strong>Baseline:</strong> ${title.includes('-to-') ? title.split("-to-")[0] : metadata.baseline_dir}</p>
    <p><strong>Current:</strong> ${title.includes('-to-') ? title.split("-to-")[1].split(":")[0] : metadata.current_dir}</p>
        <p><strong>Generated:</strong> ${new Date(metadata.comparison_timestamp).toLocaleString()}</p>
    </div>
    
    <div class="section">
        <h2>Table of Contents</h2>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
            <ul style="list-style: none; padding-left: 0; margin: 0; line-height: 1.6;">
                <li><a href="#summary" style="text-decoration: none; color: #007bff; font-weight: bold;">Summary</a></li>
                ${comparison.functional_comparison ? `<li><a href="#functional-comparison" style="text-decoration: none; color: #007bff; font-weight: bold;">Functional Comparison</a></li>` : ''}
                <li><a href="#visualizations" style="text-decoration: none; color: #007bff; font-weight: bold;">Performance Visualizations</a>
                    <ul style="list-style: none; padding-left: 20px; margin-top: 5px;">
                        <!-- COMMENTED OUT: Chart navigation links -->
                        <!-- <li><a href="#chronological-chart" style="text-decoration: none; color: #6c757d;">Chronological Response Times</a></li> -->
                        <!-- <li><a href="#percentile-chart" style="text-decoration: none; color: #6c757d;">Performance Percentiles</a></li> -->
                        <!-- <li><a href="#provider-chart" style="text-decoration: none; color: #6c757d;">Provider Performance Changes</a></li> -->
                        <!-- <li><a href="#size-chart" style="text-decoration: none; color: #6c757d;">Response Size Impact Analysis</a></li> -->
                    </ul>
                </li>
                ${detailed_performance && !detailed_performance.error ? `<li><a href="#performance-analysis" style="text-decoration: none; color: #007bff; font-weight: bold;">Detailed Performance Analysis</a>
                    <ul style="list-style: none; padding-left: 20px; margin-top: 5px;">
                        <li><a href="#request-counts" style="text-decoration: none; color: #6c757d;">Request Counts</a></li>
                        <li><a href="#performance-percentiles" style="text-decoration: none; color: #6c757d;">Performance Percentiles</a></li>
                        <li><a href="#statistical-metrics" style="text-decoration: none; color: #6c757d;">Statistical Metrics</a></li>
                        ${provider_analysis && provider_analysis.length > 0 ? `<li><a href="#provider-analysis" style="text-decoration: none; color: #6c757d;">Provider Analysis</a></li>` : ''}
                        ${response_size_analysis ? `<li><a href="#response-size-analysis" style="text-decoration: none; color: #6c757d;">Response Size vs Performance Analysis</a></li>` : ''}
                    </ul>
                </li>
                ` : ''}
                <li><a href="#slowest-100" style="text-decoration: none; color: #007bff; font-weight: bold;">Slowest 100 Tests Analysis</a>
                    <ul style="list-style: none; padding-left: 20px; margin-top: 5px;">
                        ${slowest_baseline_analysis && slowest_baseline_analysis.length > 0 ? `<li><a href="#slowest-baseline" style="text-decoration: none; color: #6c757d;">Slowest 100 Baseline Tests Analysis</a></li>` : ''}
                        ${slowest_current_analysis && slowest_current_analysis.length > 0 ? `<li><a href="#slowest-current" style="text-decoration: none; color: #6c757d;">Slowest 100 Current Tests Analysis</a></li>` : ''}
                    </ul>
                </li>
                <li><a href="#regressions-and-improvements" style="text-decoration: none; color: #007bff; font-weight: bold;">Regressions and Improvements</a>
                    <ul style="list-style: none; padding-left: 20px; margin-top: 5px;">
                        <li><a href="#overview" style="text-decoration: none; color: #6c757d;">Changes Overview</a></li>
                        ${test_differences.regressions.length > 0 ? `<li><a href="#regressions" style="text-decoration: none; color: #6c757d;">Regressions</a></li>` : ''}
                        ${test_differences.improvements.length > 0 ? `<li><a href="#improvements" style="text-decoration: none; color: #6c757d;">Improvements</a></li>` : ''}
                    </ul>
                </li>
            </ul>
        </div>
    </div>
    
    <div class="section" id="summary">
        <h2>Summary</h2>
        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-value ${summary.test_count.difference >= 0 ? 'positive' : 'negative'}">${summary.test_count.current}</div>
                <div>Total Tests (${summary.test_count.difference >= 0 ? '+' : ''}${summary.test_count.difference})</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${parseFloat(summary.pass_rate.change) >= 0 ? 'positive' : 'negative'}">${summary.pass_rate.current}%</div>
                <div>Pass Rate (${summary.pass_rate.change >= 0 ? '+' : ''}${summary.pass_rate.change}%)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${summary.performance.duration_change <= 0 ? 'positive' : 'negative'}">${summary.performance.avg_duration_current}ms</div>
                <div>Avg Duration (${summary.performance.duration_change >= 0 ? '+' : ''}${summary.performance.duration_change}ms)</div>
            </div>
        </div>
    </div>
    
    ${comparison.functional_comparison ? `
    <div class="section" id="functional-comparison">
        <h2>🔍 Functional Comparison</h2>
        
        ${(comparison.functional_comparison.summary.baseline_only_tests > 0 || comparison.functional_comparison.summary.current_only_tests > 0) ? `
        <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #856404; margin-top: 0; display: flex; align-items: center;">
                <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
                🚨 TEST SET MISMATCH DETECTED!
            </h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px;">
                <div style="text-align: center; padding: 10px; background: #fff; border-radius: 5px; border: 1px solid #ffc107;">
                    <div style="font-size: 24px; font-weight: bold; color: #856404;">${comparison.functional_comparison.summary.baseline_only_tests}</div>
                    <div style="font-size: 14px; color: #856404;">Baseline-Only Tests</div>
                </div>
                <div style="text-align: center; padding: 10px; background: #fff; border-radius: 5px; border: 1px solid #ffc107;">
                    <div style="font-size: 24px; font-weight: bold; color: #856404;">${comparison.functional_comparison.summary.current_only_tests}</div>
                    <div style="font-size: 14px; color: #856404;">Current-Only Tests</div>
                </div>
                <div style="text-align: center; padding: 10px; background: #fff; border-radius: 5px; border: 1px solid #ffc107;">
                    <div style="font-size: 24px; font-weight: bold; color: #856404;">${comparison.functional_comparison.summary.common_tests}</div>
                    <div style="font-size: 14px; color: #856404;">Common Tests</div>
                </div>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545;">
                <p style="margin: 0; color: #721c24; font-weight: bold;">
                    ❗ This suggests different test configurations were used for baseline and current runs.
                    <br>❗ Functional comparison results may not be reliable or valid.
                </p>
            </div>
        </div>
        ` : ''}
        
        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-value ${comparison.functional_comparison.summary.successful_comparisons === comparison.functional_comparison.summary.total_comparisons ? 'positive' : 'negative'}">${comparison.functional_comparison.summary.successful_comparisons}/${comparison.functional_comparison.summary.total_comparisons}</div>
                <div>Functional Parity Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${comparison.functional_comparison.summary.failed_comparisons === 0 ? 'positive' : 'negative'}">${comparison.functional_comparison.summary.failed_comparisons}</div>
                <div>Failed Comparisons</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${comparison.functional_comparison.summary.missing_responses === 0 ? 'positive' : 'negative'}">${comparison.functional_comparison.summary.missing_responses}</div>
                <div>Missing Response Files</div>
            </div>
        </div>
        
        <!-- REMOVED: Results by Endpoint section - redundant with summary metrics above -->
        
        ${comparison.functional_comparison.detailed_differences.length > 0 ? `
        <h3>Functional Differences</h3>
        <div class="table-container">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Test</th>
                        <th>Description</th>
                        <th>Total Items</th>
                        <th>Result Count</th>
                        <th>Result Set</th>
                        <th>Ordering</th>
                        <th>Criteria</th>
                    </tr>
                </thead>
                <tbody>
                    ${comparison.functional_comparison.detailed_differences.map(diff => {
                        // Use the proper test name from the configuration (Column B)
                        const testName = diff.test_name || diff.test_key || 'Unknown Test';
                        // Use description for hover tooltip (Column C)
                        const description = diff.description || 'No description available';
                        
                        // Parse differences by type
                        const totalItemsInfo = diff.total_items_info || diff.differences?.find(d => d.type === 'total_items_info');
                        const resultCountDiff = diff.result_count_info || diff.differences?.find(d => d.type === 'result_count_mismatch');
                        const resultSetDiff = diff.differences?.find(d => d.type === 'result_set_mismatch');
                        const orderingDiff = diff.differences?.find(d => d.type === 'ordering_differences');

                        // Extract query criteria from URL
                        let criteriaHtml = 'N/A';
                        if (diff.baseline_url) {
                          try {
                            const urlObj = new URL(diff.baseline_url);
                            const qParam = urlObj.searchParams.get('q');
                            // Extract scope from URL path: /api/search/[scope]?...
                            const scopeMatch = diff.baseline_url.match(/\/api\/search\/([a-z]+)[\/?]/);
                            const scopeParam = scopeMatch ? scopeMatch[1] : null;
                            if (qParam) {
                              try {
                                const parsedJson = JSON.parse(decodeURIComponent(qParam));
                                // Add _scope property if scope exists in URL path
                                if (scopeParam) {
                                  parsedJson._scope = scopeParam;
                                }
                                const modifiedJsonString = JSON.stringify(parsedJson);
                                const encodedQParam = encodeURIComponent(modifiedJsonString);
                                criteriaHtml = `<span class="json-link" onclick="showJsonPopup('${encodedQParam}')" title="Click to view the criteria">📄 Criteria</span>`;
                              } catch (e) {
                                // Not valid JSON, show as text
                                criteriaHtml = qParam.length > 30 ? qParam.substring(0, 30) + '...' : qParam;
                              }
                            }
                          } catch (e) {
                            // URL parsing failed
                          }
                        }
                        
                        return `
                    <tr>
                        <td><code>${testName}</code></td>
                        <td>${description}</td>
                        <td>${totalItemsInfo?.is_mismatch ? `<span class="negative">${totalItemsInfo.baseline_total} → ${totalItemsInfo.current_total} (${totalItemsInfo.difference >= 0 ? '+' : ''}${totalItemsInfo.difference})</span>` : `<span class="positive">✓ Match: ${totalItemsInfo?.baseline_total ?? '?'}</span>`}</td>
                        <td>${resultCountDiff?.is_mismatch ? `<span class="negative">${resultCountDiff.baseline_count} → ${resultCountDiff.current_count}</span>` : `<span class="positive">✓ Match: ${resultCountDiff?.baseline_count ?? '?'}</span>`}</td>
                        <td>Disabled</td>
                        <td>Disabled</td>
                        <!-- TODO: go back to these two once we start populating the columns again.
                        <td>${resultSetDiff ? `<span class="negative">Missing: ${resultSetDiff.missing_count}, Extra: ${resultSetDiff.extra_count}</span>` : '<span class="positive">✓ Match</span>'}</td>
                        <td>${orderingDiff ? `<span class="negative">${orderingDiff.items_moved} out of ${orderingDiff.overlapping_items_count} moved</span>` : (resultCountDiff ? '<span class="neutral">N/A</span>' : '<span class="positive">✓ Match</span>')}</td>
                        -->
                        <td>${criteriaHtml}</td>
                    </tr>
                    `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
    </div>
    ` : ''}
    
    <div class="section" id="visualizations">
        <h2>📊 Performance Visualizations</h2>
        <!-- COMMENTED OUT: Chronological chart section for performance -->
        <!--
        <div style="margin-bottom: 40px;" id="chronological-chart">
            <h3>🕒 Chronological Response Times: Baseline vs Current</h3>
            <p><small><strong>Blue:</strong> Baseline Performance | <strong>Red:</strong> Current Performance | <em>Tests in execution order (left to right = chronological)</em></small></p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 15px; border: 1px solid #dee2e6;">
                <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
                    <div>
                        <label for="samplingInterval" style="font-weight: bold; margin-right: 8px;">Sample Interval:</label>
                        <select id="samplingInterval" style="padding: 4px 8px; border: 1px solid #ccc; border-radius: 3px;">
                            <option value="1">Every test (${Math.max(baselineResults.length, currentResults.length).toLocaleString()} points)</option>
                            <option value="10">Every 10th test</option>
                            <option value="25">Every 25th test</option>
                            <option value="50" selected>Every 50th test</option>
                            <option value="100">Every 100th test</option>
                            <option value="250">Every 250th test</option>
                            <option value="500">Every 500th test</option>
                            <option value="1000">Every 1000th test</option>
                        </select>
                    </div>
                    <div>
                        <label for="dateRange" style="font-weight: bold; margin-right: 8px;">Range:</label>
                        <select id="dateRange" style="padding: 4px 8px; border: 1px solid #ccc; border-radius: 3px;">
                            <option value="all" selected>All tests</option>
                            <option value="first25">First 25%</option>
                            <option value="middle50">Middle 50%</option>
                            <option value="last25">Last 25%</option>
                        </select>
                    </div>
                    <button id="updateChart" style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">Update Chart</button>
                    <button id="resetChart" style="padding: 6px 12px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Reset</button>
                    <div id="chartStatus" style="font-style: italic; color: #667;"></div>
                </div>
            </div>
            <div style="background: #e7f3ff; padding: 12px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid #007bff;">
                <p style="margin: 0; font-size: 14px;"><strong>📊 Chart Data Policy:</strong> Only tests that <em>passed</em> in both baseline and current runs are included in performance charts.</p>
                <p style="margin: 8px 0 0 0; font-size: 13px"><strong>Baseline PASS tests:</strong> ${baselineResults.filter(t => t.status === 'PASS').length.toLocaleString()} | <strong>Current PASS tests:</strong> ${currentResults.filter(t => t.status === 'PASS').length.toLocaleString()} | <strong>Available to chart:</strong> <span id="chartDataCount">Calculating...</span></p>
            </div>
            <div style="width: 100%; height: 400px; position: relative;">
                <canvas id="chronologicalChart"></canvas>
            </div>
        </div>
        -->
        <!-- COMMENTED OUT: Chart sections for performance -->
        <!--
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
            <div id="percentile-chart">
                <h3>📊 Performance Percentiles: Baseline vs Current</h3>
                <p><small><strong>Blue:</strong> Baseline | <strong>Red:</strong> Current | <em>Higher bars = slower performance</em></small></p>
                <canvas id="percentileChart" width="400" height="200"></canvas>
            </div>
            <div id="provider-chart">
                <h3>🎯 Provider Performance Changes</h3>
                <p><small><strong>Quadrants:</strong> 🟢 Faster+Reliable | 🟡 Slower+Reliable | 🔵 Faster+Unreliable | 🔴 Slower+Unreliable</small></p>
                <canvas id="providerChart" width="400" height="200"></canvas>
            </div>
        </div>
        <div style="margin-bottom: 30px;" id="size-chart">
            <h3>📏 Response Size Impact Analysis</h3>
            <p><small><strong>Shows:</strong> How response size correlates with performance degradation | <em>Higher = worse impact</em></small></p>
            <canvas id="sizeChart" height="85"></canvas>
        </div>
        -->
    </div>
    ${detailed_performance && !detailed_performance.error ? `
    <div class="section" id="performance-analysis">
        <h2>📊 Detailed Performance Analysis</h2>
        <h3 id="request-counts">Request Counts</h3>
        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-value">${detailed_performance.sample_sizes.baseline.toLocaleString()}</div>
                <div>Baseline Samples</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${detailed_performance.sample_sizes.current.toLocaleString()}</div>
                <div>Current Samples</div>
            </div>
        </div>
        <h3 id="performance-percentiles">Performance Percentiles</h3>
        <table>
            <thead>
                <tr>
                    <th>Percentile</th>
                    <th>Baseline (ms)</th>
                    <th>Current (ms)</th>
                    <th>Change (ms)</th>
                    <th>Relative Change (%)</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(detailed_performance.percentiles).map(([percentile, data]) => `
                    <tr>
                        <td>${percentile}</td>
                        <td>${data.baseline}</td>
                        <td>${data.current}</td>
                        <td class="${data.change <= 0 ? 'positive' : 'negative'}">${data.change >= 0 ? '+' : ''}${data.change}</td>
                        <td class="${data.relative_change <= 0 ? 'positive' : 'negative'}">${data.relative_change >= 0 ? '+' : ''}${data.relative_change}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <h3 id="statistical-metrics">Statistical Metrics</h3>
        <table>
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Baseline</th>
                    <th>Current</th>
                    <th>Change</th>
                    <th>Relative Change (%)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Mean</td>
                    <td>${detailed_performance.statistical_metrics.mean.baseline}</td>
                    <td>${detailed_performance.statistical_metrics.mean.current}</td>
                    <td class="${detailed_performance.statistical_metrics.mean.change <= 0 ? 'positive' : 'negative'}">${detailed_performance.statistical_metrics.mean.change >= 0 ? '+' : ''}${detailed_performance.statistical_metrics.mean.change}</td>
                    <td class="${detailed_performance.statistical_metrics.mean.relative_change <= 0 ? 'positive' : 'negative'}">${detailed_performance.statistical_metrics.mean.relative_change >= 0 ? '+' : ''}${detailed_performance.statistical_metrics.mean.relative_change}%</td>
                </tr>
                <tr>
                    <td>Standard Deviation</td>
                    <td>${detailed_performance.statistical_metrics.std_deviation.baseline}</td>
                    <td>${detailed_performance.statistical_metrics.std_deviation.current}</td>
                    <td class="${detailed_performance.statistical_metrics.std_deviation.change <= 0 ? 'positive' : 'negative'}">${detailed_performance.statistical_metrics.std_deviation.change >= 0 ? '+' : ''}${detailed_performance.statistical_metrics.std_deviation.change}</td>
                    <td>-</td>
                </tr>
                <tr>
                    <td>Coefficient of Variation</td>
                    <td>${detailed_performance.statistical_metrics.coefficient_of_variation.baseline}</td>
                    <td>${detailed_performance.statistical_metrics.coefficient_of_variation.current}</td>
                    <td class="${detailed_performance.statistical_metrics.coefficient_of_variation.change <= 0 ? 'positive' : 'negative'}">${detailed_performance.statistical_metrics.coefficient_of_variation.change >= 0 ? '+' : ''}${detailed_performance.statistical_metrics.coefficient_of_variation.change}</td>
                    <td>-</td>
                </tr>
            </tbody>
        </table>
        ${provider_analysis && provider_analysis.length > 0 ? `
        <h3 id="provider-analysis">🏢 Provider Analysis</h3>
        <table>
            <thead>
                <tr>
                    <th>Provider ID</th>
                    <th>Test Count Change</th>
                    <th>Pass Rate Change</th>
                    <th>Avg Duration Change</th>
                    <th>Relative Performance Change</th>
                </tr>
            </thead>
            <tbody>
                ${provider_analysis.map(provider => {
                  const baselinePassRate = parseFloat(provider.pass_rate.baseline);
                  const currentPassRate = parseFloat(provider.pass_rate.current);
                  const passRateChange = (currentPassRate - baselinePassRate).toFixed(1);
                  return `
                    <tr>
                        <td>${provider.provider_id}</td>
                        <td>${provider.test_count.baseline} → ${provider.test_count.current} (${provider.test_count.change >= 0 ? '+' : ''}${provider.test_count.change})</td>
                        <td class="${passRateChange >= 0 ? 'positive' : 'negative'}">${provider.pass_rate.baseline}% → ${provider.pass_rate.current}% (${passRateChange >= 0 ? '+' : ''}${passRateChange}%)</td>
                        <td class="${provider.avg_duration.change <= 0 ? 'positive' : 'negative'}">${provider.avg_duration.baseline}ms → ${provider.avg_duration.current}ms (${provider.avg_duration.change >= 0 ? '+' : ''}${provider.avg_duration.change}ms)</td>
                        <td class="${provider.avg_duration.relative_change <= 0 ? 'positive' : 'negative'}">${provider.avg_duration.relative_change >= 0 ? '+' : ''}${provider.avg_duration.relative_change}%</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
        ${response_size_analysis ? `
        <h3 id="response-size-analysis">Response Size vs Performance Analysis</h3>
        <table>
            <thead>
                <tr>
                    <th>Size Category</th>
                    <th>Sample Count (B→C)</th>
                    <th>Avg Duration (B→C)</th>
                    <th>Duration Change</th>
                    <th>Avg Size Change</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(response_size_analysis).map(([category, data]) => `
                    <tr>
                        <td style="text-transform: capitalize;">${category}</td>
                        <td>${data.baseline.count} → ${data.current.count}</td>
                        <td>${data.baseline.avg_duration}ms → ${data.current.avg_duration}ms</td>
                        <td class="${data.duration_change <= 0 ? 'positive' : 'negative'}">${data.duration_change >= 0 ? '+' : ''}${data.duration_change}ms</td>
                        <td class="neutral">${data.size_change >= 0 ? '+' : ''}${data.size_change.toLocaleString()} bytes</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <p><small><strong>Size Categories:</strong> Tiny (&lt;1KB), Small (&lt;10KB), Medium (&lt;100KB), Large (≥100KB)</small></p>
        ` : ''}
        ` : ''}
    </div>
    ` : ''}
    ${slowest_baseline_analysis && slowest_baseline_analysis.length > 0 ? `
    <div class="section" id="slowest-100">
        <h2>🐌 Slowest 100 Baseline and Current Tests Analysis</h2>
        <h3 id="slowest-baseline">Slowest 100 Baseline Tests Analysis</h3>
        <p>This table shows the 100 slowest tests from the baseline run and how they performed in the current test.</p>
        <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; display: flex; align-items: center; gap: 15px;">
            <label for="baselinePageSize" style="font-weight: bold;">Show:</label>
            <select id="baselinePageSize" onchange="updateBaselinePagination()" style="padding: 4px 8px; border: 1px solid #ccc; border-radius: 3px;">
                <option value="10">10 per page</option>
                <option value="20" selected>20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
            </select>
            <div id="baselinePaginationInfo" style="font-style: italic; color: #667;"></div>
            <div id="baselinePaginationControls" style="margin-left: auto;"></div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Baseline Duration</th>
                    <th>Current Duration</th>
                    <th>Current Status</th>
                    <th>Duration Change</th>
                    <th>Relative Change</th>
                </tr>
            </thead>
            <tbody id="baselineTableBody">
                ${slowest_baseline_analysis.map((test, index) => {
                  const durationChange = test.duration_change;
                  const relativeChange = test.relative_change;
                  const isImproved = durationChange !== null && durationChange < 0;
                  const isRegressed = durationChange !== null && durationChange > 0;
                  const isMissing = test.current_status === 'MISSING*';
                  
                  const baselineLink = test.baseline_url 
                    ? `<a href="${test.baseline_url}" target="_blank" title="${(test.baseline_description || '').replace(/"/g, '&quot;')}">${test.baseline_duration}ms</a>`
                    : `<span title="${(test.baseline_description || '').replace(/"/g, '&quot;')}">${test.baseline_duration}ms</span>`;
                  
                  const currentLink = test.current_duration !== null && test.current_url
                    ? `<a href="${test.current_url}" target="_blank" title="${(test.current_description || '').replace(/"/g, '&quot;')}">${test.current_duration}ms</a>`
                    : test.current_duration !== null 
                      ? `<span title="${(test.current_description || '').replace(/"/g, '&quot;')}">${test.current_duration}ms</span>`
                      : 'N/A';
                  
                  return `
                    <tr class="baseline-table-row ${isMissing ? 'missing-test' : isImproved ? 'improvement' : isRegressed ? 'regression' : ''}" data-index="${index}" style="display: none;">
                        <td title="${test.test_name}" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${test.test_name}</td>
                        <td>${baselineLink}</td>
                        <td>${currentLink}</td>
                        <td class="${test.current_status === 'PASS' ? 'positive' : test.current_status === 'MISSING*' ? 'neutral' : 'negative'}">${test.current_status}</td>
                        <td class="${isImproved ? 'positive' : isRegressed ? 'negative' : 'neutral'}">${durationChange !== null ? (durationChange >= 0 ? '+' : '') + durationChange + 'ms' : 'N/A'}</td>
                        <td class="${isImproved ? 'positive' : isRegressed ? 'negative' : 'neutral'}">${relativeChange !== null ? (relativeChange >= 0 ? '+' : '') + relativeChange.toFixed(1) + '%' : 'N/A'}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
        <p style="margin-top: 15px; padding: 10px; border-radius: 5px; font-size: 13px;">
            <strong>* MISSING:</strong> Unable to find the associated response in the test's results. This is not expected so long as the responses have unique IDs (added in Dec 2025) and the tests being compared used the same test configurations. There is fallback logic but it has known flaws and can even associate the wrong two responses.
        </p>
    </div>
    ` : ''}
    ${slowest_current_analysis && slowest_current_analysis.length > 0 ? `
    <div class="section">
        <h3 id="slowest-current">Slowest 100 Current Tests Analysis</h3>
        <p>This table shows the 100 slowest tests from the current run and how they performed in the baseline test.</p>
        <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; display: flex; align-items: center; gap: 15px;">
            <label for="currentPageSize" style="font-weight: bold;">Show:</label>
            <select id="currentPageSize" onchange="updateCurrentPagination()" style="padding: 4px 8px; border: 1px solid #ccc; border-radius: 3px;">
                <option value="10">10 per page</option>
                <option value="20" selected>20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
            </select>
            <div id="currentPaginationInfo" style="font-style: italic; color: #667;"></div>
            <div id="currentPaginationControls" style="margin-left: auto;"></div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Current Duration</th>
                    <th>Baseline Duration</th>
                    <th>Baseline Status</th>
                    <th>Duration Change</th>
                    <th>Relative Change</th>
                </tr>
            </thead>
            <tbody id="currentTableBody">
                ${slowest_current_analysis.map((test, index) => {
                  const durationChange = test.duration_change;
                  const relativeChange = test.relative_change;
                  const isImproved = durationChange !== null && durationChange < 0;
                  const isRegressed = durationChange !== null && durationChange > 0;
                  const isMissing = test.baseline_status === 'MISSING*';
                  
                  const currentLink = test.current_url 
                    ? `<a href="${test.current_url}" target="_blank" title="${(test.current_description || '').replace(/"/g, '&quot;')}">${test.current_duration}ms</a>`
                    : `<span title="${(test.current_description || '').replace(/"/g, '&quot;')}">${test.current_duration}ms</span>`;
                  
                  const baselineLink = test.baseline_duration !== null && test.baseline_url
                    ? `<a href="${test.baseline_url}" target="_blank" title="${(test.baseline_description || '').replace(/"/g, '&quot;')}">${test.baseline_duration}ms</a>`
                    : test.baseline_duration !== null
                      ? `<span title="${(test.baseline_description || '').replace(/"/g, '&quot;')}">${test.baseline_duration}ms</span>`
                      : 'N/A';
                  
                  return `
                    <tr class="current-table-row ${isMissing ? 'missing-test' : isRegressed ? 'regression' : isImproved ? 'improvement' : ''}" data-index="${index}" style="display: none;">
                        <td title="${test.test_name}" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${test.test_name}</td>
                        <td>${currentLink}</td>
                        <td>${baselineLink}</td>
                        <td class="${test.baseline_status === 'PASS' ? 'positive' : test.baseline_status === 'MISSING*' ? 'neutral' : 'negative'}">${test.baseline_status}</td>
                        <td class="${isRegressed ? 'negative' : isImproved ? 'positive' : 'neutral'}">${durationChange !== null ? (durationChange >= 0 ? '+' : '') + durationChange + 'ms' : 'N/A'}</td>
                        <td class="${isRegressed ? 'negative' : isImproved ? 'positive' : 'neutral'}">${relativeChange !== null ? (relativeChange >= 0 ? '+' : '') + relativeChange.toFixed(1) + '%' : 'N/A'}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
        <p style="margin-top: 15px; padding: 10px; background: border-radius: 5px; font-size: 13px;">
            <strong>* MISSING:</strong> Unable to find the associated response in the test's results. This is not expected so long as the responses have unique IDs (added in Dec 2025) and the tests being compared used the same test configurations. There is fallback logic but it has known flaws and can even associate the wrong two responses.
        </p>
    </div>
    ` : ''}
    <div class="section" id="regressions-and-improvements">
        <h2>Regressions and Improvements</h2>
        <h3 id="overview">Overview</h3>
        <div class="summary-grid">
            <div class="metric-card regression">
                <div class="metric-value">${test_differences.regressions.length}</div>
                <div>🔴 Regressions</div>
            </div>
            <div class="metric-card improvement">
                <div class="metric-value">${test_differences.improvements.length}</div>
                <div>🟢 Improvements</div>
            </div>
            <div class="metric-card new-test">
                <div class="metric-value">${test_differences.new_tests.length}</div>
                <div>🆕 New Tests</div>
            </div>
            <div class="metric-card missing-test">
                <div class="metric-value">${test_differences.missing_tests.length}</div>
                <div>❌ Missing Tests</div>
            </div>
        </div>
    </div>
    ${test_differences.regressions.length > 0 ? `
    <div class="section" id="regressions">
        <h3>🔴 Regressions</h3>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Endpoint Type</th>
                    <th>Baseline Status</th>
                    <th>Current Status</th>
                    <th>Duration Change</th>
                    <th>Error</th>
                </tr>
            </thead>
            <tbody>
                ${test_differences.regressions.map(reg => `
                    <tr class="regression">
                        <td>${reg.test_name}</td>
                        <td>${reg.endpoint_type}</td>
                        <td>${reg.baseline_status}</td>
                        <td>${reg.current_status}</td>
                        <td>${reg.duration_change >= 0 ? '+' : ''}${reg.duration_change}ms</td>
                        <td>${reg.current_error || ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}
    ${test_differences.improvements.length > 0 ? `
    <div class="section" id="improvements">
        <h3>🟢 Improvements</h3>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Endpoint Type</th>
                    <th>Baseline Status</th>
                    <th>Current Status</th>
                    <th>Duration Change</th>
                </tr>
            </thead>
            <tbody>
                ${test_differences.improvements.map(imp => `
                    <tr class="improvement">
                        <td>${imp.test_name}</td>
                        <td>${imp.endpoint_type}</td>
                        <td>${imp.baseline_status}</td>
                        <td>${imp.current_status}</td>
                        <td>${imp.duration_change >= 0 ? '+' : ''}${imp.duration_change}ms</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}
    
    <!-- JSON Popup Modal -->
    <div id="jsonPopup" class="json-popup" onclick="closeJsonPopup(event)">
        <div class="json-popup-content" onclick="event.stopPropagation()">
            <div class="json-popup-header">
                <h3>Search Criteria</h3>
                <div class="json-popup-buttons">
                    <button class="json-popup-copy" onclick="copyJsonAsDisplayed(event)" title="Copy JSON as displayed">Copy JSON</button>
                    <button class="json-popup-copy" onclick="copyJsonAsEncoded(event)" title="Copy JSON as URL-encoded">Copy URL-Encoded</button>
                    <button class="json-popup-close" onclick="closeJsonPopup()">Close</button>
                </div>
            </div>
            <div id="jsonContent" class="json-content"></div>
        </div>
    </div>
    
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // JSON Popup Functions
        function showJsonPopup(jsonString) {
            try {
                const parsed = JSON.parse(decodeURIComponent(jsonString));
                const formatted = JSON.stringify(parsed, null, 2);
                document.getElementById('jsonContent').textContent = formatted;
                document.getElementById('jsonPopup').style.display = 'block';
                
                // Store the original and formatted JSON for copy functions
                window.currentJsonData = {
                    formatted: formatted,
                    encoded: jsonString
                };
            } catch (e) {
                document.getElementById('jsonContent').textContent = 'Invalid JSON: ' + decodeURIComponent(jsonString);
                document.getElementById('jsonPopup').style.display = 'block';
                
                // Store error data for copy functions
                window.currentJsonData = {
                    formatted: 'Invalid JSON: ' + decodeURIComponent(jsonString),
                    encoded: jsonString
                };
            }
        }
        
        function copyToClipboard(event, dataSource, dataKey, buttonName) {
            const data = window[dataSource];
            if (data && data[dataKey]) {
                navigator.clipboard.writeText(data[dataKey]).then(function() {
                    // Temporarily change button text to show success
                    const button = event ? event.target : document.querySelector('button[onclick*="' + buttonName + '"]');
                    const originalText = button.textContent;
                    button.textContent = 'Copied!';
                    button.style.background = '#2196F3';
                    setTimeout(function() {
                        button.textContent = originalText;
                        button.style.background = '#4CAF50';
                    }, 1000);
                }).catch(function(err) {
                    console.error('Failed to copy: ', err);
                    alert('Failed to copy to clipboard');
                });
            }
        }
        
        function copyJsonAsDisplayed(event) {
            copyToClipboard(event, 'currentJsonData', 'formatted', 'copyJsonAsDisplayed');
        }
        
        function copyJsonAsEncoded(event) {
            copyToClipboard(event, 'currentJsonData', 'encoded', 'copyJsonAsEncoded');
        }
        
        function closeJsonPopup(event) {
            if (!event || event.target === document.getElementById('jsonPopup')) {
                document.getElementById('jsonPopup').style.display = 'none';
            }
        }
        
        // Make functions globally available
        window.showJsonPopup = showJsonPopup;
        window.copyJsonAsDisplayed = copyJsonAsDisplayed;
        window.copyJsonAsEncoded = copyJsonAsEncoded;
        window.closeJsonPopup = closeJsonPopup;
    });
    </script>
    
    <!-- COMMENTED OUT: All Chart.js JavaScript for performance (~200KB) -->
    <!--
    <script>
    // Chart.js configuration and rendering
    document.addEventListener('DOMContentLoaded', function() {
        // Chronological Response Time Line Chart with Controls
        const chronologicalData = ${JSON.stringify(this.generateChronologicalResponseTimeData(baselineResults, currentResults))};
        let chronologicalChart = null;
        
        function updateChronologicalChart(interval = 50, range = 'all') {
            const fullData = chronologicalData.fullData;
            let filteredData = fullData;
            
            // Apply range filter
            if (range === 'first25') {
                filteredData = fullData.slice(0, Math.floor(fullData.length * 0.25));
            } else if (range === 'middle50') {
                const start = Math.floor(fullData.length * 0.25);
                const end = Math.floor(fullData.length * 0.75);
                filteredData = fullData.slice(start, end);
            } else if (range === 'last25') {
                filteredData = fullData.slice(Math.floor(fullData.length * 0.75));
            }
            
            // Apply sampling
            const sampledData = interval > 1 ? 
                filteredData.filter((_, index) => index % interval === 0) : 
                filteredData;
            
            const chartData = {
                labels: sampledData.map((_, index) => index),
                datasets: [
                    {
                        label: 'Baseline Performance',
                        data: sampledData.map(test => test.baseline),
                        borderColor: 'rgba(54, 162, 235, 0.8)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2,
                        tension: 0.1
                    },
                    {
                        label: 'Current Performance',
                        data: sampledData.map(test => test.current),
                        borderColor: 'rgba(255, 99, 132, 0.8)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2,
                        tension: 0.1
                    }
                ]
            };
            
            // Generate time-based x-axis labels
            const timeLabels = {};
            const labelCount = 8; // Number of time labels to show
            for (let i = 0; i < sampledData.length; i += Math.floor(sampledData.length / labelCount)) {
                if (sampledData[i] && sampledData[i].timestamp) {
                    timeLabels[i] = new Date(sampledData[i].timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                }
            }
            
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: 10 },
                plugins: {
                    title: {
                        display: true,
                        text: 'Chronological Performance (' + sampledData.length.toLocaleString() + ' of ' + fullData.length.toLocaleString() + ' tests shown)',
                        font: { size: 14, weight: 'bold' }
                    },
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true, padding: 20 }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                const index = context[0].dataIndex;
                                const test = sampledData[index];
                                return 'Test: ' + (test ? test.testName.substring(0, 30) + '...' : 'N/A');
                            },
                            label: function(context) {
                                const isBaseline = context.datasetIndex === 0;
                                const label = isBaseline ? 'Baseline' : 'Current';
                                const value = context.parsed.y;
                                return label + ': ' + value + 'ms';
                            },
                            afterBody: function(context) {
                                const index = context[0].dataIndex;
                                const test = sampledData[index];
                                if (test) {
                                    const change = test.current - test.baseline;
                                    const pctChange = test.baseline > 0 ? ((change / test.baseline) * 100).toFixed(1) : 0;
                                    const timeLabel = test.timestamp ? new Date(test.timestamp).toLocaleTimeString() : 'N/A';
                                    return [
                                        'Change: ' + (change >= 0 ? '+' : '') + change + 'ms (' + pctChange + '%)',
                                        'Time: ' + timeLabel
                                    ];
                                }
                                return [];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Test Execution Order (Chronological)' },
                        grid: { display: false },
                        ticks: {
                            maxTicksLimit: 10,
                            callback: function(value, index) {
                                // Use time labels when available
                                if (timeLabels[value]) {
                                    return timeLabels[value];
                                }
                                // Fallback to percentage
                                const total = sampledData.length;
                                if (index === 0) return 'Start';
                                if (value === total - 1) return 'End';
                                return Math.round((value / total) * 100) + '%';
                            }
                        }
                    },
                    y: {
                        title: { display: true, text: 'Response Time (ms)' },
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        beginAtZero: true
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            };
            
            if (chronologicalChart) {
                chronologicalChart.data = chartData;
                chronologicalChart.options = options;
                chronologicalChart.update();
            } else {
                const chronologicalCtx = document.getElementById('chronologicalChart').getContext('2d');
                chronologicalChart = new Chart(chronologicalCtx, {
                    type: 'line',
                    data: chartData,
                    options: options
                });
            }
            
            // Update status
            const statusElement = document.getElementById('chartStatus');
            statusElement.textContent = sampledData.length.toLocaleString() + ' points displayed (interval: ' + interval + ', range: ' + range + ')';
            
            // Update chart data count in the info box
            const chartDataCount = document.getElementById('chartDataCount');
            if (chartDataCount) {
                const totalDataPoints = chronologicalData.fullData ? chronologicalData.fullData.length : 0;
                chartDataCount.textContent = totalDataPoints.toLocaleString() + ' matching tests';
                chartDataCount.style.fontWeight = totalDataPoints === 0 ? 'bold' : 'normal';
                chartDataCount.style.color = totalDataPoints === 0 ? '#dc3545' : '#28a745';
            }
        }
        
        // Initialize with default settings
        if (chronologicalData && chronologicalData.fullData) {
            updateChronologicalChart(50, 'all');
            
            // Add event listeners
            document.getElementById('updateChart').addEventListener('click', function() {
                const interval = parseInt(document.getElementById('samplingInterval').value);
                const range = document.getElementById('dateRange').value;
                updateChronologicalChart(interval, range);
            });
            
            document.getElementById('resetChart').addEventListener('click', function() {
                document.getElementById('samplingInterval').value = '50';
                document.getElementById('dateRange').value = 'all';
                updateChronologicalChart(50, 'all');
            });
        }
        
        // Percentile Waterfall Chart
        ${detailed_performance && !detailed_performance.error ? `
        const percentileData = ${JSON.stringify(this.generatePercentileChartData(detailed_performance))};
        if (percentileData) {
            const percentileCtx = document.getElementById('percentileChart').getContext('2d');
            new Chart(percentileCtx, {
                type: 'bar',
                data: percentileData,
                options: {
                    responsive: true,
                    plugins: {
                        title: { 
                            display: true, 
                            text: 'Performance Distribution Comparison',
                            font: { size: 14, weight: 'bold' }
                        },
                        legend: { 
                            position: 'top',
                            labels: { usePointStyle: true, padding: 15 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const isBaseline = context.datasetIndex === 0;
                                    const label = isBaseline ? 'Baseline' : 'Current';
                                    return \`\${label}: \${context.parsed.y}ms\`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            title: { display: true, text: 'Response Time (ms)' },
                            grid: { color: 'rgba(0,0,0,0.1)' }
                        },
                        x: { 
                            title: { display: true, text: 'Performance Percentile' },
                            grid: { display: false }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }` : ''}
        
        // Provider Performance Bubble Chart  
        ${provider_analysis && provider_analysis.length > 0 ? `
        const providerData = ${JSON.stringify(this.generateProviderChartData(provider_analysis))};
        if (providerData) {
            const providerCtx = document.getElementById('providerChart').getContext('2d');
            new Chart(providerCtx, {
                type: 'bubble',
                data: providerData,
                options: {
                    responsive: true,
                    plugins: {
                        title: { 
                            display: true, 
                            text: 'Provider Performance Change Analysis',
                            font: { size: 14, weight: 'bold' }
                        },
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    return \`Provider: \${context[0].raw.provider}\`;
                                },
                                label: function(context) {
                                    const point = context.raw;
                                    const quadrant = point.x <= 0 && point.y >= 0 ? '🟢 Faster + More Reliable' :
                                                   point.x <= 0 && point.y < 0 ? '🔵 Faster + Less Reliable' :
                                                   point.x > 0 && point.y >= 0 ? '🟡 Slower + More Reliable' :
                                                   '🔴 Slower + Less Reliable';
                                    return [
                                        \`Duration Change: \${point.x > 0 ? '+' : ''}\${point.x}ms\`,
                                        \`Pass Rate Change: \${point.y > 0 ? '+' : ''}\${point.y.toFixed(1)}%\`,
                                        \`Category: \${quadrant}\`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            title: { display: true, text: 'Duration Change: Baseline → Current (ms)' },
                            grid: { color: 'rgba(0,0,0,0.1)' },
                            // Add reference line at x=0
                            ticks: {
                                callback: function(value) {
                                    return value === 0 ? '0 (no change)' : value;
                                }
                            }
                        },
                        y: { 
                            title: { display: true, text: 'Pass Rate Change: Baseline → Current (%)' },
                            grid: { color: 'rgba(0,0,0,0.1)' },
                            // Add reference line at y=0
                            ticks: {
                                callback: function(value) {
                                    return value === 0 ? '0 (no change)' : value + '%';
                                }
                            }
                        }
                    }
                }
            });
        }` : ''}
        
        // Response Size vs Performance Scatter
        ${response_size_analysis ? `
        const sizeData = ${JSON.stringify(this.generateSizePerformanceChartData(response_size_analysis))};
        if (sizeData) {
            const sizeCtx = document.getElementById('sizeChart').getContext('2d');
            new Chart(sizeCtx, {
                type: 'scatter',
                data: sizeData,
                options: {
                    responsive: true,
                    plugins: {
                        title: { 
                            display: true, 
                            text: 'Response Size vs Performance Degradation',
                            font: { size: 14, weight: 'bold' }
                        },
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    const point = context[0].raw;
                                    return \`\${point.category.charAt(0).toUpperCase() + point.category.slice(1)} Responses\`;
                                },
                                label: function(context) {
                                    const point = context.raw;
                                    const impact = point.y > 0 ? 'slower' : 'faster';
                                    return [
                                        \`Avg Size: \${point.x.toLocaleString()} bytes\`,
                                        \`Performance Impact: \${Math.abs(point.y)}ms \${impact}\`,
                                        \`Category: \${point.category} (<\${point.category === 'tiny' ? '1KB' : point.category === 'small' ? '10KB' : point.category === 'medium' ? '100KB' : '100KB+'})\`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            title: { display: true, text: 'Average Response Size (bytes, log scale)' },
                            type: 'logarithmic',
                            grid: { color: 'rgba(0,0,0,0.1)' },
                            ticks: {
                                callback: function(value) {
                                    if (value >= 1000) return (value/1000).toFixed(0) + 'KB';
                                    return value + 'B';
                                }
                            }
                        },
                        y: { 
                            title: { display: true, text: 'Performance Impact: Baseline → Current (ms)' },
                            grid: { color: 'rgba(0,0,0,0.1)' },
                            ticks: {
                                callback: function(value) {
                                    const rounded = Math.round(value * 100) / 100;
                                    return rounded === 0 ? '0 (no change)' : (rounded > 0 ? '+' : '') + rounded + 'ms';
                                }
                            }
                        }
                    }
                }
            });
        }` : ''}
        
        // Pagination for Slowest Baseline Tests
        let baselineCurrentPage = 1;
        let baselinePageSize = 20;
        
        window.updateBaselinePagination = function() {
            baselinePageSize = parseInt(document.getElementById('baselinePageSize').value);
            baselineCurrentPage = 1;
            showBaselinePage();
        }
        
        function showBaselinePage() {
            const rows = document.querySelectorAll('.baseline-table-row');
            const totalRows = rows.length;
            const totalPages = Math.ceil(totalRows / baselinePageSize);
            const startIndex = (baselineCurrentPage - 1) * baselinePageSize;
            const endIndex = Math.min(startIndex + baselinePageSize, totalRows);
            
            // Hide all rows first
            rows.forEach(row => row.style.display = 'none');
            
            // Show rows for current page
            for (let i = startIndex; i < endIndex; i++) {
                if (rows[i]) rows[i].style.display = '';
            }
            
            // Update pagination info
            document.getElementById('baselinePaginationInfo').textContent = 
                \`Showing \${startIndex + 1}-\${endIndex} of \${totalRows} tests\`;
            
            // Update pagination controls
            const controls = document.getElementById('baselinePaginationControls');
            controls.innerHTML = '';
            
            if (totalPages > 1) {
                // Previous button
                const prevBtn = document.createElement('button');
                prevBtn.textContent = '← Previous';
                prevBtn.disabled = baselineCurrentPage === 1;
                prevBtn.onclick = () => { baselineCurrentPage--; showBaselinePage(); };
                prevBtn.style.cssText = 'padding: 5px 10px; margin: 0 2px; border: 1px solid #ccc; border-radius: 3px; cursor: pointer;';
                if (prevBtn.disabled) prevBtn.style.opacity = '0.5';
                controls.appendChild(prevBtn);
                
                // Page numbers
                const startPage = Math.max(1, baselineCurrentPage - 2);
                const endPage = Math.min(totalPages, startPage + 4);
                
                for (let page = startPage; page <= endPage; page++) {
                    const pageBtn = document.createElement('button');
                    pageBtn.textContent = page;
                    pageBtn.onclick = () => { baselineCurrentPage = page; showBaselinePage(); };
                    pageBtn.style.cssText = \`padding: 5px 10px; margin: 0 2px; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; \${page === baselineCurrentPage ? 'background: #007bff; color: white;' : ''}\`;
                    controls.appendChild(pageBtn);
                }
                
                // Next button
                const nextBtn = document.createElement('button');
                nextBtn.textContent = 'Next →';
                nextBtn.disabled = baselineCurrentPage === totalPages;
                nextBtn.onclick = () => { baselineCurrentPage++; showBaselinePage(); };
                nextBtn.style.cssText = 'padding: 5px 10px; margin: 0 2px; border: 1px solid #ccc; border-radius: 3px; cursor: pointer;';
                if (nextBtn.disabled) nextBtn.style.opacity = '0.5';
                controls.appendChild(nextBtn);
            }
        }
        
        // Pagination for Slowest Current Tests
        let currentCurrentPage = 1;
        let currentPageSize = 20;
        
        window.updateCurrentPagination = function() {
            currentPageSize = parseInt(document.getElementById('currentPageSize').value);
            currentCurrentPage = 1;
            showCurrentPage();
        }
        
        function showCurrentPage() {
            const rows = document.querySelectorAll('.current-table-row');
            const totalRows = rows.length;
            const totalPages = Math.ceil(totalRows / currentPageSize);
            const startIndex = (currentCurrentPage - 1) * currentPageSize;
            const endIndex = Math.min(startIndex + currentPageSize, totalRows);
            
            // Hide all rows first
            rows.forEach(row => row.style.display = 'none');
            
            // Show rows for current page
            for (let i = startIndex; i < endIndex; i++) {
                if (rows[i]) rows[i].style.display = '';
            }
            
            // Update pagination info
            document.getElementById('currentPaginationInfo').textContent = 
                \`Showing \${startIndex + 1}-\${endIndex} of \${totalRows} tests\`;
            
            // Update pagination controls
            const controls = document.getElementById('currentPaginationControls');
            controls.innerHTML = '';
            
            if (totalPages > 1) {
                // Previous button
                const prevBtn = document.createElement('button');
                prevBtn.textContent = '← Previous';
                prevBtn.disabled = currentCurrentPage === 1;
                prevBtn.onclick = () => { currentCurrentPage--; showCurrentPage(); };
                prevBtn.style.cssText = 'padding: 5px 10px; margin: 0 2px; border: 1px solid #ccc; border-radius: 3px; cursor: pointer;';
                if (prevBtn.disabled) prevBtn.style.opacity = '0.5';
                controls.appendChild(prevBtn);
                
                // Page numbers
                const startPage = Math.max(1, currentCurrentPage - 2);
                const endPage = Math.min(totalPages, startPage + 4);
                
                for (let page = startPage; page <= endPage; page++) {
                    const pageBtn = document.createElement('button');
                    pageBtn.textContent = page;
                    pageBtn.onclick = () => { currentCurrentPage = page; showCurrentPage(); };
                    pageBtn.style.cssText = \`padding: 5px 10px; margin: 0 2px; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; \${page === currentCurrentPage ? 'background: #007bff; color: white;' : ''}\`;
                    controls.appendChild(pageBtn);
                }
                
                // Next button
                const nextBtn = document.createElement('button');
                nextBtn.textContent = 'Next →';
                nextBtn.disabled = currentCurrentPage === totalPages;
                nextBtn.onclick = () => { currentCurrentPage++; showCurrentPage(); };
                nextBtn.style.cssText = 'padding: 5px 10px; margin: 0 2px; border: 1px solid #ccc; border-radius: 3px; cursor: pointer;';
                if (nextBtn.disabled) nextBtn.style.opacity = '0.5';
                controls.appendChild(nextBtn);
            }
        }
        
        // Initialize pagination for both tables
        if (document.querySelector('.baseline-table-row')) {
            showBaselinePage();
        }
        if (document.querySelector('.current-table-row')) {
            showCurrentPage();
        }
    });
    </script>
    -->
</body>
</html>`;
  }

  /**
   * Generate chart data for chronological response time line chart (execution order)
   */
  generateChronologicalResponseTimeData(baselineResults, currentResults) {
    // Use natural execution order from JSON files (no sorting needed)
    
    // Just get PASS tests with durations - use natural order from JSON
    const baselinePassing = baselineResults.filter(test => 
      test.status === 'PASS' && typeof test.duration_ms === 'number'
    );
    
    const currentPassing = currentResults.filter(test => 
      test.status === 'PASS' && typeof test.duration_ms === 'number'
    );
    
    if (baselinePassing.length === 0 || currentPassing.length === 0) {
      return {
        labels: [],
        datasets: [],
        fullData: [],
        timeLabels: [],
        metadata: { totalTests: 0, note: 'No passing tests with durations' }
      };
    }
    
    // Use the shorter list length for pairing
    const maxLength = Math.min(baselinePassing.length, currentPassing.length);
    
    // Use all data points - modern browsers can handle it
    const chartData = [];
    for (let i = 0; i < maxLength; i++) {
      chartData.push({
        index: i,
        baseline: baselinePassing[i].duration_ms,
        current: currentPassing[i].duration_ms,
        baselineTest: baselinePassing[i].test_name,
        currentTest: currentPassing[i].test_name
      });
    }
    
    return {
      labels: chartData.map(d => d.index),
      datasets: [
        {
          label: 'Baseline Performance',
          data: chartData.map(d => d.baseline),
          borderColor: 'rgba(54, 162, 235, 0.8)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          tension: 0.1
        },
        {
          label: 'Current Performance', 
          data: chartData.map(d => d.current),
          borderColor: 'rgba(255, 99, 132, 0.8)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          tension: 0.1
        }
      ],
      fullData: chartData,
      timeLabels: [], // Simplified - just use execution order
      metadata: {
        totalTests: maxLength,
        sampledTests: chartData.length,
        sampleInterval: 1,
        note: 'All tests paired by execution order'
      }
    };
  }

  /**
   * Analyze performance by test provider
   */
  analyzeByProvider(baselineResults, currentResults) {
    const providerStats = new Map();

    // Initialize provider stats
    const allProviders = new Set();
    for (const test of baselineResults) {
      if (test.provider_id) allProviders.add(test.provider_id);
    }
    for (const test of currentResults) {
      if (test.provider_id) allProviders.add(test.provider_id);
    }

    allProviders.forEach(provider => {
      providerStats.set(provider, {
        provider_id: provider,
        baseline: { total: 0, passed: 0, failed: 0, errors: 0, durations: [] },
        current: { total: 0, passed: 0, failed: 0, errors: 0, durations: [] }
      });
    });

    // Collect baseline stats
    for (const test of baselineResults) {
      if (!test.provider_id) continue;
      const stats = providerStats.get(test.provider_id);
      if (!stats) continue;
      
      stats.baseline.total++;
      if (test.status === 'PASS') {
        stats.baseline.passed++;
        if (typeof test.duration_ms === 'number') {
          stats.baseline.durations.push(test.duration_ms);
        }
      } else if (test.status === 'FAIL') {
        stats.baseline.failed++;
      } else {
        stats.baseline.errors++;
      }
    }

    // Collect current stats
    for (const test of currentResults) {
      if (!test.provider_id) continue;
      const stats = providerStats.get(test.provider_id);
      if (!stats) continue;
      
      stats.current.total++;
      if (test.status === 'PASS') {
        stats.current.passed++;
        if (typeof test.duration_ms === 'number') {
          stats.current.durations.push(test.duration_ms);
        }
      } else if (test.status === 'FAIL') {
        stats.current.failed++;
      } else {
        stats.current.errors++;
      }
    }

    // Calculate metrics for each provider
    const result = [];
    providerStats.forEach(stats => {
      const baselineAvg = stats.baseline.durations.length > 0 ? 
        stats.baseline.durations.reduce((a, b) => a + b, 0) / stats.baseline.durations.length : 0;
      const currentAvg = stats.current.durations.length > 0 ? 
        stats.current.durations.reduce((a, b) => a + b, 0) / stats.current.durations.length : 0;
      
      result.push({
        provider_id: stats.provider_id,
        test_count: {
          baseline: stats.baseline.total,
          current: stats.current.total,
          change: stats.current.total - stats.baseline.total
        },
        pass_rate: {
          baseline: stats.baseline.total > 0 ? (stats.baseline.passed / stats.baseline.total * 100).toFixed(1) : 0,
          current: stats.current.total > 0 ? (stats.current.passed / stats.current.total * 100).toFixed(1) : 0
        },
        avg_duration: {
          baseline: Math.round(baselineAvg * 100) / 100,
          current: Math.round(currentAvg * 100) / 100,
          change: Math.round((currentAvg - baselineAvg) * 100) / 100,
          relative_change: baselineAvg > 0 ? Math.round(((currentAvg - baselineAvg) / baselineAvg) * 1000) / 10 : 0
        }
      });
    });

    return result;
  }

  /**
   * Analyze response size vs performance correlation
   */
  analyzeResponseSizePerformance(baselineResults, currentResults) {
    const analyzeSizePerf = (results) => {
      const sizeRanges = {
        tiny: { threshold: 1000, durations: [], sizes: [] },
        small: { threshold: 10000, durations: [], sizes: [] },
        medium: { threshold: 100000, durations: [], sizes: [] },
        large: { threshold: Infinity, durations: [], sizes: [] }
      };

      results.filter(test => test.status === 'PASS' && test.response_size_bytes && test.duration_ms)
        .forEach(test => {
          const size = test.response_size_bytes;
          const duration = test.duration_ms;
          
          if (size < 1000) {
            sizeRanges.tiny.durations.push(duration);
            sizeRanges.tiny.sizes.push(size);
          } else if (size < 10000) {
            sizeRanges.small.durations.push(duration);
            sizeRanges.small.sizes.push(size);
          } else if (size < 100000) {
            sizeRanges.medium.durations.push(duration);
            sizeRanges.medium.sizes.push(size);
          } else {
            sizeRanges.large.durations.push(duration);
            sizeRanges.large.sizes.push(size);
          }
        });

      const result = {};
      Object.keys(sizeRanges).forEach(range => {
        const durations = sizeRanges[range].durations;
        const sizes = sizeRanges[range].sizes;
        result[range] = {
          count: durations.length,
          avg_duration: durations.length > 0 ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100 : 0,
          avg_size: sizes.length > 0 ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length) : 0
        };
      });
      return result;
    };

    const baselineAnalysis = analyzeSizePerf(baselineResults);
    const currentAnalysis = analyzeSizePerf(currentResults);

    const comparison = {};
    Object.keys(baselineAnalysis).forEach(range => {
      const baseline = baselineAnalysis[range];
      const current = currentAnalysis[range];
      
      comparison[range] = {
        baseline: baseline,
        current: current,
        duration_change: Math.round((current.avg_duration - baseline.avg_duration) * 100) / 100,
        size_change: current.avg_size - baseline.avg_size
      };
    });

    return comparison;
  }

  /**
   * Generate chart data for percentile waterfall visualization
   */
  generatePercentileChartData(detailed_performance) {
    if (!detailed_performance || detailed_performance.error) return null;
    
    const percentiles = Object.keys(detailed_performance.percentiles);
    const baselineData = percentiles.map(p => detailed_performance.percentiles[p].baseline);
    const currentData = percentiles.map(p => detailed_performance.percentiles[p].current);
    const labels = percentiles.map(p => p.replace('p', '') + '%');
    
    return {
      labels,
      datasets: [
        {
          label: 'Baseline Performance',
          data: baselineData,
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        },
        {
          label: 'Current Performance',
          data: currentData,
          backgroundColor: 'rgba(255, 99, 132, 0.8)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2
        }
      ]
    };
  }

  /**
   * Generate chart data for provider performance heat map
   */
  generateProviderChartData(provider_analysis) {
    if (!provider_analysis || provider_analysis.length === 0) return null;
    
    const providers = provider_analysis.map(p => p.provider_id);
    const durationChanges = provider_analysis.map(p => p.avg_duration.change);
    const passRateChanges = provider_analysis.map(p => {
      const baseline = parseFloat(p.pass_rate.baseline);
      const current = parseFloat(p.pass_rate.current);
      return current - baseline;
    });
    
    // Create bubble data: x=duration change, y=pass rate change, bubble size=test count
    const bubbleData = provider_analysis.map(p => ({
      x: p.avg_duration.change,
      y: parseFloat(p.pass_rate.current) - parseFloat(p.pass_rate.baseline),
      r: Math.max(5, Math.min(20, p.test_count.current / 100)), // Scale bubble size
      provider: p.provider_id
    }));
    
    return {
      datasets: [{
        label: 'Provider Changes (Baseline → Current)',
        data: bubbleData,
        backgroundColor: bubbleData.map(point => {
          // Quadrant analysis: x=duration change, y=pass rate change
          if (point.x <= 0 && point.y >= 0) return 'rgba(76, 175, 80, 0.7)';  // Faster + More Reliable (green)
          if (point.x <= 0 && point.y < 0) return 'rgba(33, 150, 243, 0.7)';   // Faster + Less Reliable (blue)
          if (point.x > 0 && point.y >= 0) return 'rgba(255, 193, 7, 0.7)';    // Slower + More Reliable (amber)
          return 'rgba(244, 67, 54, 0.7)';                                     // Slower + Less Reliable (red)
        }),
        borderColor: bubbleData.map(point => {
          if (point.x <= 0 && point.y >= 0) return 'rgba(76, 175, 80, 1)';
          if (point.x <= 0 && point.y < 0) return 'rgba(33, 150, 243, 1)';
          if (point.x > 0 && point.y >= 0) return 'rgba(255, 193, 7, 1)';
          return 'rgba(244, 67, 54, 1)';
        }),
        borderWidth: 2
      }]
    };
  }

  /**
   * Generate chart data for response size vs performance scatter plot
   */
  generateSizePerformanceChartData(response_size_analysis) {
    if (!response_size_analysis) return null;
    
    const categories = ['tiny', 'small', 'medium', 'large'];
    const scatterData = categories.map(category => {
      const data = response_size_analysis[category];
      if (!data) return null;
      
      return {
        x: data.baseline.avg_size,
        y: Math.round((data.current.avg_duration - data.baseline.avg_duration) * 100) / 100,
        r: Math.max(5, Math.min(15, data.current.count / 1000)), // Scale by sample count
        category: category
      };
    }).filter(Boolean);
    
    return {
      datasets: [{
        label: 'Response Categories (Impact vs Size)',
        data: scatterData,
        backgroundColor: scatterData.map(point => {
          switch(point.category) {
            case 'tiny': return 'rgba(76, 175, 80, 0.8)';   // Green for tiny
            case 'small': return 'rgba(33, 150, 243, 0.8)'; // Blue for small
            case 'medium': return 'rgba(255, 193, 7, 0.8)'; // Amber for medium
            case 'large': return 'rgba(244, 67, 54, 0.8)';  // Red for large
            default: return 'rgba(158, 158, 158, 0.8)';
          }
        }),
        borderColor: scatterData.map(point => {
          switch(point.category) {
            case 'tiny': return 'rgba(76, 175, 80, 1)';
            case 'small': return 'rgba(33, 150, 243, 1)';
            case 'medium': return 'rgba(255, 193, 7, 1)';
            case 'large': return 'rgba(244, 67, 54, 1)';
            default: return 'rgba(158, 158, 158, 1)';
          }
        }),
        borderWidth: 2,
        pointRadius: scatterData.map(point => Math.max(8, Math.min(20, point.r)))
      }]
    };
  }
}

// CLI Interface
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  
  const reportsDir = path.join(__dirname, args[0] || 'reports');
  const baselineFile = args[1] || findFileInSubdir(reportsDir, 1, 'json'); // 1 = second-to-last
  const currentFile = args[2] || findFileInSubdir(reportsDir, 0, 'json'); // 0 = last

  // Validate input files exist
  if (!baselineFile) {
    console.error('No baseline report found. Please specify a baseline report file or ensure there are at least 2 test run directories in the reports folder.');
    process.exit(1);
  }
  
  if (!fs.existsSync(baselineFile)) {
    console.error(`Baseline report not found: ${baselineFile}`);
    process.exit(1);
  }

  if (!currentFile) {
    console.error('Current report file must be specified as the second argument.');
    console.error('Usage: node compare-reports.js [reports-dir] [baseline-report.json] <current-report.json> [output-dir]');
    process.exit(1);
  }

  if (!fs.existsSync(currentFile)) {
    console.error(`Current report not found: ${currentFile}`);
    process.exit(1);
  }

  const baselineName = path.dirname(baselineFile).split(path.sep).pop();
  const currentName = path.dirname(currentFile).split(path.sep).pop();
  const outputDir = args[3] || `./comparisons/${baselineName}-vs-${currentName}`;

  try {
    const comparator = new ReportComparator(baselineFile, currentFile, outputDir, "Test Report Comparison");
    await comparator.compareReports();
  } catch (error) {
    console.error('Comparison failed:', error.message);
    process.exit(1);
  }
}

export default ReportComparator;
