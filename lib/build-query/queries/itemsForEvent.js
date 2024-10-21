// Find items that are member of a set used for the event.
const itemsForEvent = (eventId) => ({
  _scope: 'item',
  memberOf: {
    usedForEvent: {
      id: eventId,
    },
  },
})

export default itemsForEvent
