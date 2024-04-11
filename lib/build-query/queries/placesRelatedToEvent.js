/**
 * Find agents related to the event.
 *
 * Used only for estimation of relatedList
 */
const placesRelatedToEvent = (eventId) => ({
  _scope: 'place',
  relatedToEvent: eventId,
})

module.exports = placesRelatedToEvent
