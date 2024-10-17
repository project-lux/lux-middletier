export default (eventId) => ({
  _scope: 'item',
  carries: {
    aboutConcept: {
      influencedByEvent: {
        id: eventId,
      },
    },
  },
})
