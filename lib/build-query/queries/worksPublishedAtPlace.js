// Find works published at the place.
const worksPublishedAtPlace = (placeId) => ({
  _scope: 'work',
  publishedAt: {
    id: placeId,
  },
})

export default worksPublishedAtPlace
