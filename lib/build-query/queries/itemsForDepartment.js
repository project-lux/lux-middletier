// Find items that are member of a set curated by the group.
const itemsForDepartment = (groupId) => ({
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

export default itemsForDepartment
