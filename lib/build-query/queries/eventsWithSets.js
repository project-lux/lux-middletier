// Find events that use a set.
const eventsWithSets = (setId) => ({
  _scope: 'event',
  used: {
    id: setId,
  },
})

module.exports = eventsWithSets
