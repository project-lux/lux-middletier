// Find works related to the place.
export default (placeId) => ({
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
