const unitIdentifierMapping = {
  lml: 'https://paperbase.xyz/records/lml.json',
  pmc: 'https://data.paul-mellon-centre.ac.uk/group/pmc',
  ycba: 'http://vocab.getty.edu/ulan/500303557',
  ypm: 'http://vocab.getty.edu/ulan/500303561',
  yuag: 'http://vocab.getty.edu/ulan/500303559',
  yul: 'http://vocab.getty.edu/ulan/500303563',
}

const scopeToQuery = {
  objects: (unit, identifier) => JSON.stringify({
    AND: [
      {
        identifier,
      },
      {
        memberOf: {
          curatedBy: {
            OR: [
              {
                memberOf: {
                  identifier: unitIdentifierMapping[unit],
                },
              },
              {
                identifier: unitIdentifierMapping[unit],
              },
            ],
          },
        },
      },
    ],
  }),
  works: (unit, identifier) => JSON.stringify({
    AND: [
      {
        identifier,
      },
      {
        carriedBy: {
          memberOf: {
            curatedBy: {
              OR: [
                {
                  memberOf: {
                    identifier: unitIdentifierMapping[unit],
                  },
                },
                {
                  identifier: unitIdentifierMapping[unit],
                },
              ],
            },
          },
        },
      },
    ],
  }),
}

const validScopes = Object.keys(scopeToQuery)
const validUnits = Object.keys(unitIdentifierMapping)

class ResolveError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
  }
}

function getSecondaryResolveQuery(scope, unit, identifier) {
  return scopeToQuery[scope](unit, identifier)
}

exports.getSecondaryResolveQuery = getSecondaryResolveQuery
exports.ResolveError = ResolveError
exports.validResolveScopes = validScopes
exports.validResolveUnits = validUnits
