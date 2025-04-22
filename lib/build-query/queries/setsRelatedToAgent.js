// Find sets related to the agent.
const setsRelatedToAgent = (agentId) => ({
  _scope: 'set',
  OR: [
    {
      aboutAgent: {
        id: agentId,
      },
    },
    {
      createdBy: {
        id: agentId,
      },
    },
    {
      publishedBy: {
        id: agentId,
      },
    },
  ],
})

export default setsRelatedToAgent
