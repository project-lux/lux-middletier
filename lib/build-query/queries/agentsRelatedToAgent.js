/**
 * Find agents related to the agent.
 *
 * Used only for estimation of relatedList
 */
const agentsRelatedToAgent = (agentId) => ({
  _scope: 'agent',
  relatedToAgent: agentId,
})

export default agentsRelatedToAgent
