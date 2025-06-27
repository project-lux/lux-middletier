// Find works about the agent and
// works about the concepts influenced by the agent.
const worksAboutAgent = (agentId) => ({
  _scope: 'work',
  aboutAgent: {
    id: agentId,
  },
})

export default worksAboutAgent
