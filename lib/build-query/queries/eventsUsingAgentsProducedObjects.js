// Find events that took place at the place.
export default (agentId) => ({
  _scope: 'event',
  used: {
    containingItem: {
      producedBy: {
        id: agentId,
      },
    },
  },
})
