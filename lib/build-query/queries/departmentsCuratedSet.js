// Find departments (agents) that curated a set containing the set.
const departmentsCuratedSet = (setId) => ({
  _scope: 'agent',
  curated: {
    containing: {
      id: setId,
    },
  },
})

module.exports = departmentsCuratedSet
