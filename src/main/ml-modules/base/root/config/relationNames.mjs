import * as utils from '../utils/utils.mjs';

const RELATION_NAMES = {
  'classificationOfItem-classification':
    'Is the Category of Objects Categorized As',
  'classificationOfItem-encounteredAt':
    'Is the Category of Objects Encountered At',
  'classificationOfItem-encounteredBy':
    'Is the Category of Objects Encountered By',
  'classificationOfItem-material': 'Is the Category of Objects Made Of',
  'classificationOfItem-producedAt': 'Is the Category of Objects Created At',
  'classificationOfItem-producedBy': 'Is the Category of Objects Created By',
  'classificationOfItem-producedUsing':
    'Is the Category of Objects Created Using',
  'classificationOfWork-aboutAgent': 'Is the Category Of Works About',
  'classificationOfWork-aboutConcept': 'Is the Category of Works About',
  'classificationOfWork-aboutPlace': 'Is the Category of Works About',
  'classificationOfWork-classification':
    'Is the Category of Works Categorized As',
  'classificationOfWork-createdAt': 'Is the Category of Works Created At',
  'classificationOfWork-createdBy': 'Is the Category of Works Created By',
  'classificationOfWork-depictsAgent': 'Is the Category of Works that Depict',
  'classificationOfWork-depictsConcept': 'Is the Category of Works that Depict',
  'classificationOfWork-depictsPlace': 'Is the Category of Works thatDepict',
  'classificationOfWork-language': 'Is the Category of Works In',
  'classificationOfWork-publishedAt': 'Is the Category of Works Published At',
  'classificationOfWork-publishedBy': 'Is the Category of Works Published By',
  'created-aboutAgent': 'Created Works About',
  'created-aboutConcept': 'Created Works About',
  'created-aboutPlace': 'Created Works About',
  'created-classification': 'Created Works Categorized As',
  'created-createdAt': 'Created Works Created At',
  'created-createdBy': 'Co-created Works With',
  'created-depictsAgent': 'Created Works that Depict',
  'created-depictsConcept': 'Created Works that Depict',
  'created-depictsPlace': 'Created Works that Depict',
  'created-language': 'Created Works In',
  'created-publishedAt': 'Created Works Published At',
  'created-publishedBy': 'Created Works Published By',
  'createdHere-aboutAgent': 'Is the Place of Creation of Works About',
  'createdHere-aboutConcept': 'Is the Place of Creation of Works About',
  'createdHere-aboutPlace': 'Is the Place of Creation of Works About',
  'createdHere-classification':
    'Is the Place of Creation of Works Categorized As',
  'createdHere-createdAt': 'Is the Place of Creation of Works Created At',
  'createdHere-createdBy': 'Is the Place of Creation of Works Created By',
  'createdHere-depictsAgent': 'Is the Place of Creation of Works that Depict',
  'createdHere-depictsConcept': 'Is the Place of Creation of Works that Depict',
  'createdHere-depictsPlace': 'Is the Place of Creation of Works that Depict',
  'createdHere-language': 'Is the Place of Creation of Works In',
  'createdHere-publishedAt': 'Is the Place of Creation of Works Published At',
  'createdHere-publishedBy': 'Is the Place of Creation of Works Published By',
  'depictedBy-aboutAgent': 'Is Depicted in Works About',
  'depictedBy-aboutConcept': 'Is Depicted in Works About',
  'depictedBy-aboutPlace': 'Is Depicted in Works About',
  'depictedBy-classification': 'Is Depicted in Works Categorized As',
  'depictedBy-createdAt': 'Is Depicted in Works Created At',
  'depictedBy-createdBy': 'Is Depicted in Works Created By',
  'depictedBy-depictsAgent': 'Is Co-depicted in Works With',
  'depictedBy-depictsConcept': 'Is Co-depicted in Works With',
  'depictedBy-depictsPlace': 'Is Co-depicted in Works With',
  'depictedBy-publishedAt': 'Is Depicted in Works Published At',
  'depictedBy-publishedBy': 'Is Depicted in Works Published By',
  'encountered-classification': 'Encountered Objects Categorized As',
  'encountered-encounteredAt': 'Encountered Objects Encountered At',
  'encountered-encounteredBy': 'Co-encountered Objects With',
  'encountered-material': 'Encountered Objects Made Of',
  'encountered-producedAt': 'Encountered Objects Created At',
  'encountered-producedBy': 'Encountered Objects Created By',
  'encountered-producedUsing': 'Encountered Objects Created Using',
  'encounteredHere-classification':
    'Is the Place of Encounter of Objects Categorized As',
  'encounteredHere-encounteredAt':
    'Is the Place of Encounter of Objects Encountered At',
  'encounteredHere-encounteredBy':
    'Is the Place of Encounter of Objects Encountered By',
  'encounteredHere-material': 'Is the Place of Encounter of Objects Made Of',
  'encounteredHere-producedAt':
    'Is the Place of Encounter of Objects Created At',
  'encounteredHere-producedBy':
    'Is the Place of Encounter of Objects Created By',
  'encounteredHere-producedUsing':
    'Is the Place of Encounter of Objects Created Using',
  'languageOf-aboutAgent': 'Is the Language of Works About',
  'languageOf-aboutConcept': 'Is the Language of Works About',
  'languageOf-aboutPlace': 'Is the Language of Works About',
  'languageOf-classification': 'Is the Language of Works Categorized As',
  'languageOf-createdAt': 'Is the Language of Works Created At',
  'languageOf-createdBy': 'Is the Language of Works Created By',
  'languageOf-language': 'Is the Language of Works In',
  'languageOf-publishedAt': 'Is the Language of Works Published At',
  'languageOf-publishedBy': 'Is the Language of Works Published By',
  'materialOfItem-classification': 'Is the Material of Objects Categorized As',
  'materialOfItem-encounteredAt': 'Is the Material of Objects Encountered At',
  'materialOfItem-encounteredBy': 'Is the Material of Objects Encountered By',
  'materialOfItem-material': 'Is the Material of Objects Made Of',
  'materialOfItem-producedAt': 'Is the Material of Objects Created At',
  'materialOfItem-producedBy': 'Is the Material of Objects Created By',
  'materialOfItem-producedUsing': 'Is the Material of Objects Created Using',
  'produced-classification': 'Created Objects Categorized As',
  'produced-encounteredAt': 'Created Objects Encountered At',
  'produced-encounteredBy': 'Created Objects Encountered By',
  'produced-material': 'Created Objects Made Of',
  'produced-producedAt': 'Created Objects Created At',
  'produced-producedBy': 'Co-created Objects With',
  'produced-producedUsing': 'Created Objects Using',
  'producedHere-classification':
    'Is the Place of Creation of Objects Categorized As',
  'producedHere-encounteredAt':
    'Is the Place of Creation of Objects Encountered At',
  'producedHere-encounteredBy':
    'Is the Place of Creation of Objects Encountered By',
  'producedHere-material': 'Is the Place of Creation of Objects Made Of',
  'producedHere-producedAt': 'Is the Place of Creation of Objects Created At',
  'producedHere-producedBy': 'Is the Place of Creation of Objects Created By',
  'producedHere-producedUsing':
    'Is the Place of Creation of Objects Created Using',
  'published-aboutAgent': 'Published Works About',
  'published-aboutConcept': 'Published Works About',
  'published-aboutPlace': 'Published Works About',
  'published-classification': 'Published Works Categorized As',
  'published-createdAt': 'Published Works Created At',
  'published-createdBy': 'Published Works Created By',
  'published-depictsAgent': 'Published Works that Depict',
  'published-depictsConcept': 'Published Works that Depict',
  'published-depictsPlace': 'Published Works that Depict',
  'published-language': 'Published Works In',
  'published-publishedAt': 'Published Works Published At',
  'published-publishedBy': 'Published Works With',
  'publishedHere-aboutAgent': 'Is the Place of Publication of Works About',
  'publishedHere-aboutConcept': 'Is the Place of Publication of Works About',
  'publishedHere-aboutPlace': 'Is the Place of Publication of Works About',
  'publishedHere-classification':
    'Is the Place of Publication of Objects Categorized As',
  'publishedHere-createdAt': 'Is the Place of Publication of Works Created At',
  'publishedHere-createdBy': 'Is the Place of Publication of Works Created By',
  'publishedHere-depictsAgent':
    'Is the Place of Publication of Works that Depict',
  'publishedHere-depictsConcept':
    'Is the Place of Publication of Works that Depict',
  'publishedHere-depictsPlace':
    'Is the Place of Publication of Works that Depict',
  'publishedHere-language': 'Is the Place of Publication of Works In',
  'publishedHere-publishedAt':
    'Is the Place of Publication of Works Published At',
  'publishedHere-publishedBy':
    'Is the Place of Publication of Works Published By',
  'subjectOfAgent-aboutAgent': 'Is the Subject of Works About',
  'subjectOfAgent-aboutConcept': 'Is the Subject of Works About',
  'subjectOfAgent-aboutPlace': 'Is the Subject of Works About',
  'subjectOfAgent-classification': 'Is the Subject of Works Categorized As',
  'subjectOfAgent-createdAt': 'Is the Subject of Works Created At',
  'subjectOfAgent-createdBy': 'Is the Subject of Works Created By',
  'subjectOfAgent-depictsAgent': 'Is the Subject of Works that Depict',
  'subjectOfAgent-depictsConcept': 'Is the Subject of Works that Depict',
  'subjectOfAgent-depictsPlace': 'Is the Subject of Works that Depict',
  'subjectOfAgent-language': 'Is the Subject of Works In',
  'subjectOfAgent-publishedAt': 'Is the Subject of Works Published At',
  'subjectOfAgent-publishedBy': 'Is the Subject of Works Published By',
  'subjectOfConcept-aboutAgent': 'Is the Subject Of Works About',
  'subjectOfConcept-aboutConcept': 'Is the Subject of Works About',
  'subjectOfConcept-aboutPlace': 'Is the Subject of Works About',
  'subjectOfConcept-classification': 'Is the Subject of Works Categorized As',
  'subjectOfConcept-createdAt': 'Is the Subject of Works Created At',
  'subjectOfConcept-createdBy': 'Is the Subject Of Works Created By',
  'subjectOfConcept-depictsAgent': 'Is the Subject of Works that Depict',
  'subjectOfConcept-depictsConcept': 'Is the Subject of Works that Depict',
  'subjectOfConcept-depictsPlace': 'Is the Subject of Works that Depict',
  'subjectOfConcept-language': 'Is the Subject of Works In',
  'subjectOfConcept-publishedAt': 'Is the Subject of Works Published At',
  'subjectOfConcept-publishedBy': 'Is the Subject Of Works Published By',
  'subjectOfPlace-aboutAgent': 'Is the Subject of Works About',
  'subjectOfPlace-aboutConcept': 'Is the Subject of Works About',
  'subjectOfPlace-aboutPlace': 'Is the Subject of Works About',
  'subjectOfPlace-classification': 'Is the Subject of Works Categorized As',
  'subjectOfPlace-createdAt': 'Is the Subject of Works Created At',
  'subjectOfPlace-createdBy': 'Is the Subject of Works Created By',
  'subjectOfPlace-depictsAgent': 'Is the Subject of Works that Depict',
  'subjectOfPlace-depictsConcept': 'Is the Subject of Works that Depict',
  'subjectOfPlace-depictsPlace': 'Is the Subject of Works that Depict',
  'subjectOfPlace-language': 'Is the Subject of Works In',
  'subjectOfPlace-publishedAt': 'Is the Subject of Works Published At',
  'subjectOfPlace-publishedBy': 'Is the Category of Works About',
  'usedToProduce-classification': 'Is the Technique of Objects Categorized As',
  'usedToProduce-encounteredAt': 'Is the Technique of Objects Encountered At',
  'usedToProduce-encounteredBy': 'Is the Technique of Objects Encountered By',
  'usedToProduce-material': 'Is the Technique of Objects Made Of',
  'usedToProduce-producedAt': 'Is the Technique of Objects Created At',
  'usedToProduce-producedBy': 'Is the Technique of Objects Created By',
  'usedToProduce-producedUsing': 'Is the Technique of Objects Created Using',
};

function getRelationName(relationKey) {
  if (RELATION_NAMES[relationKey]) {
    return RELATION_NAMES[relationKey];
  }
  const idx = relationKey.indexOf('-');
  const firstTerm = idx > -1 ? relationKey.substring(0, idx) : relationKey;
  return utils.uppercaseFirstCharacter(utils.camelCaseToWords(firstTerm));
}

export { RELATION_NAMES, getRelationName };
