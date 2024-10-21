// Find works created by the agent
const worksCreatedByAgent = (agentId) => ({
  _scope: 'work',
  createdBy: {
    id: agentId,
  },
})

export default worksCreatedByAgent
