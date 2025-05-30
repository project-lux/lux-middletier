import winston from 'winston'
import env from '../config/env.js'
import { nanoSecToString, remoteIps } from '../lib/util.js'

const logger = winston.createLogger({
  level: env.logLevel,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
  ],
})

export function debug(message) {
  logger.log({
    level: 'debug',
    message,
  })
}

export function info(message) {
  logger.log({
    level: 'info',
    message,
  })
}

export function warn(message) {
  logger.log({
    level: 'info',
    message,
  })
}

export function error(message) {
  logger.log({
    level: 'error',
    message,
  })
}

export function logResult(req, durationNS, error) {
  logger.log({
    level: 'debug',
    endpoint: req.url,
    statusCode: error.statusCode || 200,
    error: error.errorMessage || '',
    durationNS,
    durationStr: nanoSecToString(durationNS),
    remoteIps: remoteIps(req),
  })
}

export default logger
