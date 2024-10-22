// Find places classified as the type.
const placesClassifiedAs = (conceptId) => ({
  _scope: 'place',
  classification: {
    id: conceptId,
  },
})

export default placesClassifiedAs
