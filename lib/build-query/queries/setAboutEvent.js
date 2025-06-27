// Find sets that are about an event.
const setAboutEvent = (eventId) => ({
    _scope: 'set',
    aboutEvent: {
      id: eventId,
    },
  })
  
  export default setAboutEvent
