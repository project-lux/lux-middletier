// Find works created at the place.
const worksCreatedAtPlace = (placeId) => ({
  _scope: 'work',
  createdAt: {
    id: placeId,
  },
})

export default worksCreatedAtPlace
