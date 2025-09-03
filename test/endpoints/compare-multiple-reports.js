import ReportComparator from "./compare-reports.js";
import fs from 'fs';

const [node, scriptName, baselineDir, currentDir, outputDir] = process.argv;

console.log(process.argv);
console.log({node, scriptName, baselineDir, currentDir, outputDir});

  // Validate input files exist
  if (!baselineDir) {
    console.error('Baseline directory must be specified as the first argument.');
    console.error('Usage: node compare-multiple-reports.js <baseline-dir> <current-dir> <output-dir>');
    process.exit(1);
  }
  
  if (!fs.existsSync(baselineDir)) {
    console.error(`Baseline directory not found: ${baselineDir}`);
    process.exit(1);
  }

  if (!currentDir) {
    console.error('Current directory must be specified as the second argument.');
    console.error('Usage: node compare-multiple-reports.js <baseline-dir> <current-dir> <output-dir>');
    process.exit(1);
  }

  if (!fs.existsSync(currentDir)) {
    console.error(`Current directory not found: ${currentDir}`);
    process.exit(1);
  }

//     if (!outputDir) {
//     console.error('Output directory must be specified as the third argument.');
//     console.error('Usage: node compare-multiple-reports.js <baseline-dir> <current-dir> <output-dir>');
//     process.exit(1);
//   }

//   if (!fs.existsSync(outputDir)) {
//     console.error(`Output directory not found: ${outputDir}`);
//     process.exit(1);
//   }

//   const baselineDirContents = fs.readdirSync(baselineDir);
//     const currentDirContents = fs.readdirSync(currentDir);
//     console.dir({baselineDirContents, currentDirContents});

const endpointsToCompare = [
    'get-data',
    'get-facets',
    'get-related-list',
    'get-search',
    'get-search-estimate',
    'get-search-will-match'];

for (const endpoint of endpointsToCompare) {
const baselineFile = `${baselineDir}/${endpoint}/endpoint-test-report.json`;
const currentFile = `${currentDir}/${endpoint}/endpoint-test-report.json`;
const endpointOutputDir = `${outputDir}/${endpoint}`;
compareFiles(baselineFile, currentFile, endpointOutputDir);
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
    const comparator = new ReportComparator(baselineFile, currentFile, outputDir);
    comparator.compareReports();
  } catch (error) {
    console.error(`Comparison of these files failed: ${baselineFile}, ${currentFile}`, error.message);
    // opt not to exit so that other comparisons can continue
    //process.exit(1);
  }
}