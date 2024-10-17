// Find items that are member of the set.
export default (setId) => ({
  _scope: 'item',
  memberOf: {
    id: setId,
  },
})
