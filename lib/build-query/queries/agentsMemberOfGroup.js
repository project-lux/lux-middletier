// Find agents that are member of the group.
const agentsMemberOfGroup = (groupId) => ({
  _scope: 'agent',
  memberOf: {
    id: groupId,
  },
})

module.exports = agentsMemberOfGroup
