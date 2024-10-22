// Find agents who died at the place.
const agentsDiedAtPlace = (placeId) => ({
  _scope: 'agent',
  endAt: {
    id: placeId,
  },
})

export default agentsDiedAtPlace
