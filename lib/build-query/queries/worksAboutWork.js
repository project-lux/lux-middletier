// Find works that are about an work.
export default (workId) => ({
  _scope: 'work',
  aboutWork: {
    id: workId,
  },
})
