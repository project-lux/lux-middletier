// Find items encountered by the agent.
export default (agentId) => ({
  _scope: 'item',
  encounteredBy: {
    id: agentId,
  },
})
