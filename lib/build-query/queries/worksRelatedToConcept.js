// Find works related to the concept.
const worksRelatedToConcept = (conceptId) => ({
  _scope: 'work',
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
      language: {
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
  ],
})

export default worksRelatedToConcept
