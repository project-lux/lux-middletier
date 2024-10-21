// Find items produced at the place.
const itemsProducedAtPlace = (placeId) => ({
  _scope: 'item',
  producedAt: {
    id: placeId,
  },
})

export default itemsProducedAtPlace
