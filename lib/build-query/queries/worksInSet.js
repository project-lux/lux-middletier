// Find works that are part of the set.
export default (setId) => ({
  _scope: 'work',
  partOf: {
    id: setId,
  },
})
