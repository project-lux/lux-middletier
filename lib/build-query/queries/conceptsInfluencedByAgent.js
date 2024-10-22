// Find concepts that were influenced by the agent.
const conceptsInfluencedByAgent = (agentId) => ({
  _scope: 'concept',
  influencedByAgent: {
    id: agentId,
  },
})

export default conceptsInfluencedByAgent
