// Find sets that have a relation to an event in order to show the types (setType facet) of related sets.
const setForEventSetType = (eventId) => ({
    _scope: 'set',
    OR: [
      {
        aboutEvent: {
          id: eventId,
        },
      },
      {
        creationCausedBy: {
            id: eventId
        }
      }
    ]
  })
  
  export default setForEventSetType
