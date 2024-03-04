const conceptsSubjectsForExhibition = (eventId) => ({
  _scope: 'concept',
  subjectOfConcept: {
    carriedBy: {
      memberOf: {
        usedForEvent: {
          id: eventId,
        },
      },
    },
  },
})

module.exports = conceptsSubjectsForExhibition
