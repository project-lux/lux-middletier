import config from '../../config/env.js'
import {
  isAgent, isConcept, isEvent, isItem, isPlace, isSet, isWork,
} from '../types.js'

import {
  buildCombinedQuery,
  prepareQuery,
} from './helper.js'

import queries from './queries.js'

const workKeyFuncNameMap = {
  'lux:workCarriedBy': queries.itemsCarryingWork.name,
  'lux:workWorksAbout': queries.worksAboutWork.name,
}

// Names of query creation functions for HAL link keys
const keyFuncNameMap = {
  agent: {
    'lux:agentAgentMemberOf': queries.agentsMemberOfGroup.name,
    'lux:agentCreatedPublishedInfluencedWork':
      queries.worksCreatedPublishedInfluencedByAgent.name,
    'lux:agentEventsCarriedOut': queries.eventsCarriedOutByAgent.name,
    'lux:agentEventsUsingProducedObjects': queries.eventsUsingAgentsProducedObjects.name,
    'lux:agentFoundedByAgent': queries.agentsFoundedByAgent.name,
    'lux:agentInfluencedConcepts': queries.conceptsInfluencedByAgent.name,
    'lux:agentItemEncounteredTime': queries.itemsEncounteredByAgent.name,
    'lux:agentItemMadeTime': queries.itemsProducedByAgent.name,
    'lux:agentMadeDiscoveredInfluencedItem':
      queries.itemsProducedEncounteredInfluencedByAgent.name,
    'lux:agentRelatedAgents': queries.agentsRelatedToAgent.name,
    'lux:agentRelatedConcepts': queries.conceptsRelatedToAgent.name,
    'lux:agentRelatedItemTypes': queries.itemsProducedByAgent.name,
    'lux:agentRelatedMaterials': queries.itemsProducedByAgent.name,
    'lux:agentRelatedPlaces': queries.placesRelatedToAgent.name,
    'lux:agentRelatedSubjects': queries.worksCreatedByAgent.name,
    'lux:agentRelatedWorkTypes': queries.worksCreatedByAgent.name,
    'lux:agentSetAboutTime': queries.setAboutAgent.name,
    'lux:agentSetTypes': queries.setsRelatedToAgent.name,
    'lux:agentWorkAbout': queries.worksAboutAgent.name,
    'lux:agentWorkCreatedTime': queries.worksCreatedPublishedInfluencedByAgent.name,
    'lux:agentWorkPublishedTime': queries.worksCreatedPublishedInfluencedByAgent.name,
    'lux:departmentItems': queries.itemsForDepartment.name,
    'lux:setAboutAgent': queries.setAboutAgent.name,
    'lux:setCreatedByAgent': queries.setCreatedByAgent.name,
  },
  concept: {
    'lux:conceptChildren': queries.childrenOfConcept.name,
    'lux:conceptInfluencedConcepts': queries.conceptsInfluencedByConcept.name,
    'lux:conceptItemEncounteredTime': queries.itemsOfTypeOrMaterial.name,
    'lux:conceptItemMadeTime': queries.itemsOfTypeOrMaterial.name,
    'lux:conceptItemTypes': queries.itemsOfTypeOrMaterial.name,
    'lux:conceptRelatedAgents': queries.agentsRelatedToConcept.name,
    'lux:conceptRelatedConcepts': queries.conceptsRelatedToConcept.name,
    'lux:conceptRelatedItems': queries.itemsOfTypeOrMaterial.name,
    'lux:conceptRelatedPlaces': queries.placesRelatedToConcept.name,
    'lux:conceptRelatedWorks': queries.worksRelatedToConcept.name,
    'lux:conceptWorkCreatedTime': queries.worksRelatedToConcept.name,
    'lux:conceptWorkPublishedTime': queries.worksRelatedToConcept.name,
    'lux:conceptWorkTypes': queries.worksRelatedToConcept.name,
    'lux:genderForAgent': queries.agentsWithGender.name,
    'lux:nationalityForAgent': queries.agentsWithNationality.name,
    'lux:occupationForAgent': queries.agentsWithOccupation.name,
    'lux:typeForAgent': queries.agentsClassifiedAs.name,
    'lux:typeForEvent': queries.eventsClassifiedAs.name,
    'lux:typeForPlace': queries.placesClassifiedAs.name,
  },
  event: {
    'lux:eventConceptsInfluencedBy': queries.conceptsSubjectsForPeriod.name,
    'lux:eventIncludedItems': queries.itemsForEvent.name,
    'lux:eventItemMaterials': queries.itemsForEvent.name,
    'lux:eventObjectTypesUsed': queries.itemsForEvent.name,
    'lux:eventObjectTypesAbout': queries.itemsAboutEvent.name,
    'lux:eventRelatedAgents': queries.agentsRelatedToEvent.name,
    'lux:eventRelatedConcepts': queries.conceptsRelatedToEvent.name,
    'lux:eventRelatedPlaces': queries.placesRelatedToEvent.name,
    'lux:eventSetAboutTime': queries.setAboutEvent.name,
    'lux:eventSetTypes': queries.setForEventSetType.name,
    'lux:eventWorksAbout': queries.worksAboutEvent.name,
    'lux:eventWorkTypesUsed': queries.worksForEvent.name,
    'lux:eventWorkTypesAbout': queries.worksAboutEvent.name,
    'lux:eventCausedWorks': queries.worksCausedByEvent.name,
    'lux:setAboutEvent': queries.setAboutEvent.name,
    'lux:setCausedByEvent': queries.setCausedByEvent.name,
  },
  item: {
    'lux:itemArchive': queries.archivesWithItem.name,
    'lux:itemCurrentHierarchyPage': queries.currentItemAndSiblings.name,
    'lux:itemEvents': queries.eventsWithItem.name,
    'lux:itemDepartment': queries.departmentsWithItem.name,
    'lux:itemUnit': queries.itemById.name,
    'lux:itemWorksAbout': queries.worksAboutItem.name,
  },
  place: {
    'lux:placeActiveAgent': queries.agentsActiveAtPlace.name,
    'lux:placeBornAgent': queries.agentsBornAtPlace.name,
    'lux:placeCreatedWork': queries.worksCreatedAtPlace.name,
    'lux:placeDepictingWork': queries.worksCreatedAtPlace.name,
    'lux:placeDepictedAgentsFromRelatedWorks': queries.worksRelatedToPlace.name,
    'lux:placeDiedAgent': queries.agentsDiedAtPlace.name,
    'lux:placeEvents': queries.eventsHappenedAtPlace.name,
    'lux:placeInfluencedConcepts': queries.conceptsInfluencedByPlace.name,
    'lux:placeItemEncounteredTime': queries.itemsEncounteredAtPlace.name,
    'lux:placeItemMadeTime': queries.itemsProducedAtPlace.name,
    'lux:placeItemTypes': queries.itemsProducedAtPlace.name,
    'lux:placeMadeDiscoveredItem': queries.itemsProducedEncounteredAtPlace.name,
    'lux:placeParts': queries.partsOfPlace.name,
    'lux:placePublishedWork': queries.worksPublishedAtPlace.name,
    'lux:placeRelatedAgents': queries.agentsRelatedToPlace.name,
    'lux:placeRelatedConcepts': queries.conceptsRelatedToPlace.name,
    'lux:placeRelatedPlaces': queries.placesRelatedToPlace.name,
    'lux:placeSetAboutTime': queries.setAboutPlace.name,
    'lux:placeSetTypes': queries.setsRelatedToPlace.name,
    'lux:placeWorkAbout': queries.worksAboutPlace.name,
    'lux:placeWorkAboutTime': queries.worksAboutPlace.name,
    'lux:placeWorkCreatedTime': queries.worksCreatedAtPlace.name,
    'lux:placeWorkPublishedTime': queries.worksPublishedAtPlace.name,
    'lux:placeWorkTypes': queries.worksRelatedToPlace.name,
    'lux:setAboutPlace': queries.setAboutPlace.name,
    'lux:setCreatedAtPlace': queries.setCreatedAtPlace.name,
  },
  set: {
    'lux:setCurrentHierarchyPage': queries.currentSetAndSiblings.name,
    'lux:setDepartment': queries.departmentsCuratedSet.name,
    'lux:setEvents': queries.eventsWithSet.name,
    'lux:setIncludedItems': queries.itemsInSet.name,
    'lux:objectOrSetMemberOfSet': queries.itemsOrSetsMemberOfSet.name,
    'lux:setItemEncounteredTime': queries.itemsInSet.name,
    'lux:setItemMadeTime': queries.itemsInSet.name,
    'lux:setItemTypes': queries.itemsInSet.name,
    'lux:setUnit': queries.setById.name,
    // This query uses a different estimate query than the actual search
    // so that users don't see the check for classification
    'lux:setItemsWithImages': queries.itemsInSetWithImagesEstimate.name,
    ...workKeyFuncNameMap,
  },
  work: {
    'lux:workContainedWorks': queries.worksContainingWork.name,
    'lux:workIncludedWorks': queries.worksInWork.name,
    ...workKeyFuncNameMap,
  }
}

const buildEstimatesQuery = (doc) => {
  if (isAgent(doc.type)) {
    return buildCombinedQuery(doc.id, keyFuncNameMap[['agent']])
  }
  if (isConcept(doc.type)) {
    return buildCombinedQuery(doc.id, keyFuncNameMap[['concept']])
  }
  if (isEvent(doc.type)) {
    return buildCombinedQuery(doc.id, keyFuncNameMap[['event']])
  }
  if (isItem(doc.type)) {
    return buildCombinedQuery(doc.id, keyFuncNameMap[['item']])
  }
  if (isPlace(doc.type)) {
    return buildCombinedQuery(doc.id, keyFuncNameMap[['place']])
  }
  if (isSet(doc.type)) {
    return buildCombinedQuery(doc.id, keyFuncNameMap[['set']])
  }
  if (isWork(doc.type)) {
    return buildCombinedQuery(doc.id, keyFuncNameMap[['work']])
  }
  return null
}

// HAL link builders
const queryBuilders = {
  'lux:agentAgentMemberOf': (id) => {
    const q = prepareQuery(queries.agentsMemberOfGroup(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:agentCreatedPublishedInfluencedWork': (id) => {
    const q = prepareQuery(queries.worksCreatedPublishedInfluencedByAgent(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:agentEventsCarriedOut': (id) => {
    const q = prepareQuery(queries.eventsCarriedOutByAgent(id))
    return `${config.searchUriHost}/api/search/event?q=${q}&sort=eventStartDate:asc`
  },
  'lux:agentEventsUsingProducedObjects': (id) => {
    const q = prepareQuery(queries.eventsUsingAgentsProducedObjects(id))
    return `${config.searchUriHost}/api/search/event?q=${q}&sort=eventStartDate:asc`
  },
  'lux:agentFoundedByAgent': (id) => {
    const q = prepareQuery(queries.agentsFoundedByAgent(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}&sort=anySortName:asc`
  },
  'lux:agentInfluencedConcepts': (id) => {
    const q = prepareQuery(queries.conceptsInfluencedByAgent(id))
    return `${config.searchUriHost}/api/search/concept?q=${q}`
  },
  'lux:agentItemEncounteredTime': (id) => {
    const q = prepareQuery(queries.itemsEncounteredByAgent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemEncounteredDate`
  },
  'lux:agentItemMadeTime': (id) => {
    const q = prepareQuery(queries.itemsProducedByAgent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemProductionDate`
  },
  'lux:agentMadeDiscoveredInfluencedItem': (id) => {
    const q = prepareQuery(queries.itemsProducedEncounteredInfluencedByAgent(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:agentRelatedAgents': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/agent?&name=relatedToAgent&uri=${idEnc}`
  },
  'lux:agentRelatedConcepts': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/concept?&name=relatedToAgent&uri=${idEnc}`
  },
  'lux:agentRelatedItemTypes': (id) => {
    const q = prepareQuery(queries.itemsProducedByAgent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemTypeId`
  },
  'lux:agentRelatedMaterials': (id) => {
    const q = prepareQuery(queries.itemsProducedByAgent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemMaterialId`
  },
  'lux:agentRelatedPlaces': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/place?&name=relatedToAgent&uri=${idEnc}`
  },
  'lux:agentRelatedSubjects': (id) => {
    const q = prepareQuery(queries.worksCreatedByAgent(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workAboutConceptId`
  },
  'lux:agentRelatedWorkTypes': (id) => {
    const q = prepareQuery(queries.worksCreatedByAgent(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workTypeId`
  },
  'lux:agentSetAboutTime': (id) => {
    const q = prepareQuery(queries.setAboutAgent(id))
    return `${config.searchUriHost}/api/facets/set?q=${q}&name=setCreationOrPublicationDate`
  },
  'lux:agentSetTypes': (id) => {
    const q = prepareQuery(queries.setsRelatedToAgent(id))
    return `${config.searchUriHost}/api/facets/set?q=${q}&name=setTypeId`
  },
  'lux:agentWorkAbout': (id) => {
    const q = prepareQuery(queries.worksAboutAgent(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:agentWorkCreatedTime': (id) => {
    const q = prepareQuery(queries.worksCreatedPublishedInfluencedByAgent(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workCreationDate`
  },
  'lux:agentWorkPublishedTime': (id) => {
    const q = prepareQuery(queries.worksCreatedPublishedInfluencedByAgent(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workPublicationDate`
  },
  'lux:conceptChildren': (id) => {
    const q = prepareQuery(queries.childrenOfConcept(id))
    return `${config.searchUriHost}/api/search/concept?q=${q}`
  },
  'lux:conceptInfluencedConcepts': (id) => {
    const q = prepareQuery(queries.conceptsInfluencedByConcept(id))
    return `${config.searchUriHost}/api/search/concept?q=${q}`
  },
  'lux:conceptItemEncounteredTime': (id) => {
    const q = prepareQuery(queries.itemsOfTypeOrMaterial(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemEncounteredDate`
  },
  'lux:conceptItemMadeTime': (id) => {
    const q = prepareQuery(queries.itemsOfTypeOrMaterial(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemProductionDate`
  },
  'lux:conceptItemTypes': (id) => {
    const q = prepareQuery(queries.itemsOfTypeOrMaterial(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemTypeId`
  },
  'lux:conceptRelatedAgents': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/agent?&name=relatedToConcept&uri=${idEnc}`
  },
  'lux:conceptRelatedConcepts': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/concept?&name=relatedToConcept&uri=${idEnc}`
  },
  'lux:conceptRelatedItems': (id) => {
    const q = prepareQuery(queries.itemsOfTypeOrMaterial(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:conceptRelatedPlaces': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/place?name=relatedToConcept&uri=${idEnc}`
  },
  'lux:conceptRelatedWorks': (id) => {
    const q = prepareQuery(queries.worksRelatedToConcept(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:conceptWorkCreatedTime': (id) => {
    const q = prepareQuery(queries.worksRelatedToConcept(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workCreationDate`
  },
  'lux:conceptWorkPublishedTime': (id) => {
    const q = prepareQuery(queries.worksRelatedToConcept(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workPublicationDate`
  },
  'lux:conceptWorkTypes': (id) => {
    const q = prepareQuery(queries.worksRelatedToConcept(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workTypeId`
  },
  'lux:departmentItems': (id) => {
    const q = prepareQuery(queries.itemsForDepartment(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:eventCausedWorks': (id) => {
    const q = prepareQuery(queries.worksCausedByEvent(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:eventConceptsInfluencedBy': (id) => {
    const q = prepareQuery(queries.conceptsSubjectsForPeriod(id))
    return `${config.searchUriHost}/api/search/concept?q=${q}`
  },
  'lux:eventIncludedItems': (id) => {
    const q = prepareQuery(queries.itemsForEvent(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:eventItemMaterials': (id) => {
    const q = prepareQuery(queries.itemsForEvent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemMaterialId`
  },
  'lux:eventObjectTypesUsed': (id) => {
    const q = prepareQuery(queries.itemsForEvent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemTypeId`
  },
  'lux:eventObjectTypesAbout': (id) => {
    const q = prepareQuery(queries.itemsAboutEvent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemTypeId`
  },
  'lux:eventRelatedAgents': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/agent?name=relatedToEvent&uri=${idEnc}`
  },
  'lux:eventRelatedConcepts': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/concept?name=relatedToEvent&uri=${idEnc}`
  },
  'lux:eventRelatedPlaces': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/place?name=relatedToEvent&uri=${idEnc}`
  },
  'lux:eventSetAboutTime': (id) => {
    const q = prepareQuery(queries.setAboutEvent(id))
    return `${config.searchUriHost}/api/facets/set?q=${q}&name=setCreationOrPublicationDate`
  },
  'lux:eventSetTypes': (id) => {
    const q = prepareQuery(queries.setForEventSetType(id))
    return `${config.searchUriHost}/api/facets/set?q=${q}&name=setTypeId`
  },
  'lux:eventWorksAbout': (id) => {
    const q = prepareQuery(queries.worksAboutEvent(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:eventWorkTypesUsed': (id) => {
    const q = prepareQuery(queries.worksForEvent(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workTypeId`
  },
  'lux:eventWorkTypesAbout': (id) => {
    const q = prepareQuery(queries.worksAboutEvent(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workTypeId`
  },
  'lux:genderForAgent': (id) => {
    const q = prepareQuery(queries.agentsWithGender(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:itemArchive': (id) => {
    const q = prepareQuery(queries.archivesWithItem(id))
    return `${config.searchUriHost}/api/search/set?q=${q}`
  },
  'lux:itemCurrentHierarchyPage': (id) => {
    const q = prepareQuery(queries.currentItemAndSiblings(id))
    return `${config.searchUriHost}/api/search/multi?q=${q}&sort=archiveSortId:asc&pageWith=${encodeURIComponent(id)}`
  },
  'lux:itemEvents': (id) => {
    const q = prepareQuery(queries.eventsWithItem(id))
    return `${config.searchUriHost}/api/search/event?q=${q}&sort=eventStartDate:asc`
  },
  'lux:itemDepartment': (id) => {
    const q = prepareQuery(queries.departmentsWithItem(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:itemUnit': (id) => {
    const q = prepareQuery(queries.itemById(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=responsibleUnits`
  },
  'lux:itemWorksAbout': (id) => {
    const q = prepareQuery(queries.worksAboutItem(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:nationalityForAgent': (id) => {
    const q = prepareQuery(queries.agentsWithNationality(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:objectOrSetMemberOfSet': (id) => {
    const q = prepareQuery(queries.itemsOrSetsMemberOfSet(id))
    return `${config.searchUriHost}/api/search/multi?q=${q}&sort=archiveSortId:asc`
  },
  'lux:occupationForAgent': (id) => {
    const q = prepareQuery(queries.agentsWithOccupation(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:placeActiveAgent': (id) => {
    const q = prepareQuery(queries.agentsActiveAtPlace(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:placeBornAgent': (id) => {
    const q = prepareQuery(queries.agentsBornAtPlace(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:placeCreatedWork': (id) => {
    const q = prepareQuery(queries.worksCreatedAtPlace(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:placeDepictedAgentsFromRelatedWorks': (id) => {
    const q = prepareQuery(queries.worksRelatedToPlace(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workAboutAgentId`
  },
  'lux:placeDepictingWork': (id) => {
    const q = prepareQuery(queries.worksRelatedToPlace(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workAboutConceptId`
  },
  'lux:placeDiedAgent': (id) => {
    const q = prepareQuery(queries.agentsDiedAtPlace(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:placeEvents': (id) => {
    const q = prepareQuery(queries.eventsHappenedAtPlace(id))
    return `${config.searchUriHost}/api/search/event?q=${q}`
  },
  'lux:placeInfluencedConcepts': (id) => {
    const q = prepareQuery(queries.conceptsInfluencedByPlace(id))
    return `${config.searchUriHost}/api/search/concept?q=${q}`
  },
  'lux:placeItemMadeTime': (id) => {
    const q = prepareQuery(queries.itemsProducedAtPlace(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemProductionDate`
  },
  'lux:placeItemEncounteredTime': (id) => {
    const q = prepareQuery(queries.itemsEncounteredAtPlace(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemEncounteredDate`
  },
  'lux:placeItemTypes': (id) => {
    const q = prepareQuery(queries.itemsProducedAtPlace(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemTypeId`
  },
  'lux:placeMadeDiscoveredItem': (id) => {
    const q = prepareQuery(queries.itemsProducedEncounteredAtPlace(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:placeParts': (id) => {
    const q = prepareQuery(queries.partsOfPlace(id))
    return `${config.searchUriHost}/api/search/place?q=${q}`
  },
  'lux:placePublishedWork': (id) => {
    const q = prepareQuery(queries.worksPublishedAtPlace(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:placeRelatedAgents': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/agent?name=relatedToPlace&uri=${idEnc}`
  },
  'lux:placeRelatedConcepts': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/concept?name=relatedToPlace&uri=${idEnc}`
  },
  'lux:placeRelatedPlaces': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/place?name=relatedToPlace&uri=${idEnc}`
  },
  'lux:placeSetAboutTime': (id) => {
    const q = prepareQuery(queries.setAboutPlace(id))
    return `${config.searchUriHost}/api/facets/set?q=${q}&name=setCreationOrPublicationDate`
  },
  'lux:placeSetTypes': (id) => {
    const q = prepareQuery(queries.setsRelatedToPlace(id))
    return `${config.searchUriHost}/api/facets/set?q=${q}&name=setTypeId`
  },
  'lux:placeWorkAbout': (id) => {
    const q = prepareQuery(queries.worksAboutPlace(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:placeWorkAboutTime': (id) => {
    const q = prepareQuery(queries.worksAboutPlace(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workCreationOrPublicationDate`
  },
  'lux:placeWorkCreatedTime': (id) => {
    const q = prepareQuery(queries.worksCreatedAtPlace(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workCreationDate`
  },
  'lux:placeWorkPublishedTime': (id) => {
    const q = prepareQuery(queries.worksPublishedAtPlace(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workPublicationDate`
  },
  'lux:placeWorkTypes': (id) => {
    const q = prepareQuery(queries.worksRelatedToPlace(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workTypeId`
  },
  'lux:setAboutAgent': (id) => {
    const q = prepareQuery(queries.setAboutAgent(id))
    return `${config.searchUriHost}/api/search/set?q=${q}`
  },
  'lux:setAboutEvent': (id) => {
    const q = prepareQuery(queries.setAboutEvent(id))
    return `${config.searchUriHost}/api/search/set?q=${q}`
  },
  'lux:setAboutPlace': (id) => {
    const q = prepareQuery(queries.setAboutPlace(id))
    return `${config.searchUriHost}/api/search/set?q=${q}`
  },
  'lux:setCausedByEvent': (id) => {
    const q = prepareQuery(queries.setCausedByEvent(id))
    return `${config.searchUriHost}/api/search/set?q=${q}`
  },
  'lux:setCreatedByAgent': (id) => {
    const q = prepareQuery(queries.setCreatedByAgent(id))
    return `${config.searchUriHost}/api/search/set?q=${q}`
  },
  'lux:setCreatedAtPlace': (id) => {
    const q = prepareQuery(queries.setCreatedAtPlace(id))
    return `${config.searchUriHost}/api/search/set?q=${q}`
  },
  'lux:setCurrentHierarchyPage': (id) => {
    const q = prepareQuery(queries.currentSetAndSiblings(id))
    return `${config.searchUriHost}/api/search/multi?q=${q}&sort=archiveSortId:asc&pageWith=${encodeURIComponent(id)}`
  },
  'lux:setDepartment': (id) => {
    const q = prepareQuery(queries.departmentsCuratedSet(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:setEvents': (id) => {
    const q = prepareQuery(queries.eventsWithSet(id))
    return `${config.searchUriHost}/api/search/event?q=${q}`
  },
  'lux:setIncludedItems': (id) => {
    const q = prepareQuery(queries.itemsInSet(id))
    return `${config.searchUriHost}/api/search/item?q=${q}&sort=itemArchiveSortId:asc`
  },
  'lux:setItemEncounteredTime': (id) => {
    const q = prepareQuery(queries.itemsInSet(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemEncounteredDate`
  },
  'lux:setItemMadeTime': (id) => {
    const q = prepareQuery(queries.itemsInSet(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemProductionDate`
  },
  'lux:setItemTypes': (id) => {
    const q = prepareQuery(queries.itemsInSet(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemTypeId`
  },
  'lux:setUnit': (id) => {
    const q = prepareQuery(queries.setById(id))
    return `${config.searchUriHost}/api/facets/set?q=${q}&name=responsibleUnits`
  },
  'lux:setItemsWithImages': (id) => {
    const q = prepareQuery(queries.itemsInSetWithImages(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:typeForAgent': (id) => {
    const q = prepareQuery(queries.agentsClassifiedAs(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:typeForEvent': (id) => {
    const q = prepareQuery(queries.eventsClassifiedAs(id))
    return `${config.searchUriHost}/api/search/event?q=${q}`
  },
  'lux:typeForPlace': (id) => {
    const q = prepareQuery(queries.placesClassifiedAs(id))
    return `${config.searchUriHost}/api/search/place?q=${q}`
  },
  'lux:workCarriedBy': (id) => {
    const q = prepareQuery(queries.itemsCarryingWork(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:workContainedWorks': (id) => {
    const q = prepareQuery(queries.worksContainingWork(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:workIncludedWorks': (id) => {
    const q = prepareQuery(queries.worksInWork(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:workWorksAbout': (id) => {
    const q = prepareQuery(queries.worksAboutWork(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
}

export {
  buildEstimatesQuery,
  queryBuilders,
}
