// Find works that are part of the set.
const worksInSet = (setId) => ({
  _scope: 'work',
  partOfSet: {
    id: setId,
  },
})

export default worksInSet
