// Find items that are member of a set used for the event.
const eventsWithSets = (setId) => ({
  _scope: 'event',
  used: {
    id: setId,
  },
})

module.exports = eventsWithSets
