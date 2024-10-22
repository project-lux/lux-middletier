// Find events that took place at the place.
const eventsHappenedAtPlace = (placeId) => ({
  _scope: 'event',
  tookPlaceAt: {
    id: placeId,
  },
})

export default eventsHappenedAtPlace
