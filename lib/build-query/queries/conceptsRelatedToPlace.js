/**
 * Find concepts related to the place.
 *
 * Used nly for estimate of relatedList.
 */
const conceptsRelatedToPlace = (placeId) => ({
  _scope: 'concept',
  relatedToPlace: placeId,
})

export default conceptsRelatedToPlace
