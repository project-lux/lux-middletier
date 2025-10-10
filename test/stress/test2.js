// test multiple calls per iteration
import http from 'k6/http';
import { SharedArray } from 'k6/data';
import { sleep } from 'k6';
import exec from 'k6/execution';

const data = new SharedArray('some name', function () {
  // All heavy work (opening and processing big files for example) should be done inside here.
  // This way it will happen only once and the result will be shared between all VUs, saving time and memory.

  // this can read from a file later
  const f = [
    "https://lux-front-dev.collections.yale.edu/api/search/item?q=%7B%22AND%22%3A%5B%7B%22text%22%3A%22andy%22%2C%22_lang%22%3A%22en%22%7D%2C%7B%22text%22%3A%22warhol%22%2C%22_lang%22%3A%22en%22%7D%5D%7D&page=1",
    "https://lux-front-dev.collections.yale.edu/data/object/64a6f0c2-6d58-44d8-8ffe-43ff5d213b62",
    "https://lux-front-dev.collections.yale.edu/data/person/66049111-383e-4526-9632-2e9b6b6302dd",
    "https://lux-front-dev.collections.yale.edu/api/facets/item?q=%7B%22AND%22%3A%5B%7B%22text%22%3A%22blue%22%2C%22_lang%22%3A%22en%22%7D%2C%7B%22text%22%3A%22whale%22%2C%22_lang%22%3A%22en%22%7D%5D%7D&name=itemHasDigitalImage&page=1",
    "https://lux-front-dev.collections.yale.edu/api/facets/item?q=%7B%22AND%22%3A%5B%7B%22text%22%3A%22blue%22%2C%22_lang%22%3A%22en%22%7D%2C%7B%22text%22%3A%22whale%22%2C%22_lang%22%3A%22en%22%7D%5D%7D&name=itemEncounteredPlaceId&page=1",
    "https://lux-front-dev.collections.yale.edu/api/related-list/agent?&name=relatedToAgent&uri=https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fperson%2F66049111-383e-4526-9632-2e9b6b6302dd"

]
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

export default function() {
  for (let i = 0; i < data.length; i++) {
    asyncGet(data[i]);
    sleep(0.1)
  }
}