// Find agents who were born at the place.
export default (placeId) => ({
  _scope: 'agent',
  startAt: {
    id: placeId,
  },
})
