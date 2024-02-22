// Find events that used a set containing the item.
const eventsWithItem = (itemId) => ({
  _scope: 'event',
  used: {
    containing: {
      id: itemId,
    },
  },
})

module.exports = eventsWithItem
