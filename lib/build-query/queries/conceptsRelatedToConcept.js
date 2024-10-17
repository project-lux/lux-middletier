/**
 * Find concepts related to the concepts.
 *
 * Used only for estimation of relatedList.
 */
export default (conceptId) => ({
  _scope: 'concept',
  relatedToConcept: conceptId,
})
