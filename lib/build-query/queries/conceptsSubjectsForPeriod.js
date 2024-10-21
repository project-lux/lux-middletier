const conceptsSubjectsForPeriod = (eventId) => ({
  _scope: 'concept',
  influencedByEvent: {
    id: eventId,
  },
})

export default conceptsSubjectsForPeriod
