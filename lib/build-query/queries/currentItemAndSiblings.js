// Get the current item and its siblings in an archive hierarchy.
const currentItemAndSiblings = (itemId) => ({
  _scope: "multi",
  OR: [
    {
      _scope: "item",
      memberOf: {
        AND: [
          {
            classification: {
              identifier: "http://vocab.getty.edu/aat/300375748",
            },
          },
          {
            containingItem: {
              id: itemId,
            },
          },
        ],
      },
    },
    {
      _scope: "set",
      memberOf: {
        AND: [
          {
            classification: {
              identifier: "http://vocab.getty.edu/aat/300375748",
            },
          },
          {
            containingItem: {
              id: itemId,
            },
          },
        ],
      },
    },
  ],
});

export default currentItemAndSiblings;
