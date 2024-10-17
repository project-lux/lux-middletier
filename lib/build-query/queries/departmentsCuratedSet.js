// Find departments (agents) that curated a set containing the set.
export default (setId) => ({
  _scope: 'agent',
  curated: {
    containingSet: {
      id: setId,
    },
  },
})
