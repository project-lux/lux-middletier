// Find dapartments that curated a set containing the item.
const departmentsWithItem = (itemId) => ({
  _scope: 'agent',
  curated: {
    containingItem: {
      id: itemId,
    },
  },
})

export default departmentsWithItem
