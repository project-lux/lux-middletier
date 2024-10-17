// Find places classified as the type.
export default (conceptId) => ({
  _scope: 'place',
  classification: {
    id: conceptId,
  },
})
