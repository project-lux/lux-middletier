// Find agents that are member of the group.
export default (groupId) => ({
  _scope: 'agent',
  memberOf: {
    id: groupId,
  },
})
