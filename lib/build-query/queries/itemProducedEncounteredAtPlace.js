// Find items that were produced or encountered at the place.
export default (placeId) => ({
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
