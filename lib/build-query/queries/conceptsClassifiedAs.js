// Find concepts classified as the type.
export default (conceptId) => ({
  _scope: 'concept',
  classification: {
    id: conceptId,
  },
})
