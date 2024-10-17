// Find events that use a set.
export default (setId) => ({
  _scope: 'event',
  used: {
    id: setId,
  },
})
