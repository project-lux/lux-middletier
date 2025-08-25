/**
 * Manages test statistics and summary reporting
 */
export class TestStatistics {
  constructor() {
    this.endpointStats = {};
    this.totalUniqueTests = 0;
    this.totalDuplicatesFound = 0;
    this.totalTestsBeforeDedup = 0;
    this.overallStartTime = Date.now();
  }

  /**
   * Record statistics for an endpoint
   */
  recordEndpointStats(endpointKey, stats, duration) {
    this.endpointStats[endpointKey] = {
      ...stats,
      duration: duration,
    };
    
    this.totalUniqueTests += stats.uniqueTests;
    this.totalDuplicatesFound += stats.duplicatesRemoved;
    this.totalTestsBeforeDedup += stats.totalBeforeDedup;
  }

  /**
   * Set deduplication as disabled
   */
  setDeduplicationDisabled() {
    this.totalDuplicatesFound = "Disabled";
  }

  /**
   * Helper function to format duration in a human-readable way
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Helper function to format numbers with commas
   */
  formatNumber(num) {
    return num.toLocaleString();
  }

  /**
   * Calculate column widths for the summary table
   */
  calculateColumnWidths() {
    const sortedEndpoints = Object.keys(this.endpointStats).sort();
    const totalDuration = Date.now() - this.overallStartTime;

    const endpointKeyWidth =
      Math.max(
        "Endpoint".length,
        ...sortedEndpoints.map((key) => key.length),
        "TOTALS".length
      ) + 2;

    const totalBeforeWidth =
      Math.max(
        "Total Before Dedup".length,
        this.formatNumber(this.totalTestsBeforeDedup).length,
        ...sortedEndpoints.map(
          (key) => this.formatNumber(this.endpointStats[key].totalBeforeDedup).length
        )
      ) + 2;

    const uniqueTestsWidth =
      Math.max(
        "Unique Tests".length,
        this.formatNumber(this.totalUniqueTests).length,
        ...sortedEndpoints.map(
          (key) => this.formatNumber(this.endpointStats[key].uniqueTests).length
        )
      ) + 2;

    const duplicatesWidth =
      Math.max(
        "Duplicates Removed".length,
        this.formatNumber(this.totalDuplicatesFound).length,
        ...sortedEndpoints.map(
          (key) => this.formatNumber(this.endpointStats[key].duplicatesRemoved).length
        )
      ) + 2;

    const durationWidth =
      Math.max(
        "Duration".length,
        this.formatDuration(totalDuration).length,
        ...sortedEndpoints.map(
          (key) => this.formatDuration(this.endpointStats[key].duration).length
        )
      ) + 2;

    return {
      endpointKeyWidth,
      totalBeforeWidth,
      uniqueTestsWidth,
      duplicatesWidth,
      durationWidth,
    };
  }

  /**
   * Print comprehensive summary of test generation
   */
  printSummary(options = {}) {
    const totalDuration = Date.now() - this.overallStartTime;
    const sortedEndpoints = Object.keys(this.endpointStats).sort();
    const widths = this.calculateColumnWidths();

    console.log("\n" + "=".repeat(92));
    console.log("TEST GENERATION SUMMARY");
    console.log("=".repeat(92));

    // Print table header
    console.log(
      "\n" +
        "Endpoint".padEnd(widths.endpointKeyWidth) +
        "Total Before Dedup".padStart(widths.totalBeforeWidth) +
        "Unique Tests".padStart(widths.uniqueTestsWidth) +
        "Duplicates Removed".padStart(widths.duplicatesWidth) +
        "Duration".padStart(widths.durationWidth)
    );

    console.log(
      "-".repeat(widths.endpointKeyWidth) +
        "-".repeat(widths.totalBeforeWidth) +
        "-".repeat(widths.uniqueTestsWidth) +
        "-".repeat(widths.duplicatesWidth) +
        "-".repeat(widths.durationWidth)
    );

    // Print each endpoint's data
    for (const endpointKey of sortedEndpoints) {
      const stats = this.endpointStats[endpointKey];
      console.log(
        endpointKey.padEnd(widths.endpointKeyWidth) +
          this.formatNumber(stats.totalBeforeDedup).padStart(widths.totalBeforeWidth) +
          this.formatNumber(stats.uniqueTests).padStart(widths.uniqueTestsWidth) +
          this.formatNumber(stats.duplicatesRemoved).padStart(widths.duplicatesWidth) +
          this.formatDuration(stats.duration).padStart(widths.durationWidth)
      );
    }

    // Print separator line before totals
    console.log(
      "-".repeat(widths.endpointKeyWidth) +
        "-".repeat(widths.totalBeforeWidth) +
        "-".repeat(widths.uniqueTestsWidth) +
        "-".repeat(widths.duplicatesWidth) +
        "-".repeat(widths.durationWidth)
    );

    // Print totals row
    console.log(
      "TOTALS".padEnd(widths.endpointKeyWidth) +
        this.formatNumber(this.totalTestsBeforeDedup).padStart(widths.totalBeforeWidth) +
        this.formatNumber(this.totalUniqueTests).padStart(widths.uniqueTestsWidth) +
        this.formatNumber(this.totalDuplicatesFound).padStart(widths.duplicatesWidth) +
        this.formatDuration(totalDuration).padStart(widths.durationWidth)
    );

    console.log(`\nEndpoints processed: ${Object.keys(this.endpointStats).length}`);

    this.printSearchRelatedSummary(options);
    console.log("\nTest file generation complete!");
  }

  /**
   * Print search-related test summary
   */
  printSearchRelatedSummary(options) {
    console.log(
      `\nGenerated search-related tests: ${
        options.includeSearchRelated === true
          ? true
          : `false (the --search-related option was not specified)`
      }`
    );
  }
}
