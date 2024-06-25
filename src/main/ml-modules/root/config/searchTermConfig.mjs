/*
 * NOTICE: The deployed version of this document is to include additional search terms via
 *         the generateRemainingSearchTerms build task.  The list of generated search terms
 *         has grown; please consult the remaining search terms generator for details and
 *         tail the deployment app server's log during deployment for warnings.  Ideally,
 *         only information not provided by the generator is defined herein.
 *
 * The top-level properties are the search scopes.  The next level down holds the search terms.
 *
 */
const SEARCH_TERM_CONFIG = {
  agent: {
    activeAt: {
      patternName: 'hopWithField',
      predicates: ['lux("placeOfActivity")'],
      targetScope: 'place',
      hopInverseName: 'activePlaceOfAgent',
      indexReferences: ['placePrimaryName'],
    },
    classification: {
      patternName: 'hopWithField',
      predicates: ['lux("agentClassifiedAs")'],
      targetScope: 'concept',
      hopInverseName: 'classificationOfAgent',
      indexReferences: ['conceptPrimaryName'],
    },
    endAt: {
      patternName: 'hopWithField',
      predicates: ['lux("placeOfEnding")'],
      targetScope: 'place',
      hopInverseName: 'endPlaceOfAgent',
      indexReferences: ['placePrimaryName'],
    },
    foundedBy: {
      patternName: 'hopWithField',
      predicates: ['lux("agentOfBeginning")'],
      targetScope: 'agent',
      hopInverseName: 'founded',
      indexReferences: ['agentPrimaryName'],
      idIndexReferences: ['agentFounderId'],
    },
    gender: {
      patternName: 'hopWithField',
      predicates: ['lux("agentGender")'],
      targetScope: 'concept',
      hopInverseName: 'genderOf',
      indexReferences: ['conceptPrimaryName'],
    },
    id: { patternName: 'documentId' },
    memberOf: {
      patternName: 'hopWithField',
      predicates: ['crm("P107i_is_current_or_former_member_of")'],
      targetScope: 'agent',
      hopInverseName: 'memberOfInverse',
      indexReferences: ['agentPrimaryName'],
    },
    name: {
      patternName: 'indexedWord',
      indexReferences: ['agentName'],
      scalarType: 'string',
    },
    nationality: {
      patternName: 'hopWithField',
      predicates: ['lux("agentNationality")'],
      targetScope: 'concept',
      hopInverseName: 'nationalityOf',
      indexReferences: ['conceptPrimaryName'],
    },
    occupation: {
      patternName: 'hopWithField',
      predicates: ['lux("agentOccupation")'],
      targetScope: 'concept',
      hopInverseName: 'occupationOf',
      indexReferences: ['conceptPrimaryName'],
    },
    professionalActivity: {
      patternName: 'indexedValue',
      indexReferences: ['conceptPrimaryName'],
      scalarType: 'string',
    },
    relatedToAgent: {
      patternName: 'relatedList',
      targetScope: 'agent',
      inBetweenScopes: ['item', 'work'],
      maxLevel: 1,
    },
    relatedToConcept: {
      patternName: 'relatedList',
      targetScope: 'concept',
      inBetweenScopes: ['item', 'work'],
      maxLevel: 1,
    },
    relatedToEvent: {
      patternName: 'relatedList',
      targetScope: 'event',
      inBetweenScopes: ['item', 'work', 'set'],
      maxLevel: 3,
    },
    relatedToPlace: {
      patternName: 'relatedList',
      targetScope: 'place',
      inBetweenScopes: ['item', 'work'],
      maxLevel: 1,
    },
    similar: { patternName: 'similar' },
    startAt: {
      patternName: 'hopWithField',
      predicates: ['lux("placeOfBeginning")'],
      targetScope: 'place',
      hopInverseName: 'startPlaceOfAgent',
      indexReferences: ['placePrimaryName'],
    },
    text: {
      patternName: 'text',
      indexReferences: ['agentAnyText'],
      scalarType: 'string',
    },
  },
  concept: {
    broader: {
      patternName: 'hopWithField',
      predicates: ['skos("broader")'],
      targetScope: 'concept',
      hopInverseName: 'narrower',
      indexReferences: ['conceptPrimaryName'],
    },
    classification: {
      patternName: 'hopWithField',
      predicates: ['lux("conceptClassifiedAs")'],
      targetScope: 'concept',
      hopInverseName: 'classificationOfConcept',
      indexReferences: ['conceptPrimaryName'],
    },
    id: { patternName: 'documentId' },
    influencedByAgent: {
      patternName: 'hopWithField',
      predicates: ['lux("influenced_by_agent")'],
      targetScope: 'agent',
      hopInverseName: 'influenced',
      indexReferences: ['agentPrimaryName'],
      idIndexReferences: ['conceptInfluencedByAgentId'],
    },
    influencedByConcept: {
      patternName: 'hopWithField',
      predicates: ['lux("influenced_by_concept")'],
      targetScope: 'concept',
      hopInverseName: 'influenced',
      indexReferences: ['conceptPrimaryName'],
      idIndexReferences: ['conceptInfluencedByConceptId'],
    },
    influencedByEvent: {
      patternName: 'hopWithField',
      predicates: ['lux("influenced_by_activity")'],
      targetScope: 'event',
      hopInverseName: 'influenced',
      indexReferences: ['eventPrimaryName'],
      idIndexReferences: ['conceptInfluencedByEventId'],
    },
    influencedByPlace: {
      patternName: 'hopWithField',
      predicates: ['lux("influenced_by_place")'],
      targetScope: 'place',
      hopInverseName: 'influenced',
      indexReferences: ['placePrimaryName'],
      idIndexReferences: ['conceptInfluencedByPlaceId'],
    },
    name: {
      patternName: 'indexedWord',
      indexReferences: ['conceptName'],
      scalarType: 'string',
    },
    relatedToAgent: {
      patternName: 'relatedList',
      targetScope: 'agent',
      inBetweenScopes: ['item', 'work'],
      maxLevel: 1,
    },
    relatedToConcept: {
      patternName: 'relatedList',
      targetScope: 'concept',
      inBetweenScopes: ['item', 'work'],
      maxLevel: 1,
    },
    relatedToEvent: {
      patternName: 'relatedList',
      targetScope: 'event',
      inBetweenScopes: ['item', 'work', 'set'],
      maxLevel: 3,
    },
    relatedToPlace: {
      patternName: 'relatedList',
      targetScope: 'place',
      inBetweenScopes: ['item', 'work'],
      maxLevel: 1,
    },
    text: {
      patternName: 'text',
      indexReferences: ['conceptAnyText'],
      scalarType: 'string',
    },
  },
  event: {
    carriedOutBy: {
      patternName: 'hopWithField',
      predicates: ['lux("eventCarriedOutBy")'],
      targetScope: 'agent',
      hopInverseName: 'carriedOut',
      indexReferences: ['agentPrimaryName'],
    },
    classification: {
      patternName: 'hopWithField',
      predicates: ['lux("eventClassifiedAs")'],
      targetScope: 'concept',
      hopInverseName: 'classificationOfEvent',
      indexReferences: ['conceptPrimaryName'],
    },
    id: { patternName: 'documentId' },
    name: {
      patternName: 'indexedWord',
      indexReferences: ['eventName'],
      scalarType: 'string',
    },
    text: {
      patternName: 'text',
      indexReferences: ['eventAnyText'],
      scalarType: 'string',
    },
    tookPlaceAt: {
      patternName: 'hopWithField',
      predicates: ['lux("eventTookPlaceAt")'],
      targetScope: 'place',
      hopInverseName: 'placeOfEvent',
      indexReferences: ['placePrimaryName'],
    },
    used: {
      patternName: 'hopWithField',
      predicates: ['crm("P16_used_specific_object")'],
      targetScope: 'set',
      hopInverseName: 'usedForEvent',
      indexReferences: ['setPrimaryName'],
    },
  },
  item: {
    carries: {
      patternName: 'hopWithField',
      predicates: ['lux("carries_or_shows")'],
      targetScope: 'work',
      hopInverseName: 'carriedBy',
      indexReferences: ['workPrimaryName'],
    },
    classification: {
      patternName: 'hopWithField',
      predicates: ['lux("itemClassifiedAs")'],
      targetScope: 'concept',
      hopInverseName: 'classificationOfItem',
      indexReferences: ['conceptPrimaryName'],
    },
    encounteredAt: {
      patternName: 'hopWithField',
      predicates: ['lux("placeOfEncounter")'],
      targetScope: 'place',
      hopInverseName: 'encounteredHere',
      indexReferences: ['placePrimaryName'],
    },
    encounteredBy: {
      patternName: 'hopWithField',
      predicates: ['lux("agentOfEncounter")'],
      targetScope: 'agent',
      hopInverseName: 'encountered',
      indexReferences: ['agentPrimaryName'],
    },
    id: { patternName: 'documentId' },
    material: {
      patternName: 'hopWithField',
      predicates: ['crm("P45_consists_of")'],
      targetScope: 'concept',
      hopInverseName: 'materialOfItem',
      indexReferences: ['conceptPrimaryName'],
    },
    memberOf: {
      patternName: 'hopWithField',
      predicates: ['la("member_of")'],
      targetScope: 'set',
      hopInverseName: 'containingItem',
      indexReferences: ['setPrimaryName'],
    },
    name: {
      patternName: 'indexedWord',
      indexReferences: ['itemName'],
      scalarType: 'string',
    },
    producedAt: {
      patternName: 'hopWithField',
      predicates: ['lux("placeOfProduction")'],
      targetScope: 'place',
      hopInverseName: 'producedHere',
      indexReferences: ['placePrimaryName'],
    },
    producedBy: {
      patternName: 'hopWithField',
      predicates: ['lux("agentOfProduction")'],
      targetScope: 'agent',
      hopInverseName: 'produced',
      indexReferences: ['agentPrimaryName'],
    },
    productionInfluencedBy: {
      patternName: 'hopWithField',
      predicates: ['lux("agentInfluencedProduction")'],
      targetScope: 'agent',
      hopInverseName: 'influencedProduction',
      indexReferences: ['agentPrimaryName'],
    },
    producedUsing: {
      patternName: 'hopWithField',
      predicates: ['lux("techniqueOfProduction")'],
      targetScope: 'concept',
      hopInverseName: 'usedToProduce',
      indexReferences: ['conceptPrimaryName'],
    },
    similar: { patternName: 'similar' },
    text: {
      patternName: 'text',
      indexReferences: ['itemAnyText'],
      scalarType: 'string',
    },
  },
  place: {
    classification: {
      patternName: 'hopWithField',
      predicates: ['lux("placeClassifiedAs")'],
      targetScope: 'concept',
      hopInverseName: 'classificationOfPlace',
      indexReferences: ['conceptPrimaryName'],
    },
    id: { patternName: 'documentId' },
    name: {
      patternName: 'indexedWord',
      indexReferences: ['placeName'],
      scalarType: 'string',
    },
    partOf: {
      patternName: 'hopWithField',
      predicates: ['crm("P89_falls_within")'],
      targetScope: 'place',
      indexReferences: ['placePrimaryName'],
    },
    relatedToAgent: {
      patternName: 'relatedList',
      targetScope: 'agent',
      inBetweenScopes: ['item', 'work'],
      maxLevel: 1,
    },
    relatedToConcept: {
      patternName: 'relatedList',
      targetScope: 'concept',
      inBetweenScopes: ['item', 'work'],
      maxLevel: 1,
    },
    relatedToEvent: {
      patternName: 'relatedList',
      targetScope: 'event',
      inBetweenScopes: ['item', 'work', 'set'],
      maxLevel: 3,
    },
    relatedToPlace: {
      patternName: 'relatedList',
      targetScope: 'place',
      inBetweenScopes: ['item', 'work'],
      maxLevel: 1,
    },
    text: {
      patternName: 'text',
      indexReferences: ['placeAnyText'],
      scalarType: 'string',
    },
  },
  reference: {
    classification: {
      patternName: 'hopWithField',
      predicates: ['lux("referenceClassifiedAs")'],
      targetScope: 'concept',
      hopInverseName: 'classificationOfReference',
      indexReferences: ['conceptPrimaryName'],
      idIndexReferences: ['referenceTypeId'],
    },
    id: { patternName: 'documentId' },
    identifier: {
      patternName: 'indexedValue',
      indexReferences: ['referenceIdentifier'],
      scalarType: 'string',
    },
    name: {
      patternName: 'indexedWord',
      indexReferences: ['referenceName'],
      scalarType: 'string',
    },
    text: {
      patternName: 'text',
      indexReferences: ['referenceAnyText'],
      scalarType: 'string',
    },
  },
  set: {
    classification: {
      patternName: 'hopWithField',
      predicates: ['lux("setClassifiedAs")'],
      targetScope: 'concept',
      hopInverseName: 'classificationOfSet',
      indexReferences: ['conceptPrimaryName'],
      idIndexReferences: ['setTypeId'],
    },
    curatedBy: {
      patternName: 'hopWithField',
      predicates: ['lux("agentOfCuration")'],
      targetScope: 'agent',
      hopInverseName: 'curated',
      indexReferences: ['agentPrimaryName'],
    },
    id: { patternName: 'documentId' },
    identifier: {
      patternName: 'indexedValue',
      indexReferences: ['setIdentifier'],
      scalarType: 'string',
    },
    memberOf: {
      patternName: 'hopWithField',
      predicates: ['la("member_of")'],
      targetScope: 'set',
      hopInverseName: 'containingSet',
      indexReferences: ['setPrimaryName'],
    },
    name: {
      patternName: 'indexedWord',
      indexReferences: ['setPrimaryName'],
      scalarType: 'string',
    },
    text: {
      patternName: 'text',
      indexReferences: ['setAnyText'],
      scalarType: 'string',
    },
  },
  work: {
    aboutAgent: {
      patternName: 'hopWithField',
      predicates: ['lux("about_or_depicts_agent")'],
      targetScope: 'agent',
      hopInverseName: 'subjectOfAgent',
      indexReferences: ['agentPrimaryName'],
    },
    aboutConcept: {
      patternName: 'hopWithField',
      predicates: ['lux("about_or_depicts_concept")'],
      targetScope: 'concept',
      hopInverseName: 'subjectOfConcept',
      indexReferences: ['conceptPrimaryName'],
    },
    aboutPlace: {
      patternName: 'hopWithField',
      predicates: ['lux("about_or_depicts_place")'],
      targetScope: 'place',
      hopInverseName: 'subjectOfPlace',
      indexReferences: ['placePrimaryName'],
    },
    classification: {
      patternName: 'hopWithField',
      predicates: ['lux("workClassifiedAs")'],
      targetScope: 'concept',
      hopInverseName: 'classificationOfWork',
      indexReferences: ['conceptPrimaryName'],
    },
    createdAt: {
      patternName: 'hopWithField',
      predicates: ['lux("placeOfCreation")'],
      targetScope: 'place',
      hopInverseName: 'createdHere',
      indexReferences: ['placePrimaryName'],
    },
    createdBy: {
      patternName: 'hopWithField',
      predicates: ['lux("agentOfCreation")'],
      targetScope: 'agent',
      hopInverseName: 'created',
      indexReferences: ['agentPrimaryName'],
    },
    creationInfluencedBy: {
      patternName: 'hopWithField',
      predicates: ['lux("agentInfluencedCreation")'],
      targetScope: 'agent',
      hopInverseName: 'influencedCreation',
      indexReferences: ['agentPrimaryName'],
    },
    id: { patternName: 'documentId' },
    isPublicDomain: {
      patternName: 'indexedValue',
      indexReferences: ['workIsPublicDomainBoolean'],
      scalarType: 'number',
    },
    language: {
      patternName: 'hopWithField',
      predicates: ['crm("P72_has_language")'],
      targetScope: 'concept',
      hopInverseName: 'languageOf',
      indexReferences: ['conceptPrimaryName'],
    },
    name: {
      patternName: 'indexedWord',
      indexReferences: ['workName'],
      scalarType: 'string',
    },
    // Not the correct pattern but avoids getting child name's
    // pattern when there's an ID child term.
    partOf: {
      patternName: 'indexedWord',
      indexReferences: ['workPrimaryName'],
      scalarType: 'string',
    },
    publishedAt: {
      patternName: 'hopWithField',
      predicates: ['lux("placeOfPublication")'],
      targetScope: 'place',
      hopInverseName: 'publishedHere',
      indexReferences: ['placePrimaryName'],
    },
    publishedBy: {
      patternName: 'hopWithField',
      predicates: ['lux("agentOfPublication")'],
      targetScope: 'agent',
      hopInverseName: 'published',
      indexReferences: ['agentPrimaryName'],
    },
    text: {
      patternName: 'text',
      indexReferences: ['workAnyText'],
      scalarType: 'string',
    },
  },
};

// Stub required during deployment, before the generateRemainingSearchTerms task
// has a chance to provide the runtime version.
function dummy() {}
export {
  SEARCH_TERM_CONFIG,
  dummy as getInverseSearchTermInfo,
  dummy as getSearchTermConfig,
  dummy as getSearchTermNames,
};
