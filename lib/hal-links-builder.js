const queries = require('./build-query/builder')

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
    const q = JSON.stringify(queries.buildEstimatesQuery(doc))
    let estimates = {}

    if (q !== 'null') {
      // estimates = await this.mlProxy.searchEstimates(q)
      estimates = await this.mlProxy.searchWillMatch(q)
    }

    Object.keys(estimates).forEach((key) => {
      let val = estimates[key]

      if (val === null) {
        val = {
          estimate: null,
        }
      }

      // console.log('estimate:', key, val)

      // if (val.estimate > 0 || val.estimate === null) {
      //   links[key] = {
      //     href: queries.queryBuilders[key](doc.id),
      //     _estimate: val.estimate,
      //   }
      // }

      if (val.hasOneOrMoreResult && val.hasOneOrMoreResult > 0) {
        const query = queries.queryBuilders[key](doc.id)
        delete query._scope
        links[key] = {
          href: queries.queryBuilders[key](doc.id),
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
