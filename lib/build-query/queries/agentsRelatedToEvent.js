/**
 * Find agents related to the event.
 *
 * Used only for estimation of relatedList
 */
const agentsRelatedToEvent = (eventId) => ({
  _scope: 'agent',
  relatedToEvent: eventId,
})

export default agentsRelatedToEvent
