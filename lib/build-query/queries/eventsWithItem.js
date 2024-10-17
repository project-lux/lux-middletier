// Find events that used a set containing the item.
export default (itemId) => ({
  _scope: 'event',
  used: {
    containingItem: {
      id: itemId,
    },
  },
})
