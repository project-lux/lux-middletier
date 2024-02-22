const winston = require('winston')
const env = require('../config/env')

const logger = winston.createLogger({
  level: env.logLevel,
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
  ],
})

function debug(s) {
  logger.debug(`[${process.pid}] ${s}`)
}

function info(s) {
  logger.info(`[${process.pid}] ${s}`)
}

function warn(s) {
  logger.warn(`[${process.pid}] ${s}`)
}

function error(s) {
  logger.error(`[${process.pid}] ${s}`)
}

module.exports = {
  debug,
  info,
  warn,
  error,
}
