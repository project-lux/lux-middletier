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
  compareReports() {
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
      test_differences: this.compareTests(baselineTests, currentTests),
      endpoint_analysis: this.analyzeByEndpoint(baselineTests, currentTests)
    };

    this.generateReports(comparison);
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
    [...baselineTests.values(), ...currentTests.values()].forEach(test => {
      allEndpointTypes.add(test.endpoint_type);
    });

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
  generateReports(comparison) {
    // Extract endpoint type from output directory path for consistent naming
    const endpointType = path.basename(this.outputDir);
    const baseFileName = `${endpointType}-comparison`;

    // JSON Report
    const jsonFile = path.join(this.outputDir, `${baseFileName}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(comparison, null, 2));

    // HTML Report
    const htmlFile = path.join(this.outputDir, `${baseFileName}.html`);
    const htmlContent = this.generateHTMLReport(comparison);
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
  generateHTMLReport(comparison) {
    const { metadata, summary, test_differences, endpoint_analysis } = comparison;
  const title = this.comparisonName || "Test Report Comparison";
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
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
</body>
</html>`;
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
    comparator.compareReports();
  } catch (error) {
    console.error('Comparison failed:', error.message);
    process.exit(1);
  }
}

export default ReportComparator;
