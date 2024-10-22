// Find items classified as the type.
const itemsClassifiedAs = (conceptId) => ({
  _scope: 'item',
  classification: {
    id: conceptId,
  },
})

export default itemsClassifiedAs
