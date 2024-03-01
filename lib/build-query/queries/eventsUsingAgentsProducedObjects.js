// Find events that took place at the place.
const eventsUsingAgentsProducedObjects = (agentId) => ({
  _scope: 'event',
  used: {
    containing: {
      producedBy: {
        id: agentId,
      },
    },
  },
})

module.exports = eventsUsingAgentsProducedObjects
