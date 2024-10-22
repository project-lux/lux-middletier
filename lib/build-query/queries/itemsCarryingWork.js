// Find items that carry or show the work.
// item.carries covers both "carries" and "shows"
const itemsCarryingWork = (workId) => ({
  _scope: 'item',
  carries: {
    id: workId,
  },
})

export default itemsCarryingWork
