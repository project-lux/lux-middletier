// Find dapartments that curated a set containing the item.
export default (itemId) => ({
  _scope: 'agent',
  curated: {
    containingItem: {
      id: itemId,
    },
  },
})
