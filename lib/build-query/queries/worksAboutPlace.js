// Find works about the place.
export default (placeId) => ({
  _scope: 'work',
  OR: [
    {
      aboutPlace: {
        id: placeId,
      },
    },
    {
      aboutConcept: {
        influencedByPlace: {
          id: placeId,
        },
      },
    },
  ],
})
