// Find events that took place at the place.
export default (agentId) => ({
  _scope: 'event',
  carriedOutBy: {
    id: agentId,
  },
})
