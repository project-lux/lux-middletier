// Find works published at the place.
const worksPublishedAtPlace = (placeId) => ({
  _scope: 'work',
  publishedAt: {
    id: placeId,
  },
})

module.exports = worksPublishedAtPlace
