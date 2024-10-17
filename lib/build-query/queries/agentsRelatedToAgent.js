/**
 * Find agents related to the agent.
 *
 * Used only for estimation of relatedList
 */
export default (agentId) => ({
  _scope: 'agent',
  relatedToAgent: agentId,
})
