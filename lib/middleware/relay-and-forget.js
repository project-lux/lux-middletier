import https from 'https'

import env from '../../config/env.js'
import log from '../log.js'

function _relayAndForget(req, targetUrl) {
  if (
    (!req.url.startsWith('/data/') && !req.url.startsWith('/api/')) ||
    req.url.startsWith('/api/_info')
  ) {
    return
  }
  const req2 = https.request(
    {
      hostname: targetUrl,
      path: req.url,
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'lux-middletier',
      },
    },
    (res2) => {
      res2.destroy() // we don't care about the response
    }
  )
  req2.on('error', (e) => {
    // ignore
  })
  req2.on('close', () => {
    // ignore
  })

  setTimeout(() => {
    req2.destroy() // timeout after 2 seconds
  }, 2000)

  req2.end()
}

export function relayAndForget(req, res, next) {
  env.relayAndForgetTargets.forEach((target) => {
    _relayAndForget(req, target)
  })
  next()
}
