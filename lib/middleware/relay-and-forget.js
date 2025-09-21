import https from 'https'

import env from '../../config/env.js'
import log from '../log.js'

export function relayAndForget(req, res, next) {
  let req2 = null

  if (
    !env.relayAndForgetTarget ||
    (!req.url.startsWith('/data/') && !req.url.startsWith('/api/'))
  ) {
    console.log('Skipping relay-and-forget for', req.url)
    next()
    return
  }

  req2 = https.request({
    hostname: env.relayAndForgetTarget,
    path: req.url,
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'lux-middletier',
    },
  },
  (res2) => {
    res2.destroy() // we don't care about the response
  });

  req2.on('error', (e) => {
    // ignore
  })
  req2.on('close', () => {
    // ignore
  })

  req2.end()
  next()
}
