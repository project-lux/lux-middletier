/**
 * Find places related to the concept.
 *
 * Used only for estimate of relatedList.
 */
export default (conceptId) => ({
  _scope: 'place',
  relatedToConcept: conceptId,
})
