// Find sets created, published, or influenced by the agent.
const setCreatedPublishedInfluencedByAgent = (agentId) => ({
  _scope: 'set',
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

export default setCreatedPublishedInfluencedByAgent
