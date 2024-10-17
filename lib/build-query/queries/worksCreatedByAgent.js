// Find works created by the agent
export default (agentId) => ({
  _scope: 'work',
  createdBy: {
    id: agentId,
  },
})
