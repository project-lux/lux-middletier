// Find sub-concepts of the concept.
export default (conceptId) => ({
  _scope: 'concept',
  broader: {
    id: conceptId,
  },
})
