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
      summary: this.compareSummaries(baseline.summary, current.summary),
      detailed_performance: this.performDetailedPerformanceAnalysis(baseline.results, current.results),
      test_differences: this.compareTests(baselineTests, currentTests),
      endpoint_analysis: this.analyzeByEndpoint(baselineTests, currentTests),
      provider_analysis: this.analyzeByProvider(baseline.results, current.results),
      response_size_analysis: this.analyzeResponseSizePerformance(baseline.results, current.results)
    };

    await this.generateReports(comparison, baseline, current);
    return comparison;
  }

  /**
   * Create a map of tests keyed by test name for efficient lookup
   */
  createTestMap(results) {
    const map = new Map();
    results.forEach(test => {
      map.set(test.test_name, test);
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
    for (const [testName, currentTest] of currentTests) {
      const baselineTest = baselineTests.get(testName);

      if (!baselineTest) {
        differences.new_tests.push({
          test_name: testName,
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
    for (const [testName, baselineTest] of baselineTests) {
      if (!currentTests.has(testName)) {
        differences.missing_tests.push({
          test_name: testName,
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
    const { summary, test_differences } = comparison;

    console.log('\n=== COMPARISON SUMMARY ===');
    console.log(`Test Count: ${summary.test_count.baseline} → ${summary.test_count.current} (${summary.test_count.difference >= 0 ? '+' : ''}${summary.test_count.difference})`);
    console.log(`Pass Rate: ${summary.pass_rate.baseline}% → ${summary.pass_rate.current}% (${summary.pass_rate.change >= 0 ? '+' : ''}${summary.pass_rate.change}%)`);
    console.log(`Avg Duration: ${summary.performance.avg_duration_baseline}ms → ${summary.performance.avg_duration_current}ms (${summary.performance.duration_change >= 0 ? '+' : ''}${summary.performance.duration_change}ms)`);

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
    const { metadata, summary, test_differences, endpoint_analysis, detailed_performance, provider_analysis, response_size_analysis } = comparison;
    const title = this.comparisonName || "Test Report Comparison";
    
    // Read Chart.js from node_modules for inline inclusion
    const chartJsPath = path.resolve(__dirname, './node_modules/chart.js/dist/chart.umd.min.js');
    const chartJsContent = await fs.promises.readFile(chartJsPath, 'utf8');
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
    <script>${chartJsContent}</script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary-grid { display: grid; grid-tests-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .metric-card { background: white; border: 1px solid #ddd; border-radius: 5px; padding: 15px; }
        .metric-value { font-size: 1.5em; font-weight: bold; }
        .positive { color: green; }
        .negative { color: red; }
        .neutral { color: #666; }
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
    <div class="section">
        <h2>Analysis by Endpoint Type</h2>
        <table>
            <thead>
                <tr>
                    <th>Endpoint Type</th>
                    <th>Test Count</th>
                    <th>Pass Rate Change</th>
                    <th>Regressions</th>
                    <th>Improvements</th>
                    <th>Avg Duration Change</th>
                </tr>
            </thead>
            <tbody>
                ${endpoint_analysis.map(ep => {
                  const baselinePassRate = ep.baseline_total > 0 ? (ep.baseline_passed / ep.baseline_total * 100).toFixed(1) : 0;
                  const currentPassRate = ep.current_total > 0 ? (ep.current_passed / ep.current_total * 100).toFixed(1) : 0;
                  const passRateChange = (currentPassRate - baselinePassRate).toFixed(1);
                  return `
                    <tr>
                        <td>${ep.endpoint_type}</td>
                        <td>${ep.baseline_total} → ${ep.current_total}</td>
                        <td class="${passRateChange >= 0 ? 'positive' : 'negative'}">${baselinePassRate}% → ${currentPassRate}% (${passRateChange >= 0 ? '+' : ''}${passRateChange}%)</td>
                        <td>${ep.regressions}</td>
                        <td>${ep.improvements}</td>
                        <td class="${ep.avg_duration_change <= 0 ? 'positive' : 'negative'}">${ep.avg_duration_change >= 0 ? '+' : ''}${ep.avg_duration_change}ms</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
    </div>
    ${detailed_performance && !detailed_performance.error ? `
    <div class="section">
        <h2>📊 Detailed Performance Analysis</h2>
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
        <h3>Performance Percentiles</h3>
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
        <h3>Statistical Metrics</h3>
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
    </div>
    ` : ''}
    ${provider_analysis && provider_analysis.length > 0 ? `
    <div class="section">
        <h2>🏢 Provider Analysis</h2>
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
    </div>
    ` : ''}
    ${response_size_analysis ? `
    <div class="section">
        <h2>📏 Response Size vs Performance Analysis</h2>
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
                        <td class="${data.size_change <= 0 ? 'positive' : 'negative'}">${data.size_change >= 0 ? '+' : ''}${data.size_change.toLocaleString()} bytes</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <p><small><strong>Size Categories:</strong> Tiny (&lt;1KB), Small (&lt;10KB), Medium (&lt;100KB), Large (≥100KB)</small></p>
    </div>
    ` : ''}
    <div class="section">
        <h2>📊 Performance Visualizations</h2>
        <div style="margin-bottom: 40px;">
            <h3>⚡ All Test Response Times: Baseline vs Current</h3>
            <p><small><strong>Blue:</strong> Baseline Performance | <strong>Red:</strong> Current Performance | <em>Tests sorted by baseline duration (fastest to slowest)</em></small></p>
            <div style="width: 100%; height: 400px; position: relative;">
                <canvas id="responseTimeChart"></canvas>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
            <div>
                <h3>📊 Performance Percentiles: Baseline vs Current</h3>
                <p><small><strong>Blue:</strong> Baseline | <strong>Red:</strong> Current | <em>Higher bars = slower performance</em></small></p>
                <canvas id="percentileChart" width="400" height="200"></canvas>
            </div>
            <div>
                <h3>🎯 Provider Performance Changes</h3>
                <p><small><strong>Quadrants:</strong> 🟢 Faster+Reliable | 🟡 Slower+Reliable | 🔵 Faster+Unreliable | 🔴 Slower+Unreliable</small></p>
                <canvas id="providerChart" width="400" height="200"></canvas>
            </div>
        </div>
        <div style="max-width: 600px; margin: 0 auto;">
            <h3>📏 Response Size Impact Analysis</h3>
            <p><small><strong>Shows:</strong> How response size correlates with performance degradation | <em>Higher = worse impact</em></small></p>
            <canvas id="sizeChart" width="600" height="300"></canvas>
        </div>
    </div>
    <div class="section">
        <h2>Changes Overview</h2>
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
    <div class="section">
        <h2>🔴 Regressions</h2>
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
    <div class="section">
        <h2>🟢 Improvements</h2>
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
    
    <script>
    // Chart.js configuration and rendering
    document.addEventListener('DOMContentLoaded', function() {
        // Response Time Line Chart (Full Width)
        const responseTimeData = ${JSON.stringify(this.generateResponseTimeLineData(baselineResults, currentResults))};
        if (responseTimeData && responseTimeData.datasets) {
            const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
            new Chart(responseTimeCtx, {
                type: 'line',
                data: {
                    labels: responseTimeData.labels,
                    datasets: responseTimeData.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: 10
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Response Time Comparison (' + responseTimeData.metadata.sampledTests.toLocaleString() + ' of ' + responseTimeData.metadata.totalTests.toLocaleString() + ' tests shown)',
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
                                    return 'Test #' + (index + 1) + ' of ' + responseTimeData.metadata.sampledTests;
                                },
                                label: function(context) {
                                    const isBaseline = context.datasetIndex === 0;
                                    const label = isBaseline ? 'Baseline' : 'Current';
                                    const value = context.parsed.y;
                                    return label + ': ' + value + 'ms';
                                },
                                afterBody: function(context) {
                                    const index = context[0].dataIndex;
                                    const testDetail = responseTimeData.metadata.testDetails[index];
                                    if (testDetail) {
                                        const change = testDetail.current - testDetail.baseline;
                                        const pctChange = testDetail.baseline > 0 ? ((change / testDetail.baseline) * 100).toFixed(1) : 0;
                                        return [
                                            'Change: ' + (change >= 0 ? '+' : '') + change + 'ms (' + pctChange + '%)',
                                            'Sample interval: every ' + responseTimeData.metadata.sampleInterval + ' tests'
                                        ];
                                    }
                                    return [];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Tests (sorted by baseline performance)' },
                            grid: { display: false },
                            ticks: {
                                maxTicksLimit: 10,
                                callback: function(value, index) {
                                    const total = responseTimeData.metadata.sampledTests;
                                    if (index === 0) return 'Fastest';
                                    if (index === this.getLabelForValue(this.max)) return 'Slowest';
                                    return 'Tests (sorted by baseline performance)' + (value / total) * 100 + '%';
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
                }
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
                                    return value === 0 ? '0 (no change)' : (value > 0 ? '+' : '') + value + 'ms';
                                }
                            }
                        }
                    }
                }
            });
        }` : ''}
    });
    </script>
</body>
</html>`;
  }

  /**
   * Generate chart data for response time line chart showing all test comparisons
   */
  generateResponseTimeLineData(baselineResults, currentResults) {
    // Create test maps for efficient lookup
    const baselineMap = new Map();
    const currentMap = new Map();
    
    // Collect successful tests with durations
    baselineResults
      .filter(test => test.status === 'PASS' && typeof test.duration_ms === 'number')
      .forEach(test => baselineMap.set(test.test_name, test.duration_ms));
    
    currentResults
      .filter(test => test.status === 'PASS' && typeof test.duration_ms === 'number')
      .forEach(test => currentMap.set(test.test_name, test.duration_ms));
    
    // Find tests that exist in both datasets
    const commonTests = [];
    baselineMap.forEach((baselineDuration, testName) => {
      if (currentMap.has(testName)) {
        commonTests.push({
          testName,
          baseline: baselineDuration,
          current: currentMap.get(testName)
        });
      }
    });
    
    // Sort by baseline duration for a nice visual progression
    commonTests.sort((a, b) => a.baseline - b.baseline);
    
    // For large datasets, sample intelligently to keep chart responsive
    const maxPoints = 5000; // Reasonable limit for chart performance
    const sampleInterval = Math.max(1, Math.floor(commonTests.length / maxPoints));
    const sampledTests = commonTests.filter((_, index) => index % sampleInterval === 0);
    
    return {
      labels: sampledTests.map((_, index) => index), // Use indices as x-axis
      datasets: [
        {
          label: 'Baseline Performance',
          data: sampledTests.map(test => test.baseline),
          borderColor: 'rgba(54, 162, 235, 0.8)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          pointRadius: 0, // No individual points for cleaner look
          pointHoverRadius: 4,
          borderWidth: 2,
          tension: 0 // Straight lines between points
        },
        {
          label: 'Current Performance',
          data: sampledTests.map(test => test.current),
          borderColor: 'rgba(255, 99, 132, 0.8)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          tension: 0
        }
      ],
      metadata: {
        totalTests: commonTests.length,
        sampledTests: sampledTests.length,
        sampleInterval,
        testDetails: sampledTests // Store for tooltip info
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
        y: data.current.avg_duration - data.baseline.avg_duration,
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
