// Find works classified as the type.
export default (conceptId) => ({
  _scope: 'work',
  classification: {
    id: conceptId,
  },
})
