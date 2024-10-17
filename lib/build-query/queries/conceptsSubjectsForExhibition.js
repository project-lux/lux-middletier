export default (eventId) => ({
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
