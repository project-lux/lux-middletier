const builder = require('./build-query/builder')
const queryHelper = require('./build-query/helper')

const curies = [
  {
    name: 'la',
    href: 'https://linked.art/api/1.0/rels/{rel}',
    templated: true,
  },
  {
    name: 'lux',
    href: 'https://lux.collections.yale.edu/api/rels/{rel}',
    templated: true,
  },
]

class HalLinksBuilder {
  constructor(mlProxy) {
    this.mlProxy = mlProxy
  }

  async getLinks(doc) {
    const links = {}
    const q = JSON.stringify(builder.buildEstimatesQuery(doc))
    let rawEstimates = {}

    if (q !== 'null') {
      rawEstimates = await this.mlProxy.searchWillMatch(q)
    }

    const estimates = queryHelper.parseResults(rawEstimates)

    Object.keys(estimates).forEach((key) => {
      let val = estimates[key]

      if (val === null) {
        val = {
          estimate: null,
        }
      }

      if (val.hasOneOrMoreResult && val.hasOneOrMoreResult > 0) {
        const query = builder.queryBuilders[key](doc.id)

        links[key] = {
          href: query,
          _estimate: 1,
        }
      }
    })

    return {
      curies,
      self: {
        href: doc.id,
      },
      ...links,
    }
  }
}

module.exports = {
  HalLinksBuilder,
}
