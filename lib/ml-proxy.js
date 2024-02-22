const { translateQuery } = require('./data-transform')
const Lux = require('./ml-generated/lux')

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

  dataConstants() {
    return this.luxInstance.dataConstants()
  }

  getDocument(uri, profile, lang) {
    return this.luxInstance.document(uri, profile, lang)
  }

  facets(name, q, scope) {
    return this.luxInstance.facets(
      name || null,
      q || null,
      scope || null,
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

  async getHierarchy(inUri, parentProperty, childQueryFns) {
    const uri = translateQuery(inUri)
    const doc = await this.getDocument(uri, null, null)
    const parentObjs = (doc[parentProperty] || []).map((item) => translateQuery(item.id))
    const parentPromises = []

    for (let i = 0; i < parentObjs.length; i += 1) {
      parentPromises.push(this.getDocument(parentObjs[i], null, null))
    }

    const parents = await Promise.all(parentPromises)
    const pageLen = 20
    const initialResponses = await Promise.all(
      childQueryFns.map((childQuery) => childQuery(uri, 1, pageLen)),
    )

    let childResults = initialResponses.reduce((prev, curr) => prev.concat(curr.orderedItems), [])
    const responsePromises = []

    for (let i = 0; i < childQueryFns.length; i++) {
      const childQuery = childQueryFns[i]
      // limit total to 400 per https://git.yale.edu/lux-its/lux-backend/issues/77
      const total = Math.min(initialResponses[i].partOf.totalItems, 400)

      for (let p = 2; (p - 1) * pageLen < total; p += 1) {
        responsePromises.push(childQuery(uri, p, pageLen))
      }
    }
    const childResponses = await Promise.all(responsePromises)
    childResults = childResults.concat(
      childResponses.reduce((prev, curr) => prev.concat(curr.orderedItems), []),
    )
    const childPromises = []

    for (let i = 0; i < childResults.length; i += 1) {
      childPromises.push(this.getDocument(childResults[i].id, null, null))
    }

    const children = await Promise.all(childPromises)
    const result = {
      current: doc,
      parents,
      children,
    }

    return result
  }

  async getConceptHierarchy(placeId) {
    return this.getHierarchy(placeId, 'broader', [
      this._getConceptParts.bind(this),
    ])
  }

  async getPlaceHierarchy(placeId) {
    return this.getHierarchy(placeId, 'part_of', [
      this._getPlaceParts.bind(this),
    ])
  }

  async getSetHierarchy(setId) {
    return this.getHierarchy(setId, 'member_of', [
      this._getSetPartWorks.bind(this),
      this._getSetMemberItems.bind(this),
    ])
  }

  _getConceptParts(conceptId, page, pageLength) {
    const q = {
      _scope: 'concept',
      broader: {
        id: conceptId,
      },
    }

    return this.search(
      JSON.stringify(q),
      '',
      false,
      page,
      pageLength,
      '',
      false,
      false,
    )
  }

  _getPlaceParts(placeId, page, pageLength) {
    const q = {
      _scope: 'place',
      partOf: {
        id: placeId,
      },
    }

    return this.search(
      JSON.stringify(q),
      '',
      false,
      page,
      pageLength,
      '',
      false,
      false,
    )
  }

  _getSetPartWorks(setId, page, pageLength) {
    const q = {
      _scope: 'work',
      partOf: {
        id: setId,
      },
    }

    return this.search(
      JSON.stringify(q),
      '',
      false,
      page,
      pageLength,
      '',
      false,
      false,
    )
  }

  _getSetMemberItems(setId, page, pageLength) {
    const q = {
      _scope: 'item',
      memberOf: {
        id: setId,
      },
    }

    return this.search(
      JSON.stringify(q),
      '',
      false,
      page,
      pageLength,
      '',
      false,
      false,
    )
  }
}

exports.MLProxy = MLProxy
