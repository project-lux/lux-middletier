// Find concepts classified as the type.
const conceptsClassifiedAs = (conceptId) => ({
  _scope: 'concept',
  classification: {
    id: conceptId,
  },
})

module.exports = conceptsClassifiedAs
