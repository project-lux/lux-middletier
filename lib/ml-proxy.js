import marklogic from 'marklogic'

import env from '../config/env.js'
import { extractAccessToken, getServiceToken, verifyToken } from './auth/auth.js'
import Lux from './ml-generated/lux.cjs'

export async function createMLProxy(req) {
  let accessToken = extractAccessToken(req)
  let mlPort = env.mlPort


  if (accessToken) {
    // console.log('token from req')
    // const decAccess = await verifyToken(accessToken)
    // console.log('accessToken:', decAccess)
  } else {
    // console.log('token from service')
    accessToken = await getServiceToken()
  }

  // console.log('createMLProxy mlPort:', mlPort, 'accessToken:', accessToken)
  return new MLProxy(accessToken, mlPort)
}

function createMLClient(oauthToken, mlPort) {
  try {
    const mlClient = marklogic.createDatabaseClient({
      host: env.mlHost,
      port: mlPort,
      authType: 'oauth',
      oauthToken: oauthToken,
      ssl: env.mlSsl,
    })
    return mlClient
  } catch (error) {
    console.error('createMLClient failed -', error)
    return null
  }
}

// A mediator between the application and the auto-generated MarkLogic client code
export class MLProxy {
  constructor(oauthToken, mlPort) {
    try {
      const mlClient = createMLClient(oauthToken, mlPort)
      this.luxInstance = Lux.on(mlClient)
    } catch (error) {
      console.error('MLProxy constructor failed -', error)
    }
  }

  static parseError(err) {
    let statusCode = err.statusCode === undefined ? 500 : err.statusCode
    let errorMessage = err.message

    if (err.body && err.body.errorResponse && err.body.errorResponse.statusCode) {
      statusCode = err.body.errorResponse.statusCode
      errorMessage = err.body.errorResponse.message
    }

    return {
      statusCode,
      errorMessage,
    }
  }

  advancedSearchConfig() {
    return this.luxInstance.advancedSearchConfig()
  }

  autoComplete(
    text,
    context,
    fullyHonorContext,
    onlyMatchOnPrimaryNames,
    onlyReturnPrimaryNames,
    page,
    pageLength,
    filterIndex,
    previouslyFiltered,
    timeoutInMilliseconds,
  ) {
    return this.luxInstance.autoComplete(
      text,
      context,
      fullyHonorContext,
      onlyMatchOnPrimaryNames,
      onlyReturnPrimaryNames,
      page,
      pageLength,
      filterIndex,
      previouslyFiltered,
      timeoutInMilliseconds,
    )
  }

  getDocument(uri, profile, lang) {
    return this.luxInstance.document(uri, profile, lang)
  }

  facets(name, q, scope, page, pageLength, sort) {
    return this.luxInstance.facets(
      name || null,
      q || null,
      scope || null,
      page || null,
      pageLength || null,
      sort || null,
    )
  }

  relatedList(scope, name, uri, page, pageLength, relationshipsPerRelation) {
    return this.luxInstance.relatedList(
      scope,
      name,
      uri,
      page,
      pageLength,
      relationshipsPerRelation,
    )
  }

  search(
    q,
    scope,
    mayChangeScope,
    page,
    pageLength,
    pageWith,
    sort,
    facetsSoon,
    synonymsEnabled,
  ) {
    return this.luxInstance.search(
      q,
      scope,
      mayChangeScope,
      page,
      pageLength,
      pageWith,
      sort,
      facetsSoon,
      synonymsEnabled,
    )
  }

  searchEstimate(q, scope) {
    return this.luxInstance.searchEstimate(q, scope)
  }

  searchInfo() {
    return this.luxInstance.searchInfo()
  }

  searchWillMatch(q) {
    return this.luxInstance.searchWillMatch(q)
  }

  stats() {
    return this.luxInstance.stats()
  }

  translate(q, scope) {
    return this.luxInstance.translate(q, scope)
  }

  versionInfo() {
    return this.luxInstance.versionInfo()
  }
}

export default MLProxy
