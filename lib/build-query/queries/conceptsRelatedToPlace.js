/**
 * Find concepts related to the place.
 *
 * Used nly for estimate of relatedList.
 */
export default (placeId) => ({
  _scope: 'concept',
  relatedToPlace: placeId,
})
