// Find works created or published by the agent.
const worksCreatedPublishedByAgent = (agentId) => ({
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
  ],
})

module.exports = worksCreatedPublishedByAgent
