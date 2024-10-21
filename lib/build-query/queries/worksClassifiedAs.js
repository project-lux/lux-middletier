// Find works classified as the type.
const worksClassifiedAs = (conceptId) => ({
  _scope: 'work',
  classification: {
    id: conceptId,
  },
})

export default worksClassifiedAs
