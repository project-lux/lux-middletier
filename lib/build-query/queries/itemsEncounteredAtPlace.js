// Find items encountered at place.
const itemsProducedAtPlace = (placeId) => ({
  _scope: 'item',
  encounteredAt: {
    id: placeId,
  },
})

export default itemsProducedAtPlace
