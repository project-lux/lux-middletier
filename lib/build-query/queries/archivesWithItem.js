// Find archives containing the item.
export default (itemId) => ({
  _scope: 'set',
  AND: [
    {
      classification: {
        identifier: 'http://vocab.getty.edu/aat/300375748',
      },
    },
    {
      containingItem: {
        id: itemId,
      },
    },
  ],
})
