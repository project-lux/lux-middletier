// Find works that are the subject of another work.
const worksSubjectOfWork = (workId) => ({
  _scope: 'work',
  subjecOfWork: {
    id: workId,
  },
})

module.exports = worksSubjectOfWork
