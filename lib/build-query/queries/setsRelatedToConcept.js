// Find sets related to the concept.
const setsRelatedToConcept = (conceptId) => ({
  _scope: 'set',
  OR: [
    {
      classification: {
        OR: [
          {
            id: conceptId,
          },
          {
            influencedByConcept: {
              id: conceptId,
            },
          },
        ],
      },
    },
    {
      aboutConcept: {
        id: conceptId,
      },
    },
  ],
})

export default setsRelatedToConcept
