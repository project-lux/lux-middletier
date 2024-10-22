// Find concepts influenced by the concept.
const conceptsInfluencedByConcept = (conceptId) => ({
  _scope: 'concept',
  influencedByConcept: {
    id: conceptId,
  },
})

export default conceptsInfluencedByConcept
