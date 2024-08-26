// Find items that are the subject of works.
const itemsSubjectOfWork = (itemId) => ({
  _scope: 'work',
  subjectOfItem: {
    id: itemId,
  },
})

module.exports = itemsSubjectOfWork
