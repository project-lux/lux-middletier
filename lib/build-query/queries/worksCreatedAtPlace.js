// Find works created at the place.
export default (placeId) => ({
  _scope: 'work',
  createdAt: {
    id: placeId,
  },
})
