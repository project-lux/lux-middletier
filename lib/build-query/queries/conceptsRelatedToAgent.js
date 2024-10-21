/**
 * Find concepts that are related the agent.
 *
 * Used only for estimation of relatedList.
 */
const conceptsRelatedToAgent = (agentId) => ({
  _scope: 'concept',
  relatedToAgent: agentId,
})

export default conceptsRelatedToAgent
