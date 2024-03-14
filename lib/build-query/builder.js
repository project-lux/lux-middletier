const config = require('../../config/env')
const types = require('../types')

const agentsActiveAtPlace = require('./queries/agentsActiveAtPlace')
const agentsBornAtPlace = require('./queries/agentsBornAtPlace')
const agentsClassifiedAs = require('./queries/agentsClassifiedAs')
const agentsDiedAtPlace = require('./queries/agentsDiedAtPlace')
const agentsFoundedByAgent = require('./queries/agentsFoundedByAgent')
const agentsMemberOfGroup = require('./queries/agentsMemberOfGroup')
const agentsRelatedToAgent = require('./queries/agentsRelatedToAgent')
const agentsRelatedToConcept = require('./queries/agentsRelatedToConcept')
const agentsRelatedToPlace = require('./queries/agentsRelatedToPlace')
const agentsWithGender = require('./queries/agentsWithGender')
const agentsWithNationality = require('./queries/agentsWithNationality')
const agentsWithOccupation = require('./queries/agentsWithOccupation')
const archivesWithItem = require('./queries/archivesWithItem')
const childrenOfConcept = require('./queries/childrenOfConcept')
const conceptsInfluencedByAgent = require('./queries/conceptsInfluencedByAgent')
const conceptsInfluencedByConcept = require('./queries/conceptsInfluencedByConcept')
const conceptsInfluencedByPlace = require('./queries/conceptsInfluencedByPlace')
const conceptsRelatedToAgent = require('./queries/conceptsRelatedToAgent')
const conceptsRelatedToConcept = require('./queries/conceptsRelatedToConcept')
const conceptsRelatedToPlace = require('./queries/conceptsRelatedToPlace')
const conceptsSubjectsForExhibition = require('./queries/conceptsSubjectsForExhibition')
const conceptsSubjectsForPeriod = require('./queries/conceptsSubjectsForPeriod')
const departmentsCuratedSet = require('./queries/departmentsCuratedSet')
const departmentsWithItem = require('./queries/departmentsWithItem')
const eventsCarriedOutByAgent = require('./queries/eventsCarriedOutByAgent')
const eventsClassifiedAs = require('./queries/eventsClassifiedAs')
const eventsHappenedAtPlace = require('./queries/eventsHappenedAtPlace')
const eventsUsingAgentsProducedObjects = require('./queries/eventsUsingAgentsProducedObjects')
const eventsWithItem = require('./queries/eventsWithItem')
const itemById = require('./queries/itemById')
const itemsCarryingWork = require('./queries/itemsCarryingWork')
const itemsEncounteredByAgent = require('./queries/itemsEncounteredByAgent')
const itemsForDepartment = require('./queries/itemsForDepartment')
const itemsForEvent = require('./queries/itemsForEvent')
const itemsInfluencedByEvent = require('./queries/itemsInfluencedByEvent')
const itemsInSet = require('./queries/itemsInSet')
const itemsOfTypeOrMaterial = require('./queries/itemsOfTypeOrMaterial')
const itemsProducedAtPlace = require('./queries/itemsProducedAtPlace')
const itemsProducedByAgent = require('./queries/itemsProducedByAgent')
const itemsProducedEncounteredAtPlace = require('./queries/itemProducedEncounteredAtPlace')
const itemsProducedEncounteredByAgent = require('./queries/itemsProducedEncounteredByAgent')
const partsOfPlace = require('./queries/partsOfPlace')
const placesRelatedToAgent = require('./queries/placesRelatedToAgent')
const placesRelatedToConcept = require('./queries/placesRelatedToConcept')
const placesRelatedToPlace = require('./queries/placesRelatedToPlace')
const placesClassifiedAs = require('./queries/placesClassifiedAs')
const workById = require('./queries/workById')
const worksAboutAgent = require('./queries/worksAboutAgent')
const worksAboutConceptsInfluencedByEvents = require('./queries/worksAboutConceptsInfluencedByEvents')
const worksAboutPlace = require('./queries/worksAboutPlace')
const worksCreatedAtPlace = require('./queries/worksCreatedAtPlace')
const worksCreatedByAgent = require('./queries/worksCreatedByAgent')
const worksCreatedPublishedByAgent = require('./queries/worksCreatedPublishedByAgent')
const worksForEvent = require('./queries/worksForEvent')
const worksInSet = require('./queries/worksInSet')
const worksPublishedAtPlace = require('./queries/worksPublishedAtPlace')
const worksRelatedToConcept = require('./queries/worksRelatedToConcept')
const worksRelatedToPlace = require('./queries/worksRelatedToPlace')

// Return combined query for estimates for HAL links of an agent record
const buildAgentEstimatesQuery = (doc) => ({
  'lux:agentAgentMemberOf': agentsMemberOfGroup(doc.id),
  'lux:agentCreatedPublishedWork': worksCreatedPublishedByAgent(doc.id),
  'lux:agentEventsCarriedOut': eventsCarriedOutByAgent(doc.id),
  'lux:agentEventsUsingProducedObjects': eventsUsingAgentsProducedObjects(
    doc.id
  ),
  'lux:agentFoundedByAgent': agentsFoundedByAgent(doc.id),
  'lux:agentInfluencedConcepts': conceptsInfluencedByAgent(doc.id),
  'lux:agentItemEncounteredTime': itemsEncounteredByAgent(doc.id),
  'lux:agentItemMadeTime': itemsProducedByAgent(doc.id),
  'lux:agentMadeDiscoveredItem': itemsProducedEncounteredByAgent(doc.id),
  'lux:agentRelatedAgents': agentsRelatedToAgent(doc.id),
  'lux:agentRelatedConcepts': conceptsRelatedToAgent(doc.id),
  'lux:agentRelatedItemTypes': itemsProducedByAgent(doc.id),
  'lux:agentRelatedMaterials': itemsProducedByAgent(doc.id),
  'lux:agentRelatedPlaces': placesRelatedToAgent(doc.id),
  'lux:agentRelatedSubjects': worksCreatedByAgent(doc.id),
  'lux:agentRelatedWorkTypes': worksCreatedByAgent(doc.id),
  'lux:agentWorkAbout': worksAboutAgent(doc.id),
  'lux:agentWorkCreatedTime': worksCreatedPublishedByAgent(doc.id),
  'lux:agentWorkPublishedTime': worksCreatedPublishedByAgent(doc.id),
  'lux:departmentItems': itemsForDepartment(doc.id),
})

// Return combined query for estimates for HAL links of a concept record
const buildConceptEstimatesQuery = (doc) => ({
  'lux:conceptChildren': childrenOfConcept(doc.id),
  'lux:conceptDepictedAgentFromRelatedWorks': worksRelatedToConcept(doc.id),
  'lux:conceptInfluencedConcepts': conceptsInfluencedByConcept(doc.id),
  'lux:conceptItemEncounteredTime': itemsOfTypeOrMaterial(doc.id),
  'lux:conceptItemMadeTime': itemsOfTypeOrMaterial(doc.id),
  'lux:conceptItemTypes': itemsOfTypeOrMaterial(doc.id),
  'lux:conceptRelatedAgents': agentsRelatedToConcept(doc.id),
  'lux:conceptRelatedConcepts': conceptsRelatedToConcept(doc.id),
  'lux:conceptRelatedItems': itemsOfTypeOrMaterial(doc.id),
  'lux:conceptRelatedPlaces': placesRelatedToConcept(doc.id),
  'lux:conceptRelatedWorks': worksRelatedToConcept(doc.id),
  'lux:conceptWorkCreatedTime': worksRelatedToConcept(doc.id),
  'lux:conceptWorkPublishedTime': worksRelatedToConcept(doc.id),
  'lux:conceptWorkTypes': worksRelatedToConcept(doc.id),
  'lux:genderForAgent': agentsWithGender(doc.id),
  'lux:nationalityForAgent': agentsWithNationality(doc.id),
  'lux:occupationForAgent': agentsWithOccupation(doc.id),
  'lux:typeForAgent': agentsClassifiedAs(doc.id),
  'lux:typeForEvent': eventsClassifiedAs(doc.id),
  'lux:typeForPlace': placesClassifiedAs(doc.id),
})

// Return combined query for estimates for HAL links of an event record
const buildEventEstimatesQuery = (doc) => ({
  'lux:eventConceptsInfluencedBy': conceptsSubjectsForPeriod(doc.id),
  'lux:eventConceptsOfItems': conceptsSubjectsForExhibition(doc.id),
  'lux:eventIncludedItems': itemsForEvent(doc.id),
  'lux:eventItemMaterials': itemsForEvent(doc.id),
  'lux:eventObjectTypesUsed': itemsForEvent(doc.id),
  'lux:eventObjectTypesAbout': itemsInfluencedByEvent(doc.id),
  'lux:eventWorksAbout': worksAboutConceptsInfluencedByEvents(doc.id),
  'lux:eventWorkTypesUsed': worksForEvent(doc.id),
  'lux:eventWorkTypesAbout': worksAboutConceptsInfluencedByEvents(doc.id),
})

// Return combined query for estimates for HAL links of an item record
const buildItemEstimatesQuery = (doc) => ({
  'lux:itemArchive': archivesWithItem(doc.id),
  'lux:itemEvents': eventsWithItem(doc.id),
  'lux:itemDepartment': departmentsWithItem(doc.id),
  // For itemUnit, the below query will be correct if YUL changes their data
  // so all sets are linked to departments.
  // In the meantime, we are building a query to pass into
  // the responsibleUnits facet
  //   {
  //     _scope: 'agent',
  //     memberOfInverse: {
  //       curated: {
  //         containing: {
  //           id: itemId,
  //         },
  //       },
  //     },
  //    }
  'lux:itemUnit': itemById(doc.id),
})

// Return combined query for estimates for HAL links of a place record
const buildPlaceEstimatesQuery = (doc) => ({
  'lux:placeActiveAgent': agentsActiveAtPlace(doc.id),
  'lux:placeBornAgent': agentsBornAtPlace(doc.id),
  'lux:placeCreatedWork': worksCreatedAtPlace(doc.id),
  'lux:placeDepictingWork': worksCreatedAtPlace(doc.id),
  'lux:placeDepictedAgentsFromRelatedWorks': worksRelatedToPlace(doc.id),
  'lux:placeDiedAgent': agentsDiedAtPlace(doc.id),
  'lux:placeEvents': eventsHappenedAtPlace(doc.id),
  'lux:placeInfluencedConcepts': conceptsInfluencedByPlace(doc.id),
  'lux:placeItemTypes': itemsProducedAtPlace(doc.id),
  'lux:placeMadeDiscoveredItem': itemsProducedEncounteredAtPlace(doc.id),
  'lux:placeParts': partsOfPlace(doc.id),
  'lux:placePublishedWork': worksPublishedAtPlace(doc.id),
  'lux:placeRelatedAgents': agentsRelatedToPlace(doc.id),
  'lux:placeRelatedConcepts': conceptsRelatedToPlace(doc.id),
  'lux:placeRelatedPlaces': placesRelatedToPlace(doc.id),
  'lux:placeWorkAbout': worksAboutPlace(doc.id),
  'lux:placeWorkTypes': worksRelatedToPlace(doc.id),
})

// Return combined query for estimates for HAL links of a work record
const buildWorkEstimatesQuery = (doc) => ({
  'lux:workCarriedBy': itemsCarryingWork(doc.id),
  'lux:workShownBy': itemsCarryingWork(doc.id),
})

// Return combined query for estimates for HAL links of a set record
const buildSetEstimatesQuery = (doc) => {
  const setQuery = {
    'lux:setDepartment': departmentsCuratedSet(doc.id),
    'lux:setIncludedItems': itemsInSet(doc.id),
    'lux:setIncludedWorks': worksInSet(doc.id),
    'lux:setItemEncounteredTime': itemsInSet(doc.id),
    'lux:setItemMadeTime': itemsInSet(doc.id),
    'lux:setItemTypes': itemsInSet(doc.id),
    'lux:setUnit': workById(doc.id),
  }
  const workQuery = buildWorkEstimatesQuery(doc)

  return { ...setQuery, ...workQuery }
}

const buildEstimatesQuery = (doc) => {
  if (types.isAgent(doc.type)) {
    return buildAgentEstimatesQuery(doc)
  }
  if (types.isConcept(doc.type)) {
    return buildConceptEstimatesQuery(doc)
  }
  if (types.isEvent(doc.type)) {
    return buildEventEstimatesQuery(doc)
  }
  if (types.isItem(doc.type)) {
    return buildItemEstimatesQuery(doc)
  }
  if (types.isPlace(doc.type)) {
    return buildPlaceEstimatesQuery(doc)
  }
  if (types.isSet(doc.type)) {
    return buildSetEstimatesQuery(doc)
  }
  if (types.isWork(doc.type)) {
    return buildWorkEstimatesQuery(doc)
  }
  return null
}

const deleteScope = (query) => {
  const updatedQuery = query
  delete updatedQuery._scope
  return updatedQuery
}

const prepareQuery = (query) =>
  encodeURIComponent(JSON.stringify(deleteScope(query)))

// HAL link builders
const queryBuilders = {
  'lux:agentAgentMemberOf': (id) => {
    const q = prepareQuery(agentsMemberOfGroup(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:agentCreatedPublishedWork': (id) => {
    const q = prepareQuery(worksCreatedPublishedByAgent(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:agentEventsCarriedOut': (id) => {
    const q = prepareQuery(eventsCarriedOutByAgent(id))
    return `${config.searchUriHost}/api/search/event?q=${q}&sort=eventStartDate:asc`
  },
  'lux:agentEventsUsingProducedObjects': (id) => {
    const q = prepareQuery(eventsUsingAgentsProducedObjects(id))
    return `${config.searchUriHost}/api/search/event?q=${q}&sort=eventStartDate:asc`
  },
  'lux:agentFoundedByAgent': (id) => {
    const q = prepareQuery(agentsFoundedByAgent(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}&sort=anySortName:asc`
  },
  'lux:agentInfluencedConcepts': (id) => {
    const q = prepareQuery(conceptsInfluencedByAgent(id))
    return `${config.searchUriHost}/api/search/concept?q=${q}`
  },
  'lux:agentItemEncounteredTime': (id) => {
    const q = prepareQuery(itemsEncounteredByAgent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemEncounteredDate`
  },
  'lux:agentItemMadeTime': (id) => {
    const q = prepareQuery(itemsProducedByAgent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemProductionDate`
  },
  'lux:agentMadeDiscoveredItem': (id) => {
    const q = prepareQuery(itemsProducedEncounteredByAgent(id))
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
    const q = prepareQuery(itemsProducedByAgent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemTypeId`
  },
  'lux:agentRelatedMaterials': (id) => {
    const q = prepareQuery(itemsProducedByAgent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemMaterialId`
  },
  'lux:agentRelatedPlaces': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/place?&name=relatedToAgent&uri=${idEnc}`
  },
  'lux:agentRelatedSubjects': (id) => {
    const q = prepareQuery(worksCreatedByAgent(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workAboutConceptId`
  },
  'lux:agentRelatedWorkTypes': (id) => {
    const q = prepareQuery(worksCreatedByAgent(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workTypeId`
  },
  'lux:agentWorkAbout': (id) => {
    const q = prepareQuery(worksAboutAgent(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:agentWorkCreatedTime': (id) => {
    const q = prepareQuery(worksCreatedPublishedByAgent(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workCreationDate`
  },
  'lux:agentWorkPublishedTime': (id) => {
    const q = prepareQuery(worksCreatedPublishedByAgent(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workPublicationDate`
  },
  'lux:conceptChildren': (id) => {
    const q = prepareQuery(childrenOfConcept(id))
    return `${config.searchUriHost}/api/search/concept?q=${q}`
  },
  'lux:conceptDepictedAgentFromRelatedWorks': (id) => {
    const q = prepareQuery(worksRelatedToConcept(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workAboutAgentId`
  },
  'lux:conceptInfluencedConcepts': (id) => {
    const q = prepareQuery(conceptsInfluencedByConcept(id))
    return `${config.searchUriHost}/api/search/concept?q=${q}`
  },
  'lux:conceptItemEncounteredTime': (id) => {
    const q = prepareQuery(itemsOfTypeOrMaterial(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemEncounteredDate`
  },
  'lux:conceptItemMadeTime': (id) => {
    const q = prepareQuery(itemsOfTypeOrMaterial(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemProductionDate`
  },
  'lux:conceptItemTypes': (id) => {
    const q = prepareQuery(itemsOfTypeOrMaterial(id))
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
    const q = prepareQuery(itemsOfTypeOrMaterial(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:conceptRelatedPlaces': (id) => {
    const idEnc = encodeURIComponent(id)
    return `${config.searchUriHost}/api/related-list/place?name=relatedToConcept&uri=${idEnc}`
  },
  'lux:conceptRelatedWorks': (id) => {
    const q = prepareQuery(worksRelatedToConcept(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:conceptWorkCreatedTime': (id) => {
    const q = prepareQuery(worksRelatedToConcept(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workCreationDate`
  },
  'lux:conceptWorkPublishedTime': (id) => {
    const q = prepareQuery(worksRelatedToConcept(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workPublicationDate`
  },
  'lux:conceptWorkTypes': (id) => {
    const q = prepareQuery(worksRelatedToConcept(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workTypeId`
  },
  'lux:departmentItems': (id) => {
    const q = prepareQuery(itemsForDepartment(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:eventConceptsInfluencedBy': (id) => {
    const q = prepareQuery(conceptsSubjectsForPeriod(id))
    return `${config.searchUriHost}/api/search/concept?q=${q}`
  },
  'lux:eventConceptsOfItems': (id) => {
    const q = prepareQuery(conceptsSubjectsForExhibition(id))
    return `${config.searchUriHost}/api/search/concept?q=${q}`
  },
  'lux:eventIncludedItems': (id) => {
    const q = prepareQuery(itemsForEvent(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:eventItemMaterials': (id) => {
    const q = prepareQuery(itemsForEvent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemMaterialId`
  },
  'lux:eventObjectTypesUsed': (id) => {
    const q = prepareQuery(itemsForEvent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemTypeId`
  },
  'lux:eventObjectTypesAbout': (id) => {
    const q = prepareQuery(itemsInfluencedByEvent(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemTypeId`
  },
  'lux:eventWorksAbout': (id) => {
    const q = prepareQuery(worksAboutConceptsInfluencedByEvents(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:eventWorkTypesUsed': (id) => {
    const q = prepareQuery(worksForEvent(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workTypeId`
  },
  'lux:eventWorkTypesAbout': (id) => {
    const q = prepareQuery(worksAboutConceptsInfluencedByEvents(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workTypeId`
  },
  'lux:genderForAgent': (id) => {
    const q = prepareQuery(agentsWithGender(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:itemArchive': (id) => {
    const q = prepareQuery(archivesWithItem(id))
    return `${config.searchUriHost}/api/search/set?q=${q}`
  },
  'lux:itemEvents': (id) => {
    const q = prepareQuery(eventsWithItem(id))
    return `${config.searchUriHost}/api/search/event?q=${q}&sort=eventStartDate:asc`
  },
  'lux:itemDepartment': (id) => {
    // The url we are building is a facet search to handle bad YUL data
    // If YUL changes their data so all sets are linked to departments,
    // we can change back to a regular search
    const q = prepareQuery(departmentsWithItem(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:itemUnit': (id) => {
    // The url we are building is a facet search to handle bad YUL data
    // If YUL changes their data so all sets are linked to departments,
    // we can change back to a regular search
    const q = prepareQuery(itemById(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=responsibleUnits`
  },
  'lux:nationalityForAgent': (id) => {
    const q = prepareQuery(agentsWithNationality(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:occupationForAgent': (id) => {
    const q = prepareQuery(agentsWithOccupation(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:placeActiveAgent': (id) => {
    const q = prepareQuery(agentsActiveAtPlace(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:placeBornAgent': (id) => {
    const q = prepareQuery(agentsBornAtPlace(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:placeCreatedWork': (id) => {
    const q = prepareQuery(worksCreatedAtPlace(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:placeDepictedAgentsFromRelatedWorks': (id) => {
    const q = prepareQuery(worksRelatedToPlace(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workAboutAgentId`
  },
  'lux:placeDepictingWork': (id) => {
    const q = prepareQuery(worksRelatedToPlace(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workAboutConceptId`
  },
  'lux:placeDiedAgent': (id) => {
    const q = prepareQuery(agentsDiedAtPlace(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:placeEvents': (id) => {
    const q = prepareQuery(eventsHappenedAtPlace(id))
    return `${config.searchUriHost}/api/search/event?q=${q}`
  },
  'lux:placeInfluencedConcepts': (id) => {
    const q = prepareQuery(conceptsInfluencedByPlace(id))
    return `${config.searchUriHost}/api/search/concept?q=${q}`
  },
  'lux:placeItemTypes': (id) => {
    const q = prepareQuery(itemsProducedAtPlace(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemTypeId`
  },
  'lux:placeMadeDiscoveredItem': (id) => {
    const q = prepareQuery(itemsProducedEncounteredAtPlace(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:placeParts': (id) => {
    const q = prepareQuery(partsOfPlace(id))
    return `${config.searchUriHost}/api/search/place?q=${q}`
  },
  'lux:placePublishedWork': (id) => {
    const q = prepareQuery(worksPublishedAtPlace(id))
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
  'lux:placeWorkAbout': (id) => {
    const q = prepareQuery(worksAboutPlace(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:placeWorkTypes': (id) => {
    const q = prepareQuery(worksRelatedToPlace(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=workTypeId`
  },
  'lux:setDepartment': (id) => {
    const q = prepareQuery(departmentsCuratedSet(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:setIncludedItems': (id) => {
    const q = prepareQuery(itemsInSet(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:setIncludedWorks': (id) => {
    const q = prepareQuery(worksInSet(id))
    return `${config.searchUriHost}/api/search/work?q=${q}`
  },
  'lux:setItemEncounteredTime': (id) => {
    const q = prepareQuery(itemsInSet(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemEncounteredDate`
  },
  'lux:setItemMadeTime': (id) => {
    const q = prepareQuery(itemsInSet(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemProductionDate`
  },
  'lux:setItemTypes': (id) => {
    const q = prepareQuery(itemsInSet(id))
    return `${config.searchUriHost}/api/facets/item?q=${q}&name=itemTypeId`
  },
  'lux:setUnit': (id) => {
    const q = prepareQuery(workById(id))
    return `${config.searchUriHost}/api/facets/work?q=${q}&name=responsibleUnits`
  },
  'lux:typeForAgent': (id) => {
    const q = prepareQuery(agentsClassifiedAs(id))
    return `${config.searchUriHost}/api/search/agent?q=${q}`
  },
  'lux:typeForEvent': (id) => {
    const q = prepareQuery(eventsClassifiedAs(id))
    return `${config.searchUriHost}/api/search/event?q=${q}`
  },
  'lux:typeForPlace': (id) => {
    const q = prepareQuery(placesClassifiedAs(id))
    return `${config.searchUriHost}/api/search/place?q=${q}`
  },
  'lux:workCarriedBy': (id) => {
    const q = prepareQuery(itemsCarryingWork(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
  'lux:workShownBy': (id) => {
    const q = prepareQuery(itemsCarryingWork(id))
    return `${config.searchUriHost}/api/search/item?q=${q}`
  },
}

module.exports = {
  buildEstimatesQuery,
  queryBuilders,
}
