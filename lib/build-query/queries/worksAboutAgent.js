// Find works about the agent and
// works about the concepts influenced by the agent.
const worksAboutAgent = (agentId) => ({
  _scope: 'work',
  OR: [
    {
      aboutAgent: {
        id: agentId,
      },
    },
    {
      aboutConcept: {
        influencedByAgent: {
          id: agentId,
        },
      },
    },
  ],

})

module.exports = worksAboutAgent
