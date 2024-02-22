// Find dapartments that curated a set containing the item.
const departmentsWithItem = (itemId) => ({
  _scope: 'agent',
  curated: {
    containing: {
      id: itemId,
    },
  },
})

module.exports = departmentsWithItem
