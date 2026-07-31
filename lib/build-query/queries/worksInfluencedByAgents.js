// Find works that were influenced by the agent.
const worksInfluencedByAgents = (agentId) => ({
  _scope: 'work',
  creationInfluencedBy: {
    id: agentId,
  },
})

export default worksInfluencedByAgents
