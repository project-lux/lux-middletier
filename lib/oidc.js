const { Issuer } = require('openid-client')

const issuerUrl = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_a9pmDlRfn/.well-known/openid-configuration'

async function getServiceToken() {
  const issuer = await Issuer.discover(issuerUrl)
  console.log('Issuer:', issuer)
}

/**
 * Extracts the access token from the request.
 * If none, return an empty string.
 */
function extractAccessToken(req) {
  const header = req.headers['authorization']
  let token = ''

  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1]
  }
  return token
}

exports.getServiceToken = getServiceToken
