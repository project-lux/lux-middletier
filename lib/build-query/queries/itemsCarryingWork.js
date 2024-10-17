// Find items that carry or show the work.
// item.carries covers both "carries" and "shows"
export default (workId) => ({
  _scope: 'item',
  carries: {
    id: workId,
  },
})
