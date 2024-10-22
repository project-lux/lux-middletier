/**
 * Find concepts related to the concepts.
 *
 * Used only for estimation of relatedList.
 */
const conceptsRelatedToConcept = (conceptId) => ({
  _scope: 'concept',
  relatedToConcept: conceptId,
})

export default conceptsRelatedToConcept
