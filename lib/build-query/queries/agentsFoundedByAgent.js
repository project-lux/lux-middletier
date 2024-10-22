// Find agents that were founded by this agent.
const agentsFoundedByAgent = (agentId) => ({
  _scope: 'agent',
  foundedBy: {
    id: agentId,
  },
})

export default agentsFoundedByAgent
