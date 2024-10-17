// Find concepts influenced by the place.
export default (placeId) => ({
  _scope: 'concept',
  influencedByPlace: {
    id: placeId,
  },
})
