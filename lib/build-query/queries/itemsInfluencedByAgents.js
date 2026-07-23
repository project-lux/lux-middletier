// Find items that were influenced by the agent.
const itemsInfluencedByAgents = (agentId) => ({
  _scope: 'item',
  productionInfluencedBy: {
    id: agentId,
  },
})

export default itemsInfluencedByAgents
