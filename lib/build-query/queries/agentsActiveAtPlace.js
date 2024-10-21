// Find agents who were active at the place.
const agentsActiveAtPlace = (placeId) => ({
  _scope: 'agent',
  activeAt: {
    id: placeId,
  },
})

export default agentsActiveAtPlace
