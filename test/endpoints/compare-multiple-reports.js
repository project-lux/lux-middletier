import ReportComparator from "./compare-reports.js";
import fs from "fs";
import path from "path";

const baseDir = "c:/workspaces/yale/clones/lux-middletier/test/endpoints";

// Define your combinations here
const configurations = [
  {
    baselineDir:
      "reports/test-10-4f-baseline/test-run-2025-09-30_00-54-17/endpoints",
    currentDir: "reports/test-11-2f/test-run-2025-10-01_01-00-33/endpoints",
    outputDir: "comparisons/ml-4f-baseline-to-2f",
  },
];

const endpointsToCompare = [
  "get-data",
  "get-facets",
  "get-related-list",
  "get-search",
  "get-search-estimate",
  "get-search-will-match",
];

for (const config of configurations) {
  let { baselineDir, currentDir, outputDir } = config;
  baselineDir = path.join(baseDir, baselineDir);
  currentDir = path.join(baseDir, currentDir);
  outputDir = path.join(baseDir, outputDir);

  // Validate input directories
  if (!fs.existsSync(baselineDir)) {
    console.error(`Baseline directory not found: ${baselineDir}`);
    continue;
  }
  if (!fs.existsSync(currentDir)) {
    console.error(`Current directory not found: ${currentDir}`);
    continue;
  }
  // Optionally check outputDir exists, or create it
  if (!fs.existsSync(outputDir)) {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      console.error(`Failed to create output directory: ${outputDir}`);
      continue;
    }
  }

  for (const endpoint of endpointsToCompare) {
    const baselineFile = `${baselineDir}/${endpoint}/endpoint-test-report.json`;
    const currentFile = `${currentDir}/${endpoint}/endpoint-test-report.json`;
    const endpointOutputDir = `${outputDir}/${endpoint}`;
    compareFiles(baselineFile, currentFile, endpointOutputDir);
  }
}

function compareFiles(baselineFile, currentFile, outputDir) {
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
    const outputDirParts = outputDir.split(/[\\\/]/); // handle both / and \
    const comparisonName = `${outputDirParts[outputDirParts.length - 2]}: ${
      outputDirParts[outputDirParts.length - 1]
    }`;
    const comparator = new ReportComparator(
      baselineFile,
      currentFile,
      outputDir,
      comparisonName
    );
    comparator.compareReports();
  } catch (error) {
    console.error(
      `Comparison of these files failed: ${baselineFile}, ${currentFile}`,
      error.message
    );
    // opt not to exit so that other comparisons can continue
    //process.exit(1);
  }
}
