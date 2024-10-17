// Find places that are parts of the place.
export default (placeId) => ({
  _scope: 'place',
  partOf: {
    id: placeId,
  },
})
