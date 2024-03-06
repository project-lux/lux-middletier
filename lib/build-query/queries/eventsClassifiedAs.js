// Find events classified as the type.
const eventsClassifiedAs = (conceptId) => ({
  _scope: 'event',
  classification: {
    id: conceptId,
  },
})

module.exports = eventsClassifiedAs
