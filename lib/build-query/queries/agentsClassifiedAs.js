// Find agents classified as the type.
export default (conceptId) => ({
  _scope: 'agent',
  classification: {
    id: conceptId,
  },
})
