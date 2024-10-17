// Find items produced at the place.
export default (placeId) => ({
  _scope: 'item',
  producedAt: {
    id: placeId,
  },
})
