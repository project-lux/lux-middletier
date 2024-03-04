const conceptsSubjectsForPeriod = (eventId) => ({
  _scope: 'concept',
  influencedByEvent: {
    id: eventId,
  },
})

module.exports = conceptsSubjectsForPeriod
