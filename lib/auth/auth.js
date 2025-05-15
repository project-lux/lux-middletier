import jwt from 'jsonwebtoken'
import jwksClient, { JwksClient } from 'jwks-rsa'

import env from '../../config/env.js'
import { authenticateUser } from './cognito.js'

const serviceToken = {
  accessToken: null,
  refreshToken: null,
  expiresAt: new Date(0),
}

async function serviceLogin() {
  const result = await authenticateUser(
    env.cognitoClientId,
    env.cognitoServiceUsername,
    env.cognitoServicePassword,
  )
  const decoded = await verifyToken(result.accessToken)
  console.log('service accessToken:', decoded)
  serviceToken.accessToken = result.accessToken
  serviceToken.refreshToken = result.refreshToken
  serviceToken.expiresAt = new Date(decoded.exp * 1000)
  return result.accessToken
}

export async function getServiceToken() {
  try {
    if (serviceToken.expiresAt > new Date(new Date().getTime() - 300e3)) {
      return serviceToken.accessToken
    }
    return await serviceLogin()
  } catch (error) {
    console.error('getServiceToken failed - ', error)
    throw error
  }
}

/**
 * Extracts the access token from the request.
 * If none, return an empty string.
 */
export function extractAccessToken(req) {
  const header = req.headers['authorization']
  let token = ''

  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1]
  }
  return token
}

let _jwks = null

function getKey(header, callback) {
  const jwks = getJwksClient()
  jwks.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey()
    callback(null, signingKey)
  })
}

function getJwksClient() {
  if (_jwks === null) {
    _jwks = jwksClient({
      jwksUri: env.cognitoJwksUri,
    })
  }
  return _jwks
}

export function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        reject(`Invalid token: ${token} - ${err.message}`)
      }
      resolve(decoded)
    })
  })
}
