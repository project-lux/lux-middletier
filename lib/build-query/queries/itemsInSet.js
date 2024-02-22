// Find items that are member of the set.
const itemsInSet = (setId) => ({
  _scope: 'item',
  memberOf: {
    id: setId,
  },
})

module.exports = itemsInSet
