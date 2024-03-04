const itemsInfluencedByEvent = (eventId) => ({
  _scope: 'item',
  carries: {
    aboutConcept: {
      influencedByEvent: {
        id: eventId,
      },
    },
  },
})

module.exports = itemsInfluencedByEvent
