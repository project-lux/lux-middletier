# HAL Links

For requests for a full document (i.e., no profile specified), Middle Tier appends a set of
HAL ([Hypertext Application Language](https://en.wikipedia.org/wiki/Hypertext_Application_Language))
links to make it easier for users/clients to identify the query needed to get data
that are related to the entity.

The set of HAL links are appended as the root of the JSON document in the
following form:
```
{
  "_links": {
  "self": {
    "href": "{URL of this document}",
  },
  "lux:{name of relation}": {
    "href": "{URL of query for relation}",
    "_estimate": {estimated number of results}
  },
  "lux:{name of another relation}": {
    "href": "{URL of query for relation}",
    "_estimate": {estimated number of results}
  },
  ...
}
```

## HAL links for items

- `lux:itemArchive` - archives (sets) containinig the item
- `lux:itemEvents` - events that used the item
- `lux:itemDepartment` - departments (agents) that curated the item
- `lux:itemUnit` - units responsible for the item

## HAL links for works

- `lux:workCarriedBy` - items carrying the work
- `lux:workShownBy` - items showing the work

## HAL links for sets

- `lux:setDepartment` - departments (agent) that curated the set
- `lux:setIncludedItems` - items in the set
- `lux:setIncludedWorks` - works in the set
- `lux:setItemEncounteredTime` - dates of encounter of the items in the set
- `lux:setItemMadeTime` - dates of production of the items in the set
- `lux:setItemTypes` - types of items in the set
- `lux:setUnit` - units responsible for the set

## HAL links for agents

- `lux:agentAgentMemberOf` - agents that are member of the group (agent)
- `lux:agentCreatedPublishedWork` - works that were created or published by the agent
- `lux:agentInfluencedConcepts` - concepts that were influenced by the agent
- `lux:agentItemEncounteredTime` - dates that the agent encountered items
- `lux:agentItemMadeTime` - dates that the agent produced items
- `lux:agentMadeDiscoveredItem` - items produced or encountered by the agent
- `lux:agentRelatedAgents` - agents that are related to the agent
- `lux:agentRelatedConcepts` - concepts that are related to the agent
- `lux:agentRelatedItemTypes` - types of items produced by the agent
- `lux:agentRelatedMaterials` - materials used for items produced by the agent
- `lux:agentRelatedPlaces` - places related the agent
- `lux:agentRelatedSubjects` - subjects related to the agent
- `lux:agentRelatedWorkTypes` - types of works created by the agent
- `lux:agentWorkAbout` - works about the agent
- `lux:agentWorkCreatedTime` - dates of creation of works by the agent
- `lux:agentWorkPublishedTime` - dates of publication of works by the agent
- `lux:departmentItems`- items curated by the group (agent)

## HAL links for concepts

- `lux:conceptChildren` - sub-concepts (children of concept)
- `lux:conceptDepictedAgentFromRelatedWorks` - agents depicted by works related to the concept
- `lux:conceptInfluencedConcepts` - concepts influenced by the concept
- `lux:conceptItemEncounteredTime` - dates of encounter of items of the type (concept) or material (concept)
- `lux:conceptItemMadeTime` - dates of production of items of the type (concept) or material (concept)
- `lux:conceptItemTypes` - types of items of the type (concept) or material (concept)
- `lux:conceptRelatedAgents` - agents related to the concept
- `lux:conceptRelatedConcepts` - concepts related to the concept
- `lux:conceptRelatedItems` - items related to the concept
- `lux:conceptRelatedPlaces` - places related to the concept
- `lux:conceptRelatedWorks` - works related to the concept
- `lux:conceptWorkCreatedTime` - creation dates of works related to the concept
- `lux:conceptWorkPublishedTime` - publication dates of works related to the concept
- `lux:conceptWorkTypes` - types of works related to the concept
- `lux:genderForAgent` - agents with the gender (concept)
- `lux:nationalityForAgent` - agents with the nationality (concept)
- `lux:occupationForAgent` - agents with the occupation (concept)
- `typeForAgent` - agents classified as the type (concept)

## HAL links for places

- `lux:placeBornAgent` - agents born at the place
- `lux:placeCreatedWork` - works created at the place
- `lux:placeDepictedAgentsFromRelatedWorks` - agents depicted by works related to the place
- `lux:placeDepictingWork` - concepts depicted by works related to the place
- `lux:placeDiedAgent` - agents that died at the place
- `lux:placeEvents` - events that happened at the place
- `lux:placeInfluencedConcepts` - concepts influenced by the place
- `lux:placeItemTypes` - types of items produced at the place
- `lux:placeMadeDiscoveredItem` - items produced or encountered at the place
- `lux:placeParts` - parts (places) of the place
- `lux:placePublishedWork` - works published at the place
- `lux:placeRelatedAgents` - agents related to the place
- `lux:placeRelatedConcepts` - concepts related to the place
- `lux:placeRelatedPlaces` - places related to the place
- `lux:placeWorkAbout` - works about the place
- `lux:placeWorkTypes` - types of works related to the place

## HAL links for events

- `lux:eventIncludedItems` - items used for the event

  
