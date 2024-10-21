// Find agents with the nationality (concept).
const agentsWithNationality = (conceptId) => ({
  _scope: 'agent',
  nationality: {
    id: conceptId,
  },
})

export default agentsWithNationality
