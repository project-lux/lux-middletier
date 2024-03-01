// Find events that took place at the place.
const eventsCarriedOutByAgent = (agentId) => ({
  _scope: 'event',
  carriedOutBy: {
    id: agentId,
  },
})

module.exports = eventsCarriedOutByAgent
