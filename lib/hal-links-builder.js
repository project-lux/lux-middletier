import { buildEstimatesQuery, queryBuilders } from "./build-query/builder.js";
import { parseResults } from "./build-query/helper.js";

const curies = [
  {
    name: "la",
    href: "https://linked.art/api/1.0/rels/{rel}",
    templated: true,
  },
  {
    name: "lux",
    href: "https://lux.collections.yale.edu/api/rels/{rel}",
    templated: true,
  },
];

class HalLinksBuilder {
  constructor(mlProxy, unitName, options = {}) {
    this.mlProxy = mlProxy;
    this.unitName = unitName;

    // Validate and set batchSize
    this.batchSize = Math.max(1, options.batchSize || 6);

    // Validate and set maxConcurrentBatches
    this.maxConcurrentBatches = Math.max(1, options.maxConcurrentBatches || 2);

    // Warn about potentially inefficient configurations
    if (this.batchSize === 1 && this.maxConcurrentBatches > 10) {
      console.warn(
        "HalLinksBuilder: Very small batch size with high concurrency may not be optimal"
      );
    }

    if (this.batchSize >= 24) {
      console.warn(
        "HalLinksBuilder: Large batch size may disable batching optimization for typical entity searches"
      );
    }
  }

  async getLinks(doc) {
    const links = {};
    const queries = buildEstimatesQuery(doc);
    let rawEstimates = {};

    if (queries && Object.keys(queries).length > 0) {
      rawEstimates = await this.executeQueriesBatched(doc.id, queries);
    }

    const estimates = parseResults(rawEstimates);

    Object.keys(estimates).forEach((key) => {
      let val = estimates[key];

      if (val === null) {
        val = {
          estimate: null,
        };
      }

      if (val.hasOneOrMoreResult && val.hasOneOrMoreResult > 0) {
        const query = queryBuilders[key](doc.id);

        links[key] = {
          href: query,
          _estimate: 1,
        };
      }
    });

    return {
      curies,
      self: {
        href: doc.id,
      },
      ...links,
    };
  }

  async executeQueriesBatched(docId, queries) {
    const searchNames = Object.keys(queries);
    const results = {};

    // Start timing
    const startTime = Date.now();
    const totalSearches = searchNames.length;

    // Create batches of search names
    const batches = [];
    for (let i = 0; i < searchNames.length; i += this.batchSize) {
      batches.push(searchNames.slice(i, i + this.batchSize));
    }

    let successfulBatches = 0;
    let totalApiCalls = 0;

    // Process batches with concurrency limit
    for (let i = 0; i < batches.length; i += this.maxConcurrentBatches) {
      const concurrentBatches = batches.slice(i, i + this.maxConcurrentBatches);

      const batchPromises = concurrentBatches.map(
        async (batch, concurrentBatchIndex) => {
          const actualBatchNumber = i + concurrentBatchIndex + 1;
          const batchStartTime = Date.now();
          totalApiCalls++;

          try {
            const combinedQueries = {};
            batch.forEach((searchName) => {
              combinedQueries[searchName] = queries[searchName];
            });

            const combinedQuery = JSON.stringify(combinedQueries);
            const result = await this.mlProxy.searchWillMatch(
              this.unitName,
              combinedQuery
            );

            successfulBatches++;
            return result;
          } catch (error) {
            const batchDuration = Date.now() - batchStartTime;
            const queryNames = batch.join(", ");

            console.warn(
              `Batch ${actualBatchNumber}: searchWillMatch failed for the [${queryNames}] queries against ${docId} after ${batchDuration}ms: ${error.message}`
            );

            return null;
          }
        }
      );

      // Merge all batch results
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          Object.assign(results, result.value);
        }
      });
    }

    const totalDuration = Date.now() - startTime;
    const successRate =
      totalApiCalls > 0 ? (successfulBatches / totalApiCalls) * 100 : 0;

    console.log(
      "HAL links metrics: " +
        JSON.stringify({
          docId,
          successRate,
          totalDurationMs: totalDuration,
          totalBatches: batches.length,
          totalApiCalls,
          totalSearches,
          batchSize: this.batchSize,
          maxConcurrent: this.maxConcurrentBatches,
        })
    );

    return results;
  }
}

export default HalLinksBuilder;
