import Lux from './ml-generated/lux.cjs'
import Document from './ml-generated/document.cjs'

// A mediator between the application and the auto-generated MarkLogic client code
class MLProxy {
  constructor(mlClient) {
    this.db = mlClient
    this.rootServices = Lux.on(this.db)
    this.documentServices = Document.on(this.db)
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

  relatedList(scope, name, uri, page, pageLength, relationshipsPerRelation) {
    return this.rootServices.relatedList(
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
    return this.rootServices.search(
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
