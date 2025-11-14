import { buildEstimatesQuery, queryBuilders } from './build-query/builder.js'
import { parseResults } from './build-query/helper.js'

const curies = [
  {
    name: 'la',
    href: 'https://linked.art/api/1.0/rels/{rel}',
    templated: true,
  },
  {
    name: 'lux',
    href: 'https://lux.collections.yale.edu/api/rels/{rel}',
    templated: true,
  },
]

class HalLinksBuilder {
  constructor(mlProxy, unitName, options = {}) {
    this.mlProxy = mlProxy
    this.unitName = unitName
    
    // Validate and set batchSize
    this.batchSize = Math.max(1, options.batchSize || 6)
    
    // Validate and set maxConcurrentBatches
    this.maxConcurrentBatches = Math.max(1, options.maxConcurrentBatches || 2)
    
    // Warn about potentially inefficient configurations
    if (this.batchSize === 1 && this.maxConcurrentBatches > 10) {
      console.warn('HalLinksBuilder: Very small batch size with high concurrency may not be optimal')
    }
    
    if (this.batchSize >= 24) {
      console.warn('HalLinksBuilder: Large batch size may disable batching optimization for typical entity searches')
    }
  }

  async getLinks(doc) {
    const links = {}
    const queries = buildEstimatesQuery(doc)
    let rawEstimates = {}

    if (queries && Object.keys(queries).length > 0) {
      rawEstimates = await this.executeQueriesBatched(queries)
    }

    const estimates = parseResults(rawEstimates)

    Object.keys(estimates).forEach((key) => {
      let val = estimates[key]

      if (val === null) {
        val = {
          estimate: null,
        }
      }

      if (val.hasOneOrMoreResult && val.hasOneOrMoreResult > 0) {
        const query = queryBuilders[key](doc.id)

        links[key] = {
          href: query,
          _estimate: 1,
        }
      }
    })

    return {
      curies,
      self: {
        href: doc.id,
      },
      ...links,
    }
  }

  async executeQueriesBatched(queries) {
    const searchNames = Object.keys(queries)
    const results = {}
    
    // Create all batches
    const batches = []
    for (let i = 0; i < searchNames.length; i += this.batchSize) {
      batches.push(searchNames.slice(i, i + this.batchSize))
    }
    
    // Process batches with concurrency limit
    for (let i = 0; i < batches.length; i += this.maxConcurrentBatches) {
      const concurrentBatches = batches.slice(i, i + this.maxConcurrentBatches)
      
      const batchPromises = concurrentBatches.map(batch => 
        Promise.allSettled(
          batch.map(async (searchName) => {
            try {
              const query = JSON.stringify(queries[searchName])
              const result = await this.mlProxy.searchWillMatch(this.unitName, query)
              return { searchName, result }
            } catch (error) {
              console.warn(`Search failed for ${searchName}:`, {
                error: error.message,
                unitName: this.unitName,
                query: queries[searchName], // Original query object
                stack: error.stack,
                timestamp: new Date().toISOString(),
                batchConfig: {
                  batchSize: this.batchSize,
                  maxConcurrentBatches: this.maxConcurrentBatches
                }
              })
              return { searchName, result: null }
            }
          })
        )
      )
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      // Merge results from this set of concurrent batches
      batchResults.forEach((batchResult) => {
        if (batchResult.status === 'fulfilled') {
          batchResult.value.forEach((promiseResult) => {
            if (promiseResult.status === 'fulfilled' && promiseResult.value.result) {
              Object.assign(results, promiseResult.value.result)
            }
          })
        }
      })
    }
    
    return results
  }
}

export default HalLinksBuilder
