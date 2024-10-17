// Find the work by ID
export default (eventId) => ({
  _scope: 'work',
  aboutConcept: {
    influencedByEvent: {
      id: eventId,
    },
  },
})
