/**
 * Find places related to the place.
 *
 * Used only for estimate of relatedList.
 */
const placesRelatedToPlace = (placeId) => ({
  _scope: 'place',
  relatedToPlace: placeId,
})

export default placesRelatedToPlace
