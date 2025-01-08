// Find works that were caused by the event.
const worksCausedByEvent = (eventId) => ({
  _scope: 'work',
  creationCausedBy: {
    id: eventId,
  },
})

export default worksCausedByEvent
