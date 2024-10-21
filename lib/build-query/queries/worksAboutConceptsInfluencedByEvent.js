// Find the work by ID
const worksAboutConceptsInfluencedByEvent = (eventId) => ({
  _scope: 'work',
  aboutConcept: {
    influencedByEvent: {
      id: eventId,
    },
  },
})

export default worksAboutConceptsInfluencedByEvent
