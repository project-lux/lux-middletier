// Find items encountered by the agent.
const itemsEncounteredByAgent = (agentId) => ({
  _scope: 'item',
  encounteredBy: {
    id: agentId,
  },
})

module.exports = itemsEncounteredByAgent
