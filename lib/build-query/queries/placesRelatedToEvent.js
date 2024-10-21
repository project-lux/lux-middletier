/**
 * Find agents related to the event.
 *
 * Used only for estimation of relatedList
 */
const placesRelatedToEvent = (eventId) => ({
  _scope: 'place',
  relatedToEvent: eventId,
})

export default placesRelatedToEvent
