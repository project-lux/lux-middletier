// Find items that are member of a set used for the event.
export default (eventId) => ({
  _scope: 'item',
  memberOf: {
    usedForEvent: {
      id: eventId,
    },
  },
})
