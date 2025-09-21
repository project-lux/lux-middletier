function getInt(s) {
  if (s === undefined) {
    return null
  }
  return parseInt(s, 10)
}

// All environment variables should be imported here.
const env = {
  appPort: process.env.APP_PORT === undefined ? 8080 : parseInt(process.env.APP_PORT, 10),
  numInstances: getInt(process.env.NUM_INSTANCES) || -1,
  searchUriHost: process.env.SEARCH_URI_HOST || 'https://lux.collections.yale.edu',
  resultUriHost: process.env.RESULT_URI_HOST || null,
  unitName: process.env.UNIT_NAME || null,
  aiHost: process.env.AI_HOST || null,
  mlSsl: process.env.ML_SSL === 'true',
  mlAuthType: process.env.ML_AUTH_TYPE,

  mlHost: process.env.ML_HOST,
  mlPort: process.env.ML_PORT,
  mlUser: process.env.ML_USER,
  mlPass: process.env.ML_PASS,

  cognitoJwksUri: process.env.COGNITO_JWKS_URI,
  cognitoClientId: process.env.COGNITO_CLIENT_ID,
  cognitoServiceUsername: process.env.COGNITO_SERVICE_USERNAME,
  cognitoServicePassword: process.env.COGNITO_SERVICE_PASSWORD,

  logLevel: process.env.LOG_LEVEL || 'debug',
  featureMyCollections: process.env.FEATURE_MY_COLLECTIONS === 'true',

  relayAndForgetTarget: process.env.RELAY_AND_FORGET_TARGET || null,
}

export default env
