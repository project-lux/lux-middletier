// Find works about the place.
const worksAboutPlace = (placeId) => ({
  _scope: 'work',
  aboutPlace: {
    id: placeId,
  },
})

export default worksAboutPlace
