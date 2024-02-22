// Find works about the place.
const worksAboutPlace = (placeId) => ({
  _scope: 'work',
  OR: [
    {
      aboutPlace: {
        id: placeId,
      },
    },
  ],
})

module.exports = worksAboutPlace
