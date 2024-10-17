// Find agents that were founded by this agent.
export default (agentId) => ({
  _scope: 'agent',
  foundedBy: {
    id: agentId,
  },
})
