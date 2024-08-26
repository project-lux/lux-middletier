// Find works that are about an work.
const worksAboutWork = (workId) => ({
  _scope: 'work',
  aboutWork: {
    id: workId,
  },
})

module.exports = worksAboutWork
