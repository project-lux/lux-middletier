// draft of test discussed on 10/9/2025 meeting

import http from 'k6/http';
import { SharedArray } from 'k6/data';
import { sleep } from 'k6';
import exec from 'k6/execution';

const prefix = "https://lux-front-dev.collections.yale.edu"

const data = new SharedArray('some name', function () {
  // All heavy work (opening and processing big files for example) should be done inside here.
  // This way it will happen only once and the result will be shared between all VUs, saving time and memory.

  // this can read from a file later
  const f = [{
    "simpleSearch": "andy warhol",
    "advancedSearch": {"_scope": "work", "aboutAgent":{"name":"John+Trumbull"}},
    "entityPage": "/data/place/f23964ce-4599-4029-afa3-c6df68871ddc",
    "facets": [
      '/data/concept/b34ad31c-4a2f-4cef-aee3-ae8d824e42a2',
      '/data/concept/2371a318-9852-4e05-8b43-30279505c6a5',
      '/data/concept/f205dced-45a6-46d4-a4c5-efec14705c55',
      '/data/concept/6e8c83b0-6e60-454e-8940-9faf87dc81a7',
      '/data/concept/7fca20bc-dd7a-468d-9a8b-ec4e11ed3998',
      '/data/concept/9de969a7-c3ee-4cac-a2eb-fd3ab99aa644',
      '/data/concept/47acacbc-19d3-4988-8a46-811ef8fe226f',
      '/data/concept/7cc507b7-f5d8-42e8-a820-5eb547d7f445',
      '/data/concept/82484ef6-33c1-41ba-a12f-74c99336a255',
      '/data/concept/ddd0e8c8-72b8-4ce5-b697-8129dc0e4915',
      '/data/concept/eef6f2c4-ce04-43ea-801e-2118dd808bd1',
      '/data/concept/fb01c56b-debc-49de-bf77-5fed2a2badc0'
    ],
    "searchResults": [
      '/data/object/64a6f0c2-6d58-44d8-8ffe-43ff5d213b62',
      '/data/object/01fdce36-37d5-4d89-8bce-f37789d380bb',
      '/data/object/a09e3daf-98f3-4632-bf2b-ee51bbf05e59',
      '/data/object/7ff11b4c-c8e8-4cea-9058-d30300e3be6a',
      '/data/object/f9dd680f-5031-49d2-bfe2-ff4be5d241bc',
      '/data/digital/777a2813-bb02-4850-bde9-7b7a080cf188',
      '/data/object/326cf8eb-e579-426c-9f17-d8bd31eeb8b3',
      '/data/object/8cf1cb1e-67ac-453c-9fe0-a989bec200c7',
      '/data/object/08a51684-b05f-43fb-9038-580832311428',
      '/data/object/5f5c8a1b-f74c-45c7-b31b-92f7832c32ef',
      '/data/object/71d35877-326c-40c5-b178-f1105acf6d6e',
      '/data/object/8de7bfaf-4956-42fd-a028-bd003d98411a',
      '/data/object/00cfd219-84f4-4742-965d-04bde1221b93',
      '/data/object/cd9f794b-551c-4c7f-bb6b-0071bc1e6035',
      '/data/object/b0d24dd3-896a-4bab-a83d-0bd271a393b2',
      '/data/object/8de6f8dc-7730-44a3-b2e6-fe55969a085c',
      '/data/object/7a0d34c0-187d-4562-854e-40cd94366290',
      '/data/object/72c1ebe6-d0b4-4ac1-8632-19d854b2bcd9',
      '/data/object/c4de32a5-a8cb-4f59-b322-78bd5fc4aa61',
      '/data/object/d651811f-2c4d-4ea3-aa40-0241905adc8a',
      '/data/visual/75460b1e-0201-4e95-aee7-473bc490b23d',
      '/data/visual/cc029396-c33c-4726-ac3c-21dd1d8dce31',
      '/data/visual/fba967f2-a629-4a75-bf48-9da0138bea61',
      '/data/visual/d028db0a-1c11-4bea-a791-908c92b267ff',
      '/data/visual/427cc2ef-451c-46c0-b662-06f616bd99bc',
      '/data/visual/2030a6d8-9e4e-4a5d-b9ca-5921f83a7304',
      '/data/visual/b27a3236-8c89-4bdd-9056-a35ca158aa60',
      '/data/visual/b8ee3da2-1b53-4812-92ed-df58a3a17560',
      '/data/visual/400fc5c6-d377-41c0-bfff-6a510fb8ecb5',
      '/data/visual/d688dfa1-fc64-44f8-bf9f-1e91c197b896',
      '/data/visual/cf79e439-8595-44e4-9ee9-2088d71bef21',
      '/data/visual/b238c96c-50c6-4dd5-b59a-944884b4c48d',
      '/data/visual/403d41d2-29a0-471b-85e4-660579028911',
      '/data/visual/5b1f3a49-f1a9-4fbb-9f76-f317c544b536',
      '/data/visual/1a6486fc-569a-4438-9123-3f4579822d21',
      '/data/visual/e45a136e-ed6c-4b9b-8efd-b72d4995a60e',
      '/data/text/9d4b812d-bb84-426c-ba71-b17f220fa06b',
      '/data/text/1e4d3eab-4abb-4b4a-9994-4bd93b267d10',
      '/data/text/67779369-8382-4ae1-982c-9252eb55067f',
      '/data/text/606a1b45-2ffc-462f-a966-0ee0f64fbc86'
    ]
}]
  return f; // f must be an array
});

export const options = {
  discardResponseBodies: true,
  scenarios: {
    contacts: {
      executor: 'constant-arrival-rate',

      // How long the test lasts
      duration: '30s',

      // How many iterations per timeUnit
      rate: 3,

      // Start `rate` iterations per second
      timeUnit: '1s',

      // Pre-allocate 10 VUs before starting the test
      preAllocatedVUs: 10,

      // Spin up a maximum of 50 VUs to sustain the defined
      // constant arrival rate.
      maxVUs: 10,
      gracefulStop: '1200s'
    },
  },
};

async function asyncGet(url) {
  console.log("VU:", __VU, "iteration:", exec.scenario.iterationInTest, "asyncGetting url:", url)
  http.get(url);
}

function addPrefix(urlSuffix){
 return `${prefix}${urlSuffix}`;
}

// this is one iteration
export default function() {
  const entry = data[(exec.scenario.iterationInTest)  % data.length]
  // first, translate simple search
  asyncGet(`${prefix}/api/translate/item?q=${encodeURIComponent(entry.simpleSearch)}`);
  sleep(0.2)

  // are we executing translated simple search? That would mean waiting for the respnose. So, I think we need a pre-formed simple search.
  

  for (let i = 0; i < data.length; i++) {
    asyncGet(data[i]);
    sleep(0.1)
  }
}