// Find items that are member of a set used for the event.
export default (eventId) => ({
  _scope: 'work',
  carriedBy: {
    memberOf: {
      usedForEvent: {
        id: eventId,
      },
    },
  },
})
