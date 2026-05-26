import ReportComparator from "./compare-reports.js";
import fs from 'fs';
import path from 'path';

const baseDir = '/test-data/lux-middletier/test/endpoints';

// Define your combinations here
const configurations = [
  {
    comparisonName: '2026-05-26-performance-comparison',
    baselineEndpointsDir: 'cts-v-optic/2026-05-26-cts-performance/endpoints',
    currentEndpointsDir: 'cts-v-optic/2026-05-26-optic-performance/endpoints',
    baseOutputDir: 'cts-v-optic/comparisons'
  },
];

const endpointsToCompare = [
    // 'get-data-no-profile',
    // 'get-data-with-profile',
    // 'get-facets',
    // 'get-related-list',
    'get-search',
    // 'get-search-estimate'
  ];

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
