import marklogic from 'marklogic'

import Lux from './ml-generated/lux.cjs'
import Document from './ml-generated/document.cjs'

// A mediator between the application and the auto-generated MarkLogic client code
class MLProxy {
  constructor() {
    this.rootServices = null
    this.documentServices = null
    this.username = null
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

  advancedSearchConfig() {
    return this.rootServices.advancedSearchConfig()
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
    return this.rootServices.autoComplete(
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
    return this.documentServices.read(uri, profile, lang)
  }

  facets(name, q, scope, page, pageLength, sort) {
    return this.rootServices.facets(
      name || null,
      q || null,
      scope || null,
      page || null,
      pageLength || null,
      sort || null,
    )
  }

  relatedList({
    searchScopeName,
    relatedListName,
    uri,
    page = 1,
    pageLength = 100,
    filterResults = true,
    relationshipsPerRelation = 100000,
  }) {
    return this.rootServices.relatedList(
      searchScopeName,
      relatedListName,
      uri,
      page,
      pageLength,
      filterResults,
      relationshipsPerRelation,
    )
  }

  search({
    searchCriteria,
    searchScope,
    page = 1,
    pageLength = 20,
    pageWith = '',
    sortDelimitedStr = '',
    filterResults = true,
  }) {
    return this.rootServices.search(
      searchCriteria,
      searchScope,
      page,
      pageLength,
      pageWith,
      sortDelimitedStr,
      filterResults,
    )
  }

  searchEstimate(q, scope) {
    return this.rootServices.searchEstimate(q, scope)
  }

  searchInfo() {
    return this.rootServices.searchInfo()
  }

  searchWillMatch(q) {
    return this.rootServices.searchWillMatch(q)
  }

  stats() {
    return this.rootServices.stats()
  }

  translate(q, scope) {
    return this.rootServices.translate(q, scope)
  }

  versionInfo() {
    return this.rootServices.versionInfo()
  }
}

export default MLProxy
