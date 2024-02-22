const env = require('../config/env')
const util = require('./util')

exports.transformEntityDoc = (doc, searchUriHost, resultUriHost, links) => {
  const doc2 = { ...doc }

  if (links) {
    doc2._links = links
  }

  return util.replaceStringsInObject(
    doc2,
    searchUriHost,
    resultUriHost,
  )
}

exports.translateQuery = (queryStr) => (
  queryStr.replaceAll(env.resultUriHost, env.searchUriHost)
)
