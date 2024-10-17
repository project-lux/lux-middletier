// Find agents who died at the place.
export default (placeId) => ({
  _scope: 'agent',
  endAt: {
    id: placeId,
  },
})
