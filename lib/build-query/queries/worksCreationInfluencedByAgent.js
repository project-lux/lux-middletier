// Find works that have creation influenced by this agent
const worksCreationInfluenced = (agentId) => ({
  _scope: 'work',
  creationInfluencedBy: {
    id: agentId,
  },
})

module.exports = worksCreationInfluenced
