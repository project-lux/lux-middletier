// Find archives containing the item.
const archivesWithItem = (itemId) => ({
  _scope: 'set',
  AND: [
    {
      classification: {
        identifier: 'http://vocab.getty.edu/aat/300375748',
      },
    },
    {
      containing: {
        id: itemId,
      },
    },
  ],
})

module.exports = archivesWithItem
