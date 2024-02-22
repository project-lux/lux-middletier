// item.carries covers both "carries" and "shows"
const workShownBy = (workId) => ({
  _scope: 'item',
  carries: {
    id: workId,
  },
})

module.exports = workShownBy
