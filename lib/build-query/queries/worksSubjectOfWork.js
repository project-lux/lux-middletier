// Find works that are the subject of another work.
const worksSubjectOfWork = (workId) => ({
  _scope: 'work',
  subjectOfWork: {
    id: workId,
  },
})

module.exports = worksSubjectOfWork
