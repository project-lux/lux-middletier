// Find works that are part of another work.
const worksContainingWork = (workId) => ({
  _scope: 'work',
  containsWork: {
    id: workId,
  },
})

export default worksContainingWork
