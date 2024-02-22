// Find agents of the gender indentified by conceptId.
const agentsWithGender = (conceptId) => ({
  _scope: 'agent',
  gender: {
    id: conceptId,
  },
})

module.exports = agentsWithGender
