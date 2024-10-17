// Find items produced by the agent.
export default (agentId) => ({
  _scope: 'item',
  producedBy: {
    id: agentId,
  },
})
