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

export const validResolveScopes = Object.keys(scopeToQuery)
export const validResolveUnits = Object.keys(unitIdentifierMapping)

export class ResolveError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
  }
}

export function getSecondaryResolveQuery(scope, unit, identifier) {
  return scopeToQuery[scope](unit, identifier)
}
