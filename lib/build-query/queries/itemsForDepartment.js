// Find items that are member of a set curated by the group.
export default (groupId) => ({
  _scope: 'item',
  OR: [
    {
      memberOf: {
        curatedBy: {
          id: groupId,
        },
      },
    },
    {
      memberOf: {
        curatedBy: {
          memberOf: {
            id: groupId,
          },
        },
      },
    },
  ],
})
