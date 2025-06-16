// Find works that are about an event.
const worksAboutEvent = (eventId) => ({
  _scope: 'work',
  aboutEvent: {
    id: eventId,
  },
})

export default worksAboutEvent
