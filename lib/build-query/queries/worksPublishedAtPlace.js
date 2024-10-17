// Find works published at the place.
export default (placeId) => ({
  _scope: 'work',
  publishedAt: {
    id: placeId,
  },
})
