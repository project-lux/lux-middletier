// Find works that are part of another work.
const worksInWork = (workId) => ({
  _scope: 'work',
  partOfWork: {
    id: workId,
  },
})

export default worksInWork
