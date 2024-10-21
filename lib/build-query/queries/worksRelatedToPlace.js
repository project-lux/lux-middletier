// Find works related to the place.
const worksRelatedToPlace = (placeId) => ({
  _scope: 'work',
  OR: [
    {
      aboutPlace: {
        id: placeId,
      },
    },
    {
      createdAt: {
        id: placeId,
      },
    },
    {
      publishedAt: {
        id: placeId,
      },
    },
  ],
})

export default worksRelatedToPlace
