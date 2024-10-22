// Find agents who were born at the place.
const agentsBornAtPlace = (placeId) => ({
  _scope: 'agent',
  startAt: {
    id: placeId,
  },
})

export default agentsBornAtPlace
