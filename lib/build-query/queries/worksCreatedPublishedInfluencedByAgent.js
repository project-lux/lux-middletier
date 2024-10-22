// Find works created or published by the agent.
const worksCreatedPublishedInfluencedByAgent = (agentId) => ({
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

export default worksCreatedPublishedInfluencedByAgent
