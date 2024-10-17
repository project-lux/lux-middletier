// Find concepts influenced by the concept.
export default (conceptId) => ({
  _scope: 'concept',
  influencedByConcept: {
    id: conceptId,
  },
})
