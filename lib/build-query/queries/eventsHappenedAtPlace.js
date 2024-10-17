// Find events that took place at the place.
export default (placeId) => ({
  _scope: 'event',
  tookPlaceAt: {
    id: placeId,
  },
})
