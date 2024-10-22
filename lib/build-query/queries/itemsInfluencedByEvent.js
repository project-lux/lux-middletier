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

export default itemsInfluencedByEvent
