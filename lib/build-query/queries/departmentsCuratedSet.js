// Find departments (agents) that curated a set containing the set.
const departmentsCuratedSet = (setId) => ({
  _scope: 'agent',
  curated: {
    containingSet: {
      id: setId,
    },
  },
})

export default departmentsCuratedSet
