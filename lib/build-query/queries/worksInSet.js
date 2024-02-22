// Find works that are part of the set.
const worksInSet = (setId) => ({
  _scope: 'work',
  partOf: {
    id: setId,
  },
})

module.exports = worksInSet
