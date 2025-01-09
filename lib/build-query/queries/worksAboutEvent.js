// Find works that are about an event.
const worksAboutEvent = (eventId) => ({
  _scope: 'work',
  OR: [
    {
      aboutEvent: {
        id: eventId,
      },
    },
    {
      aboutConcept: {
        influencedByEvent: {
          id: eventId,
        },
      },
    },
  ]
})

export default worksAboutEvent
