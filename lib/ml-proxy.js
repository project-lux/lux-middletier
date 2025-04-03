import marklogic from 'marklogic'

import env from '../config/env.js'
import { extractAccessToken, getServiceToken, verifyToken } from './auth/auth.js'
import Lux from './ml-generated/lux.cjs'
import Document from './ml-generated/document.cjs'

export async function createMLProxy(req) {
  let accessToken = extractAccessToken(req)
  let mlPort = env.mlPort

  if (accessToken) {
    console.log('token from req')
    const decAccess = await verifyToken(accessToken)
    console.log('accessToken:', decAccess)
  } else {
    console.log('token from service')
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
      this.rootServices = Lux.on(mlClient)
      this.documentServices = Document.on(mlClient)
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

  advancedSearchConfig(unitName) {
    return this.rootServices.advancedSearchConfig(unitName)
  }

  autoComplete(
    unitName,
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
    return this.rootServices.autoComplete(
      unitName,
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

  getDocument(unitName, uri, profile, lang) {
    return this.documentServices.read(unitName, uri, profile, lang)
  }

  facets(unitName, name, q, scope, page, pageLength, sort) {
    return this.rootServices.facets(
      unitName || null,
      name || null,
      q || null,
      scope || null,
      page || null,
      pageLength || null,
      sort || null,
    )
  }

  relatedList(unitName, scope, name, uri, page, pageLength, relationshipsPerRelation) {
    return this.rootServices.relatedList(
      unitName,
      scope,
      name,
      uri,
      page,
      pageLength,
      relationshipsPerRelation,
    )
  }

  search(
    unitName,
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
    return this.rootServices.search(
      unitName, 
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

  searchEstimate(unitName, q, scope) {
    return this.rootServices.searchEstimate(unitName, q, scope)
  }

  searchInfo(unitName) {
    return this.rootServices.searchInfo(unitName)
  }

  searchWillMatch(unitName, q) {
    return this.rootServices.searchWillMatch(unitName, q)
  }

  stats(unitName) {
    return this.rootServices.stats(unitName)
  }

  translate(q, scope) {
    return this.rootServices.translate(q, scope)
  }

  versionInfo() {
    return this.rootServices.versionInfo()
  }
}

export default MLProxy
