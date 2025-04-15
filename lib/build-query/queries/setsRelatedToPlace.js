// Find sets related to the place.
const setsRelatedToPlace = (placeId) => ({
    _scope: 'set',
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
  
  export default setsRelatedToPlace
