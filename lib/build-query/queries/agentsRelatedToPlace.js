/**
 * Find agents related to the place.
 *
 * Used only for estimate of relatedList.
 */
const agentsRelatedToPlace = (placeId) => ({
  _scope: 'agent',
  relatedToPlace: placeId,
})

module.exports = agentsRelatedToPlace
