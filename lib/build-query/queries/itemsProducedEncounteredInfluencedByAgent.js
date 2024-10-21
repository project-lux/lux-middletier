// Find items produced or encountered by the agent.
const itemsProducedEncounteredInfluencedByAgent = (agentId) => ({
  _scope: 'item',
  OR: [
    {
      producedBy: {
        id: agentId,
      },
    },
    {
      encounteredBy: {
        id: agentId,
      },
    },
    {
      productionInfluencedBy: {
        id: agentId,
      },
    },
  ],
})

export default itemsProducedEncounteredInfluencedByAgent
