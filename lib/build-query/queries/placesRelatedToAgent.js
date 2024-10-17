/**
 * Find places related to the agent
 *
 * Used only for estimate of relatedList
 */
export default (agentId) => ({
  _scope: 'place',
  relatedToAgent: agentId,
})
