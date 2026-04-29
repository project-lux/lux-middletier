// Find works created or published at the place.
const worksCreatedPublishedAtPlace = (placeId) => ({
  _scope: 'work',
  OR: [
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

export default worksCreatedPublishedAtPlace
