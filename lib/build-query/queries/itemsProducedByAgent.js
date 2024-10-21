// Find items produced by the agent.
const itemsProducedByAgent = (agentId) => ({
  _scope: 'item',
  producedBy: {
    id: agentId,
  },
})

export default itemsProducedByAgent
