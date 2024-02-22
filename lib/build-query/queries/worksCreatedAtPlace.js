// Find works created at the place.
const worksCreatedAtPlace = (placeId) => ({
  _scope: 'work',
  createdAt: {
    id: placeId,
  },
})

module.exports = worksCreatedAtPlace
