// Find items that are classfied as the concept or
// whose material is the concept.
const itemsOfTypeOrMaterial = (conceptId) => ({
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

export default itemsOfTypeOrMaterial
