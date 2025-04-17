// Find sets that were caused by the event.
const setCausedByEvent = (eventId) => ({
    _scope: 'set',
    creationCausedBy: {
      id: eventId,
    },
  })
  
  export default setCausedByEvent
