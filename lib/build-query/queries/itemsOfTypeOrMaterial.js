// Find items that are classfied as the concept or
// whose material is the concept.
export default (conceptId) => ({
  _scope: 'item',
  OR: [
    {
      classification: {
        id: conceptId,
      },
    },
    {
      material: {
        id: conceptId,
      },
    },
  ],
})
