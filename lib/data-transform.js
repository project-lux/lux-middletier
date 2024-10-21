import env from '../config/env.js'
import { replaceStringsInObject } from './util.js'

const transformEntityDoc = (doc, searchUriHost, resultUriHost, links) => {
  const doc2 = { ...doc }

  if (links) {
    doc2._links = links
  }

  return replaceStringsInObject(
    doc2,
    searchUriHost,
    resultUriHost,
  )
}

const translateQuery = (queryStr) => (
  queryStr.replaceAll(env.resultUriHost, env.searchUriHost)
)

export { transformEntityDoc, translateQuery }
