// Find items that are member of a set used for the event.
const worksForEvent = (eventId) => ({
  _scope: 'work',
  carriedBy: {
    memberOf: {
      usedForEvent: {
        id: eventId,
      },
    },
  },
})

export default worksForEvent
