// Find items produced or encountered by the agent.
export default (agentId) => ({
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
