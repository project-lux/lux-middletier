/* eslint-disable no-console */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/extensions */
/* eslint-disable no-restricted-syntax */
import * as fs from 'fs'
import { keyFuncNameMap } from './build-query/builder.js'

// -------------------------------------------------------------------------------------------------
// DESCRIPTION:
// This script tests that all HAL links in the middle tier have some matches
// and are being returned successfully

// It will output a .tsv file of succesfully run HAL links
// with their corresponding search-will-match and document links

// If any HAL links are missing, there will be a console error indicating what is missing.
// This is likely due to one of the URIs in the exampleDocs changing
// Please try updating the document URIs first if there is a missing link
// -------------------------------------------------------------------------------------------------
// USAGE:
// This file is meant to be run with node version >= v18 (node lib/hal-link-test-builder.mjs)
// Earlier versions may work as follows: (node --experimental-fetch lib/hal-link-test-builder.mjs)
// -------------------------------------------------------------------------------------------------
// ENV:
// The env below is defaulted to tst, but that can be changed
// -------------------------------------------------------------------------------------------------
const env = 'tst'
const dataPrefix = `https://lux-front-${env}.collections.yale.edu/data/`
const viewPrefix = `https://lux-front-${env}.collections.yale.edu/view/`
const searchWillMatchPrefix = `https://lux-front-${env}.collections.yale.edu/api/search-will-match`

// URIs are subject to change, so I included their names / equivelent identifiers
// all entries that have an equivalent URL in the comment can be searched for
// using the Identifier field in Advanced Search

const exampleDocs = {
  agent: [
    'person/95195aa1-7d50-40a3-906b-848d73556df6', // Andy Warhol - http://vocab.getty.edu/ulan/500006031
    'group/6b1104a6-4957-4b77-8218-9c686febd8db', // Carnegie Institute of Technology - https://linked-art.library.yale.edu/node/85544189-d03e-4516-9be2-0b6b2e841f7b
    'person/d0fa256d-e6ea-46a1-b101-b5f26ce2636a', // Lawrence F. Gall - https://images.peabody.yale.edu/data/agent/6/f0/6f02b49f-07ef-49dd-bac9-3563f933affe.json
    'group/512d9024-ac24-4994-b41d-b79d6e9e0a16', // Haas Arts Library - https://linked-art.library.yale.edu/node/57a151cc-b239-4baa-8b36-627b76e1f383
    'person/ae825eb3-ae9e-4359-bb73-814937bd71db', // Steve Wozniak - https://linked-art.library.yale.edu/node/5d988237-2ce2-4f0b-ae8c-8912ac9f830d
    'group/0e8bc04a-6538-4792-b82a-9e0751857e7d', // YCBA - https://linked-art.library.yale.edu/node/1671a363-51e2-4521-8595-1154666ee0f1
  ],
  concept: [
    'concept/5e62e5f8-60a8-4d38-b79b-895f44bf71ce', // American - http://vocab.getty.edu/aat/300107956
    'concept/5f857a13-add4-4c25-ae8b-019975e75bcd', // biological specimens - http://vocab.getty.edu/aat/300420186
    'concept/9ca0f47b-ff91-41d2-b23f-ef8bbf8e729b', // photographs - http://vocab.getty.edu/aat/300054225
    'concept/21c449ff-7ad8-4f08-ae5f-68bde74bc5ca', // artist - http://vocab.getty.edu/aat/300025103
    'concept/6f652917-4c07-4d51-8209-fcdd4f285343', // male - http://vocab.getty.edu/aat/300189559
    'concept/ce2af8c9-1d34-46be-a3cb-434f332d678b', // nations - http://vocab.getty.edu/aat/300128207
    'concept/86e2cdb0-e84a-46fe-89cd-fb344228f359', // exhibitions - http://vocab.getty.edu/aat/300054766
  ],
  event: [
    'activity/a2429315-9ed5-4188-b91d-27e4b4038ca2', // The Camden Group
    'activity/1f18ba99-f5f3-46ef-9c25-0ebcea1af8dd', // War of Independence
    'activity/d8de5723-0473-4727-b6ee-e6e0ab904905', // JMW Turner
    'activity/6297d4d4-ea61-45b2-8c47-9a0e6298fdcc', // Ming dynasty
    'activity/eb4ab523-5cfe-4a0a-b616-ef45a5e0c4ed', // Brewer's Industrial Exhibition
  ],
  item: [
    'object/36e11102-dae3-4d76-98a3-2c1a8f73ad1e', // Peyote 41
    'object/d6d7e96f-4526-4fe8-80a3-d4243cc77214', // Yosemity Valley, Glacier Point Trail
    'object/13e399ce-347e-4db9-a3de-ed5c073489a1', // Mao blue face
  ],
  place: [
    'place/e0c98aae-79b0-4a49-9b5e-4b6c7dafe8e5', // Illinois - http://viaf.org/viaf/138972861
    'place/d58c3785-2582-45b1-b467-1c31fc8b9187', // New York - http://viaf.org/viaf/146669294
    'place/d8c3e262-187a-40f3-843f-cf618aefde4a', // Malibu - http://viaf.org/viaf/533154380888430290186
  ],
  workset: [
    'text/aa3cc107-f012-4de4-86e6-78a99eb48024', // Rockets and blue lights
    'visual/84ffba3a-a6a1-4d9a-9711-f31b4116b7bb', // The blue lights
    'visual/a121e511-e010-40c0-80c7-bad50eff2844', // Portrait of Lynette
    'visual/72eaa0a9-7c71-4af2-8baa-03683de11ad5', // Andy Warhol Blue Movie
    'text/5ad5d97a-1b16-42c4-ad5e-145b2371643b', // Daubigny's Garden
    'set/4f988260-cbd6-409a-bcbe-53cf182611c8', // The Camden Group
    'set/600e1e8b-f85a-4cc8-ab5e-f47621afb1f4', // Thomas Davidson Papers
    'set/9b3042fc-dbcc-44ac-b0a9-88369803b0bb', // Entomology Collection
    'set/41f35f57-5490-46fe-9225-2ab7053fd053', // Leonard Crow Dog
    'set/5f1ff079-5f3a-4bd6-921a-5c6ae8f88262', // Ulrish Bonnell Phillips Papers
  ],
}
// create a set of missing HAL links to track what isn't completed at the end of the script
const missingHalLinks = {}
// create a set of successful HAL links to track all of the completed HAL links
const successfulHalLinks = {}

Object.keys(keyFuncNameMap).forEach((scope) => {
  Object.keys(keyFuncNameMap[scope]).forEach((halLinkName) => {
    const actualScope = (scope === 'work' || scope === 'set') ? 'workset' : scope
    if (!missingHalLinks[actualScope]) {
      missingHalLinks[actualScope] = new Set()
    }
    missingHalLinks[actualScope].add(halLinkName)
  })
})

// loop through the example docs and get the document from the middle tier's /data endpoint
for (const [scope, docArray] of Object.entries(exampleDocs)) {
  for (const uriSuffix of docArray) {
    const dataUri = `${dataPrefix}${uriSuffix}`
    const dataResponse = await fetch(dataUri)
    const doc = await dataResponse.json()
    // If we succesfully grabbed the document, add its hal links to the list of successful links.
    // and remove its hal links from the list of missing links.
    if (doc && doc._links) {
      for (const halLinkName of Object.keys(doc._links)) {
        if (['curies', 'self'].includes(halLinkName)) {
          continue
        }
        if (!successfulHalLinks[scope]) {
          successfulHalLinks[scope] = {}
        }
        if (!successfulHalLinks[scope][halLinkName]) {
          successfulHalLinks[scope][halLinkName] = {
            record: `${viewPrefix}${uriSuffix}`,
          }
        }
        missingHalLinks[scope].delete(halLinkName)
      }
    }
    if (missingHalLinks[scope].size === 0) {
      // if there are no more missing hal links for this scope
      // then don't process any more documents for this scope
      break
    }
  }
}
for (const [scope, set] of Object.entries(missingHalLinks)) {
  if (set.size > 0) {
    console.error(`THERE ARE MISSING HAL LINKS FOR SCOPE '${scope}':`)
    console.error(set)
  }
}
let tsvString = 'HAL Link\tRecord\n'
for (const [, halLinkInfo] of Object.entries(successfulHalLinks)) {
  for (const [halLinkName, { record }] of Object.entries(
    halLinkInfo,
  )) {
    tsvString += `${halLinkName}\t${record}\n`
  }
}
const today = new Date()
const dd = String(today.getDate()).padStart(2, '0')
const mm = String(today.getMonth() + 1).padStart(2, '0') // January is 0!
const yyyy = today.getFullYear()
const dateString = `${yyyy}-${mm}-${dd}`
fs.writeFileSync(`./halLinks-${env}-${dateString}.tsv`, tsvString)
