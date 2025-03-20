// Get the current set and its siblings in an archive hierarchy.
const currentSetAndSiblings = (setId) => ({
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
              containingSet: {
                id: setId,
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
              containingSet: {
                id: setId,
              },
            },
          ],
        },
      },
    ],
  });
  
  export default currentSetAndSiblings;
