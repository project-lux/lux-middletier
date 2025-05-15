import marklogic from 'marklogic'

import env from '../config/env.js'
import Lux from './ml-generated/lux.cjs'
import Document from './ml-generated/document.cjs'

// A mediator between the application and the auto-generated MarkLogic client code
class MLProxy {
  constructor() {
    this.rootServices = null
    this.documentServices = null
  }

  initOAuth(oauthToken) {
    try {
      const mlClient = marklogic.createDatabaseClient({
        host: env.mlHost,
        port: env.mlPort,
        authType: 'oauth',
        oauthToken,
        ssl: env.mlSsl,
      })
      this.rootServices = Lux.on(mlClient)
      this.documentServices = Document.on(mlClient)
    } catch (error) {
      console.error('initOAuth failed -', error)
    } finally {
      return this
    }
  }

  initDigestAuth(config) {
    const mlClient = marklogic.createDatabaseClient({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      authType: config.authType,
      ssl: config.ssl,
    })
    this.rootServices = Lux.on(mlClient)
    this.documentServices = Document.on(mlClient)
    return this
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
