/**
 * Find concepts that are related the agent.
 *
 * Used only for estimation of relatedList.
 */
export default (agentId) => ({
  _scope: 'concept',
  relatedToAgent: agentId,
})
