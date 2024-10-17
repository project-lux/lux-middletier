// Find events classified as the type.
export default (conceptId) => ({
  _scope: 'event',
  classification: {
    id: conceptId,
  },
})
