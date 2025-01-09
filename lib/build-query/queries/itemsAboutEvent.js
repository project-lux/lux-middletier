const itemsAboutEvent = (eventId) => ({
  _scope: 'item',
  carries: {
    OR: [
      {
      aboutEvent: {
        id: eventId
      },
    },
    {
      aboutConcept: {
        influencedByEvent: {
          id: eventId,
        },
      },
    },
  ]},
})

export default itemsAboutEvent
