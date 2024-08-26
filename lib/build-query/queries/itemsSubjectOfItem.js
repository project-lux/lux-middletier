// Find items that are the subject of another item.
const itemsSubjectOfItem = (itemId) => ({
  _scope: 'item',
  subjectOfItem: {
    id: itemId,
  },
})

module.exports = itemsSubjectOfItem
