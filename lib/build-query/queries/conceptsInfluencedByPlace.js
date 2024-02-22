// Find concepts influenced by the place.
const conceptsInfluencedByPlace = (placeId) => ({
  _scope: 'concept',
  influencedByPlace: {
    id: placeId,
  },
})

module.exports = conceptsInfluencedByPlace
