// Find agents of the gender indentified by conceptId.
export default (conceptId) => ({
  _scope: 'agent',
  gender: {
    id: conceptId,
  },
})
