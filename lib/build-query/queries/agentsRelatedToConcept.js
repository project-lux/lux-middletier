/**
 * Find agents related to the concept.
 *
 * Used only for estimation of relatedList
 */
export default (conceptId) => ({
  _scope: 'agent',
  relatedToConcept: conceptId,
})
