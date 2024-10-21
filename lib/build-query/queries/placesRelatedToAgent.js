/**
 * Find places related to the agent
 *
 * Used only for estimate of relatedList
 */
const placesRelatedToAgent = (agentId) => ({
  _scope: 'place',
  relatedToAgent: agentId,
})

export default placesRelatedToAgent
