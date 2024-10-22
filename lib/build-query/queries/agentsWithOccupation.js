// Find agents with the occupation (concept).
const agentsWithOccupation = (conceptId) => ({
  _scope: 'agent',
  occupation: {
    id: conceptId,
  },
})

export default agentsWithOccupation
