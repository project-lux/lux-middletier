// Find works that are part of the set.
const setsInSet = (setId) => ({
  _scope: 'set',
  memberOf: {
    id: setId,
  },
})

export default setsInSet
