// Find agents classified as the type.
const agentsClassifiedAs = (conceptId) => ({
  _scope: 'agent',
  classification: {
    id: conceptId,
  },
})

module.exports = agentsClassifiedAs
