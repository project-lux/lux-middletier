// Find items with images that are members of the set
// Another query (itemsInSetWithImagesEstimate) is used for estimates which checks for an Archive classification
//  - this prevents looking for items that are part of Collections or other sets.
// This query is used for the actual search so that users don't see the check for classification
const itemsInSetWithImages = (setId) => ({
  _scope: "item",
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
});

export default itemsInSetWithImages;
