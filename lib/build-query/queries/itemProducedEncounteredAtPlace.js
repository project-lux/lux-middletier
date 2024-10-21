// Find items that were produced or encountered at the place.
const itemsProducedEncounteredAtPlace = (placeId) => ({
  _scope: 'item',
  OR: [
    {
      producedAt: {
        id: placeId,
      },
    }, {
      encounteredAt: {
        id: placeId,
      },
    },
  ],
})

export default itemsProducedEncounteredAtPlace
