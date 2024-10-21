/**
 * Find agents related to the concept.
 *
 * Used only for estimation of relatedList
 */
const agentsRelatedToConcept = (conceptId) => ({
  _scope: 'agent',
  relatedToConcept: conceptId,
})

export default agentsRelatedToConcept
