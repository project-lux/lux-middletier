// Find items that have production influenced by this agent
const itemsProductionInfluenced = (agentId) => ({
  _scope: 'item',
  productionInfluencedBy: {
    id: agentId,
  },
})

module.exports = itemsProductionInfluenced
