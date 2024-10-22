// Find places that are parts of the place.
const partsOfPlace = (placeId) => ({
  _scope: 'place',
  partOf: {
    id: placeId,
  },
})

export default partsOfPlace
