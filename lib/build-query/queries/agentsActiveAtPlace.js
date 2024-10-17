// Find agents who were active at the place.
export default (placeId) => ({
  _scope: 'agent',
  activeAt: {
    id: placeId,
  },
})
