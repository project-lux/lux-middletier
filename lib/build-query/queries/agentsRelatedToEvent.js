/**
 * Find agents related to the event.
 *
 * Used only for estimation of relatedList
 */
export default (eventId) => ({
  _scope: 'agent',
  relatedToEvent: eventId,
})
