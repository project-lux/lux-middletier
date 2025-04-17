// Find sets that are about an event.
const setAboutEvent = (eventId) => ({
    _scope: 'set',
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
  
  export default setAboutEvent
