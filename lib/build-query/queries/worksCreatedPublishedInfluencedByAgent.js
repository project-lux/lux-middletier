// Find works created or published by the agent.
export default (agentId) => ({
  _scope: 'work',
  OR: [
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
    {
      creationInfluencedBy: {
        id: agentId,
      },
    },
  ],
})
