// Find events that are used in a set.
const eventsWithSets = (setId) => ({
  _scope: 'event',
  used: {
    id: setId,
  },
})

module.exports = eventsWithSets
