const queries = require('./queries')

function deleteScope(query) {
  const updatedQuery = query
  delete updatedQuery._scope
  return updatedQuery
}

// Combine queries named in keyFuncMap, removing duplicates.
// For queries with the same name, a new common key is created
// by joining the keys with a comma.
function buildCombinedQuery(docId, keyFuncMap) {
  const reverseMap = {}
  const combinedQuery = {}

  for (const [key, funcName] of Object.entries(keyFuncMap)) {
    if (reverseMap[funcName] === undefined) {
      reverseMap[funcName] = []
    }
    reverseMap[funcName].push(key)
  }

  for (const [funcName, keys] of Object.entries(reverseMap)) {
    const queryBuilderFunc = queries[funcName]
    const combinedKey = keys.join(',')

    combinedQuery[combinedKey] = queryBuilderFunc(docId)
  }
  return combinedQuery
}

// Split combined keys from the raw estimates response
// to reconstruct a valid estimates result.
function parseResults(resp) {
  const estimates = {}

  for (const [combinedKey, result] of Object.entries(resp)) {
    const keys = combinedKey.split(',')

    for (const key of keys) {
      estimates[key] = result
    }
  }
  return estimates
}

function prepareQuery(query) {
  return encodeURIComponent(JSON.stringify(deleteScope(query)))
}

module.exports = {
  buildCombinedQuery,
  parseResults,
  prepareQuery,
}
