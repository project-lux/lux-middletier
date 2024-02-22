// Find items produced or encountered by the agent.
const itemsProducedEncounteredByAgent = (agentId) => ({
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
  ],

})

module.exports = itemsProducedEncounteredByAgent
