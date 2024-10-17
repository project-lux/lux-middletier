/**
 * Find agents related to the place.
 *
 * Used only for estimate of relatedList.
 */
export default (placeId) => ({
  _scope: 'agent',
  relatedToPlace: placeId,
})
