// Find events that use a set.
const eventsWithSet = (setId) => ({
  _scope: 'event',
  used: {
    id: setId,
  },
})

export default eventsWithSet
