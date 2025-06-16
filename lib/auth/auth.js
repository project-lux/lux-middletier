import jwt from 'jsonwebtoken'
import jwksClient, { JwksClient } from 'jwks-rsa'

import env from '../../config/env.js'
import { authenticateUser } from './cognito.js'

let _tokenInfo = {
  accessToken: null,
  refreshToken: null,
  expiresAt: 0, // seconds since epoch
  username: null,
}

async function serviceLogin() {
  const result = await authenticateUser(
    env.cognitoClientId,
    env.cognitoServiceUsername,
    env.cognitoServicePassword,
  )
  const decoded = await verifyToken(result.accessToken)
  console.log('service accessToken:', decoded)
  _tokenInfo = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: decoded.exp * 1e3, // milliseconds since epoch
    username: decoded.username,
  }
  return _tokenInfo
}

export async function getServiceToken() {
  try {
    // If the current time is earlier than 1 minute before the token
    // expiration time, consider it valid.
    if (new Date().getTime() < _tokenInfo.expiresAt - 60e3) {
      console.log('getServiceToken - reusing existing token')
      return {
        accessToken: _tokenInfo.accessToken,
        username: _tokenInfo.username,
      }
    }
    console.log('getServiceToken - obtaining a new token')
    const tokenInfo = await serviceLogin()
    console.log('VV', tokenInfo)
    console.log('accessToken:', tokenInfo.accessToken, 'username:', tokenInfo.username)
    return tokenInfo
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
