import ReportComparator from "./compare-reports.js";
import fs from 'fs';
import path from 'path';

const baseDir = '/test-data/lux-middletier/test/endpoints';

// Define your combinations here
const configurations = [
  // Version 1 of the dashboard, made available 12 Jan 26.
  // {
  //   comparisonName: 'ML Full to ML-Mini-16',
  //   baselineEndpointsDir: 'reports/ML-PRD-2-2025-11-03_19-33-05/endpoints',
  //   currentEndpointsDir: 'reports/ML-Mini-16-2025-11-14_19-14-58/endpoints',
  //   baseOutputDir: 'reports/comparisons'
  // },
  // {
  //   comparisonName: 'ML Full to QL-Dev-2',
  //   baselineEndpointsDir: 'reports/ML-PRD-2-2025-11-03_19-33-05/endpoints',
  //   currentEndpointsDir: 'reports/ql-dev-2-2025-11-10_23-47-13/endpoints',
  //   baseOutputDir: 'reports/comparisons'
  // },
  // {
  //   comparisonName: 'ML-Mini-16 to QL-Dev-2',
  //   baselineEndpointsDir: 'reports/ML-Mini-16-2025-11-14_19-14-58/endpoints',
  //   currentEndpointsDir: 'reports/ql-dev-2-2025-11-10_23-47-13/endpoints',
  //   baseOutputDir: 'reports/comparisons'
  // },

  // Version 2 of the dashboard.
  {
    comparisonName: 'PRD to ML Mini on Graviton',
    baselineEndpointsDir: 'reports/Full-ML-v3-2026-01-09_23-25-19/endpoints',
    currentEndpointsDir: 'reports/ML-Mini-28-2026-01-08_19-44-53/endpoints',
    baseOutputDir: 'reports/comparisons'
  },
  {
    comparisonName: 'PRD to ML Mini on Intel',
    baselineEndpointsDir: 'reports/Full-ML-v3-2026-01-09_23-25-19/endpoints',
    currentEndpointsDir: 'reports/ML-Mini-27-v3-2026-01-13_23-27-18/endpoints',
    baseOutputDir: 'reports/comparisons'
  },
  {
    comparisonName: 'ML Mini on Intel to ML Mini on Graviton',
    baselineEndpointsDir: 'reports/ML-Mini-27-v3-2026-01-13_23-27-18/endpoints',
    currentEndpointsDir: 'reports/ML-Mini-28-2026-01-08_19-44-53/endpoints',
    baseOutputDir: 'reports/comparisons'
  },
  {
    comparisonName: 'PRD to QL',
    baselineEndpointsDir: 'reports/Full-ML-v3-2026-01-09_23-25-19/endpoints',
    currentEndpointsDir: 'reports/QL-Update-1-2026-01-15_22-42-48/endpoints',
    baseOutputDir: 'reports/comparisons'
  },
  {
    comparisonName: 'ML Mini on Intel to QL',
    baselineEndpointsDir: 'reports/ML-Mini-27-v3-2026-01-13_23-27-18/endpoints',
    currentEndpointsDir: 'reports/QL-Update-1-2026-01-15_22-42-48/endpoints',
    baseOutputDir: 'reports/comparisons'
  },
  {
    comparisonName: 'ML Mini on Graviton to QL',
    baselineEndpointsDir: 'reports/ML-Mini-28-2026-01-08_19-44-53/endpoints',
    currentEndpointsDir: 'reports/QL-Update-1-2026-01-15_22-42-48/endpoints',
    baseOutputDir: 'reports/comparisons'
  },

];

const endpointsToCompare = [
    'get-data-no-profile',
    'get-data-with-profile',
    'get-facets',
    'get-related-list',
    'get-search',
    'get-search-estimate'];

(async () => {
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
    await compareFiles(baselineFile, currentFile, endpointOutputDir, endpointComparisonName);
  }
}
})();

async function compareFiles(baselineFile, currentFile, outputDir, comparisonName) {
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
    await comparator.compareReports();
  } catch (error) {
    console.error(`Comparison of these files failed: ${baselineFile}, ${currentFile}`, error.message);
    // opt not to exit so that other comparisons can continue
    //process.exit(1);
  }
}
