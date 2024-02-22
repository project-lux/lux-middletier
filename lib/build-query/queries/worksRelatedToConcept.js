// Find works related to the concept.
const worksRelatedToConcept = (conceptId) => ({
  _scope: 'work',
  OR: [
    {
      classification: {
        id: conceptId,
      },
    },
    {
      language: {
        id: conceptId,
      },
    },
    {
      aboutConcept: {
        id: conceptId,
      },
    },
  ],
})

module.exports = worksRelatedToConcept
