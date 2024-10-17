// Find agents with the occupation (concept).
export default (conceptId) => ({
  _scope: 'agent',
  occupation: {
    id: conceptId,
  },
})
