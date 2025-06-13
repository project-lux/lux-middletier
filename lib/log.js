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
    level: 'warn',
    message,
  })
}

export function error(message) {
  logger.log({
    level: 'error',
    message,
  })
}

export function logResult(req, username, durationNS, error) {
  // Because durationNS is a BigInt type, Winston converts it to
  // a string when it serializes the data to JSON, which will
  // complicate querying later from CloudWatch Log Insights.
  // If we convert it to Number here, we can have it as the Number type
  // although we may lose precision -- insignificant for logging purposes
  // -- in some cases.
  const durationNS2 = Number(durationNS)

  logger.log({
    level: 'debug',
    endpoint: req.url,
    method: req.method,
    statusCode: error.statusCode || 200,
    error: error.errorMessage || '',
    durationNS: durationNS2,
    durationStr: nanoSecToString(durationNS),
    remoteIps: remoteIps(req),
    username,
  })
}

export default logger
