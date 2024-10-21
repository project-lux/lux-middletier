import os from 'os'
import cluster from 'cluster'

import newApp from './app/app.js'
import env from './config/env.js'
import * as log from './lib/log.js'

const numCores = os.cpus().length
const numInstances = env.numInstances === -1 ? numCores * 2 : env.numInstances

if (cluster.isMaster) {
  log.info(`numCores: ${numCores}`)
  log.info(`numInstances: ${numInstances}`)
  log.info(`ML host - fast lane: ${env.mlHost}:${env.mlPort}`)
  log.info(`ML host - slow lane: ${env.mlHost2}:${env.mlPort2}`)
}

// Bring up the requested number (= numInstances) of node app servers.
if (numInstances > 1) {
  if (cluster.isMaster) {
    for (let i = 0; i < numInstances; ++i) {
      cluster.fork()
    }

    cluster.on('exit', (worker, code, signal) => {
      log.info(`Worker ${worker.id} died.`, code, signal)
      const newWorker = cluster.fork()
      log.info(`Worker ${newWorker.id} created.`)
    })
  } else {
    const app = newApp()
    app.run()
  }
} else {
  const app = newApp()
  app.run()
}
