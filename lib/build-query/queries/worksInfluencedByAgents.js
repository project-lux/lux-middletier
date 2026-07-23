// Find works that were influenced by the agent.
const worksInfluencedByAgents = (agentId) => ({
  _scope: 'works',
  creationInfluencedBy: {
    id: agentId,
  },
})

export default worksInfluencedByAgents
