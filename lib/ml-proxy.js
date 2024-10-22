import Lux from './ml-generated/lux.js'

// A mediator between the application and the auto-generated MarkLogic client code
class MLProxy {
  constructor(mlClient) {
    this.db = mlClient
    this.luxInstance = Lux.on(this.db)
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
