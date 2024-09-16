// Find items that are member of the set.
const itemsInSetWithImages = (setId) => ({
  _scope: 'item',
  AND: [
    {
      OR: [
        {
          memberOf: {
            AND: [
              { id: setId },
              {
                classification: {
                  identifier: 'http://vocab.getty.edu/aat/300375748',
                },
              },
            ],
          },
        },
        {
          memberOf: {
            memberOf: {
              AND: [
                { id: setId },
                {
                  classification: {
                    identifier: 'http://vocab.getty.edu/aat/300375748',
                  },
                },
              ],
            },
          },
        },
        {
          memberOf: {
            memberOf: {
              memberOf: {
                AND: [
                  { id: setId },
                  {
                    classification: {
                      identifier: 'http://vocab.getty.edu/aat/300375748',
                    },
                  },
                ],
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

module.exports = itemsInSetWithImages
