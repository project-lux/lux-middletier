// Find events that used a set containing the item.
const eventsWithItem = (itemId) => ({
  _scope: 'event',
  used: {
    containingItem: {
      id: itemId,
    },
  },
})

export default eventsWithItem
