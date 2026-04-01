import { buildEstimatesQuery, queryBuilders } from "./build-query/builder.js";
import { parseResults } from "./build-query/helper.js";

const curies = [
  {
    name: "la",
    href: "https://linked.art/api/1.0/rels/{rel}",
    templated: true,
  },
  {
    name: "lux",
    href: "https://lux.collections.yale.edu/api/rels/{rel}",
    templated: true,
  },
];

class HalLinksBuilder {
  constructor(mlProxy, unitName) {
    this.mlProxy = mlProxy;
    this.unitName = unitName;
  }

  async getLinks(doc) {
    const links = {};
    const queries = buildEstimatesQuery(doc);
    let rawEstimates = {};

    if (queries && Object.keys(queries).length > 0) {
      try{
      rawEstimates = await this.mlProxy.searchWillMatch(this.unitName, JSON.stringify(queries));
      } catch (error) {
        console.error("Error fetching estimates:", error);
      }
    }

    const estimates = parseResults(rawEstimates);

    Object.keys(estimates).forEach((key) => {
      let val = estimates[key];

      if (val === null) {
        val = {
          estimate: null,
        };
      }

      if (val.hasOneOrMoreResult && val.hasOneOrMoreResult > 0) {
        const query = queryBuilders[key](doc.id);

        links[key] = {
          href: query,
          _estimate: 1,
        };
      }
    });

    return {
      curies,
      self: {
        href: doc.id,
      },
      ...links,
    };
  }
}

export default HalLinksBuilder;
