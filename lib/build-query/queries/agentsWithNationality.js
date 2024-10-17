// Find agents with the nationality (concept).
export default (conceptId) => ({
  _scope: 'agent',
  nationality: {
    id: conceptId,
  },
})
