// Find sets created at the place.
const setCreatedAtPlace = (placeId) => ({
    _scope: 'set',
    createdAt: {
      id: placeId,
    },
  })
  
  export default setCreatedAtPlace
