// Find items classified as the type.
export default (conceptId) => ({
  _scope: 'item',
  classification: {
    id: conceptId,
  },
})
