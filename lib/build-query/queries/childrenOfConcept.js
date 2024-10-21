// Find sub-concepts of the concept.
const childrenOfConcept = (conceptId) => ({
  _scope: 'concept',
  broader: {
    id: conceptId,
  },
})

export default childrenOfConcept
