// Find events that use a set.
const eventsWithSet = (setId) => ({
  _scope: 'event',
  used: {
    id: setId,
  },
})

module.exports = eventsWithSet
