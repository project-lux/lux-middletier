// Find works that are part of the set.
const worksInSet = (setId) => ({
  _scope: 'set',
  memberOf: {
    id: setId,
  },
})

export default worksInSet
