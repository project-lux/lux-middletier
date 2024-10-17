// Find concepts that were influenced by the agent.
export default (agentId) => ({
  _scope: 'concept',
  influencedByAgent: {
    id: agentId,
  },
})
