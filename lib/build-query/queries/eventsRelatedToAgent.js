/**
 * Find events that are related the agent.
*/
const eventsRelatedToAgent = (agentId) => ({
  _scope: 'event',
  relatedToAgent: agentId,
})

export default eventsRelatedToAgent
