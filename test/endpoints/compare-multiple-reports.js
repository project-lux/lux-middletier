import ReportComparator from "./compare-reports.js";
import fs from 'fs';
import path from 'path';

const baseDir = 'c:/workspaces/yale/clones/lux-middletier/test/endpoints';

// Define your combinations here
const configurations = [
  {
    baselineEndpointsDir: 'reports/ML-PRD-2-2025-11-03_19-33-05/endpoints',
    currentEndpointsDir: 'reports/ML-Mini-16-2025-11-14_19-14-58/endpoints',
    baseOutputDir: 'comparisons',
    comparisonName: 'ML-PRD-to-ML-Mini'
  },
  // {
  //   baselineEndpointsDir: 'reports/test-06-ml-3-3rds/test-run-2025-08-28_22-26-44/endpoints',
  //   currentEndpointsDir: 'reports/test-08-ql-pipeline/test-run-2025-09-02_20-12-23/endpoints',
  //   baseOutputDir: 'comparisons/ml-3-3rds-to-ql-pipeline',
  // },
  // {
  //   baselineEndpointsDir: 'reports/test-07-ml-2-3rds/test-run-2025-08-29_17-53-49/endpoints',
  //   currentEndpointsDir: 'reports/test-08-ql-pipeline/test-run-2025-09-02_20-12-23/endpoints',
  //   baseOutputDir: 'comparisons/ml-2-3rds-to-ql-pipeline',
  // },
  // {
  //   baselineEndpointsDir: 'reports/test-07-ml-2-3rds/test-run-2025-08-29_17-53-49/endpoints',
  //   currentEndpointsDir: 'reports/test-09-ql-mini/test-run-2025-09-02_21-29-11/endpoints',
  //   baseOutputDir: 'comparisons/ml-2-3rds-to-ql-mini',
  // },
];

const endpointsToCompare = [
    'get-data',
    'get-facets',
    'get-related-list',
    'get-search',
    'get-search-estimate',
    'get-search-will-match'];

for (const config of configurations) {
  let { baselineEndpointsDir, currentEndpointsDir, baseOutputDir } = config;
  baselineEndpointsDir = path.join(baseDir, baselineEndpointsDir);
  currentEndpointsDir = path.join(baseDir, currentEndpointsDir);
  baseOutputDir = path.join(baseDir, baseOutputDir);

  // Validate input directories
  if (!fs.existsSync(baselineEndpointsDir)) {
    console.error(`Baseline directory not found: ${baselineEndpointsDir}`);
    continue;
  }
  if (!fs.existsSync(currentEndpointsDir)) {
    console.error(`Current directory not found: ${currentEndpointsDir}`);
    continue;
  }
  // Optionally check baseOutputDir exists, or create it
  if (!fs.existsSync(baseOutputDir)) {
    try {
      fs.mkdirSync(baseOutputDir, { recursive: true });
    } catch (err) {
      console.error(`Failed to create output directory: ${baseOutputDir}`);
      continue;
    }
  }

  // Determine comparison name before processing endpoints
  let comparisonName;
  if (config.comparisonName) {
    comparisonName = config.comparisonName;
  } else {
    const baseOutputDirParts = baseOutputDir.split(/[\\/]/);
    comparisonName = baseOutputDirParts[baseOutputDirParts.length - 1];
  }

  for (const endpoint of endpointsToCompare) {
    const baselineFile = `${baselineEndpointsDir}/${endpoint}/endpoint-test-report.json`;
    const currentFile = `${currentEndpointsDir}/${endpoint}/endpoint-test-report.json`;
    const endpointOutputDir = `${baseOutputDir}/${comparisonName}/${endpoint}`;
    const endpointComparisonName = `${comparisonName}: ${endpoint}`;
    compareFiles(baselineFile, currentFile, endpointOutputDir, endpointComparisonName);
  }
}

// ...existing code...

function compareFiles(baselineFile, currentFile, outputDir, comparisonName) {
  // Validate input files exist

  if (!fs.existsSync(baselineFile)) {
    console.error(`Baseline report not found: ${baselineFile}`);
    return;
    //process.exit(1);
  }

  if (!fs.existsSync(currentFile)) {
    console.error(`Current report not found: ${currentFile}`);
    return;
    //process.exit(1);
  }

  try {
    const comparator = new ReportComparator(baselineFile, currentFile, outputDir, comparisonName);
    comparator.compareReports();
  } catch (error) {
    console.error(`Comparison of these files failed: ${baselineFile}, ${currentFile}`, error.message);
    // opt not to exit so that other comparisons can continue
    //process.exit(1);
  }
}