// Find sets created at the agent.
const setCreatedByAgent = (agentId) => ({
  _scope: 'set',
  createdBy: {
    id: agentId,
  },
})

export default setCreatedByAgent
