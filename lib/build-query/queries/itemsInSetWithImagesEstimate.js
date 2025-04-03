// Find items with images that are members of the set
// This is used for estimates which checks for an archive classification - this prevents looking for items that are part of Collections or other sets.
// itemsInSetWithImages (without estimate) is used for the actual search so that users don't see the check for classification
const itemsInSetWithImagesEstimate = (setId) => ({
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

export default itemsInSetWithImagesEstimate
