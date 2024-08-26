// Find works that are about an item.
const worksAboutItem = (itemId) => ({
  _scope: 'work',
  aboutItem: {
    id: itemId,
  },
})

module.exports = worksAboutItem
