/**
 * Find places related to the concept.
 *
 * Used only for estimate of relatedList.
 */
const placesRelatedToConcept = (conceptId) => ({
  _scope: 'place',
  relatedToConcept: conceptId,
})

export default placesRelatedToConcept
