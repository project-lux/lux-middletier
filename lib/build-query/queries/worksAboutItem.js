// Find works that are about an item.
export default (itemId) => ({
  _scope: 'work',
  aboutItem: {
    id: itemId,
  },
})
