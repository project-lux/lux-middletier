// Find items that are member of the set.
const itemsInSet = (setId) => ({
  _scope: 'item',
  AND: [
    {
      OR: [
        {
          memberOf: {
            id: setId,
          },
        },
        {
          memberOf: {
            memberOf: {
              id: setId,
            },
          },
        },
        {
          memberOf: {
            memberOf: {
              memberOf: {
                id: setId,
              },
            },
          },
        },
      ],
    },
    {
      hasDigitalImage: 1,
    },
  ],
})

module.exports = itemsInSet
