// Find events that used a set containing the work.
const worksWithEvent = (eventId) => ({
  _scope: 'work',
  causedByProject: {
    id: eventId,
  },
})

module.exports = worksWithEvent
