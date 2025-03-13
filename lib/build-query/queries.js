import agentsActiveAtPlace from './queries/agentsActiveAtPlace.js'
import agentsBornAtPlace from './queries/agentsBornAtPlace.js'
import agentsClassifiedAs from './queries/agentsClassifiedAs.js'
import agentsDiedAtPlace from './queries/agentsDiedAtPlace.js'
import agentsFoundedByAgent from './queries/agentsFoundedByAgent.js'
import agentsMemberOfGroup from './queries/agentsMemberOfGroup.js'
import agentsRelatedToAgent from './queries/agentsRelatedToAgent.js'
import agentsRelatedToConcept from './queries/agentsRelatedToConcept.js'
import agentsRelatedToEvent from './queries/agentsRelatedToEvent.js'
import agentsRelatedToPlace from './queries/agentsRelatedToPlace.js'
import agentsWithGender from './queries/agentsWithGender.js'
import agentsWithNationality from './queries/agentsWithNationality.js'
import agentsWithOccupation from './queries/agentsWithOccupation.js'
import archivesWithItem from './queries/archivesWithItem.js'
import childrenOfConcept from './queries/childrenOfConcept.js'
import conceptsInfluencedByAgent from './queries/conceptsInfluencedByAgent.js'
import conceptsInfluencedByConcept from './queries/conceptsInfluencedByConcept.js'
import conceptsInfluencedByPlace from './queries/conceptsInfluencedByPlace.js'
import conceptsRelatedToAgent from './queries/conceptsRelatedToAgent.js'
import conceptsRelatedToConcept from './queries/conceptsRelatedToConcept.js'
import conceptsRelatedToEvent from './queries/conceptsRelatedToEvent.js'
import conceptsRelatedToPlace from './queries/conceptsRelatedToPlace.js'
import conceptsSubjectsForPeriod from './queries/conceptsSubjectsForPeriod.js'
import departmentsCuratedSet from './queries/departmentsCuratedSet.js'
import departmentsWithItem from './queries/departmentsWithItem.js'
import eventsCarriedOutByAgent from './queries/eventsCarriedOutByAgent.js'
import eventsClassifiedAs from './queries/eventsClassifiedAs.js'
import eventsHappenedAtPlace from './queries/eventsHappenedAtPlace.js'
import eventsUsingAgentsProducedObjects from './queries/eventsUsingAgentsProducedObjects.js'
import eventsWithSet from './queries/eventsWithSet.js'
import eventsWithItem from './queries/eventsWithItem.js'
import itemById from './queries/itemById.js'
import itemsCarryingWork from './queries/itemsCarryingWork.js'
import itemsEncounteredByAgent from './queries/itemsEncounteredByAgent.js'
import itemsForDepartment from './queries/itemsForDepartment.js'
import itemsForEvent from './queries/itemsForEvent.js'
import itemsAboutEvent from './queries/itemsAboutEvent.js'
import itemsInSet from './queries/itemsInSet.js'
import itemsInSetWithImages from './queries/itemsInSetWithImages.js'
import itemsInSetWithImagesEstimate from './queries/itemsInSetWithImagesEstimate.js'
import itemsOfTypeOrMaterial from './queries/itemsOfTypeOrMaterial.js'
import itemsProducedAtPlace from './queries/itemsProducedAtPlace.js'
import itemsProducedByAgent from './queries/itemsProducedByAgent.js'
import itemsProducedEncounteredAtPlace from './queries/itemProducedEncounteredAtPlace.js'
import itemsProducedEncounteredInfluencedByAgent from './queries/itemsProducedEncounteredInfluencedByAgent.js'
import partsOfPlace from './queries/partsOfPlace.js'
import placesRelatedToAgent from './queries/placesRelatedToAgent.js'
import placesRelatedToConcept from './queries/placesRelatedToConcept.js'
import placesRelatedToEvent from './queries/placesRelatedToEvent.js'
import placesRelatedToPlace from './queries/placesRelatedToPlace.js'
import placesClassifiedAs from './queries/placesClassifiedAs.js'
import setById from './queries/setById.js'
import worksAboutAgent from './queries/worksAboutAgent.js'
import worksAboutItem from './queries/worksAboutItem.js'
import worksAboutPlace from './queries/worksAboutPlace.js'
import worksAboutWork from './queries/worksAboutWork.js'
import worksCreatedAtPlace from './queries/worksCreatedAtPlace.js'
import worksCreatedByAgent from './queries/worksCreatedByAgent.js'
import worksCreatedPublishedInfluencedByAgent from './queries/worksCreatedPublishedInfluencedByAgent.js'
import worksForEvent from './queries/worksForEvent.js'
import setsInSet from './queries/setsInSet.js'
import worksPublishedAtPlace from './queries/worksPublishedAtPlace.js'
import worksRelatedToConcept from './queries/worksRelatedToConcept.js'
import worksRelatedToPlace from './queries/worksRelatedToPlace.js'
import worksInWork from './queries/worksInWork.js'
import worksContainingWork from './queries/worksContainingWork.js'
import worksCausedByEvent from './queries/worksCausedByEvent.js'
import worksAboutEvent from './queries/worksAboutEvent.js'

const queries = {
  agentsActiveAtPlace,
  agentsBornAtPlace,
  agentsClassifiedAs,
  agentsDiedAtPlace,
  agentsFoundedByAgent,
  agentsMemberOfGroup,
  agentsRelatedToAgent,
  agentsRelatedToConcept,
  agentsRelatedToEvent,
  agentsRelatedToPlace,
  agentsWithGender,
  agentsWithNationality,
  agentsWithOccupation,
  archivesWithItem,
  childrenOfConcept,
  conceptsInfluencedByAgent,
  conceptsInfluencedByConcept,
  conceptsInfluencedByPlace,
  conceptsRelatedToAgent,
  conceptsRelatedToConcept,
  conceptsRelatedToEvent,
  conceptsRelatedToPlace,
  conceptsSubjectsForPeriod,
  departmentsCuratedSet,
  departmentsWithItem,
  eventsCarriedOutByAgent,
  eventsClassifiedAs,
  eventsHappenedAtPlace,
  eventsUsingAgentsProducedObjects,
  eventsWithSet,
  eventsWithItem,
  itemById,
  itemsCarryingWork,
  itemsEncounteredByAgent,
  itemsForDepartment,
  itemsForEvent,
  itemsAboutEvent,
  itemsInSet,
  itemsInSetWithImages,
  itemsInSetWithImagesEstimate,
  itemsOfTypeOrMaterial,
  itemsProducedAtPlace,
  itemsProducedByAgent,
  itemsProducedEncounteredAtPlace,
  itemsProducedEncounteredInfluencedByAgent,
  partsOfPlace,
  placesRelatedToAgent,
  placesRelatedToConcept,
  placesRelatedToEvent,
  placesRelatedToPlace,
  placesClassifiedAs,
  setById,
  worksAboutAgent,
  worksAboutEvent,
  worksAboutItem,
  worksAboutPlace,
  worksAboutWork,
  worksCausedByEvent,
  worksContainingWork,
  worksCreatedAtPlace,
  worksCreatedByAgent,
  worksCreatedPublishedInfluencedByAgent,
  worksForEvent,
  setsInSet,
  worksInWork,
  worksPublishedAtPlace,
  worksRelatedToConcept,
  worksRelatedToPlace,
}

export default queries
