function getInt(s) {
  if (s === undefined) {
    return null
  }
  return parseInt(s, 10)
}

// All environment variables should be imported here.
module.exports = {
  appPort: process.env.APP_PORT === undefined ? 8080 : parseInt(process.env.APP_PORT, 10),
  numInstances: getInt(process.env.NUM_INSTANCES) || -1,
  searchUriHost: process.env.SEARCH_URI_HOST || 'https://.yale.edu',
  resultUriHost: process.env.RESULT_URI_HOST || null,
  mlSsl: process.env.ML_SSL === 'true',
  mlAuthType: process.env.ML_AUTH_TYPE,

  mlHost: process.env.ML_HOST,
  mlPort: process.env.ML_PORT,
  mlUser: process.env.ML_USER,
  mlPass: process.env.ML_PASS,

  mlHost2: process.env.ML_HOST2,
  mlPort2: process.env.ML_PORT2,
  mlUser2: process.env.ML_USER2,
  mlPass2: process.env.ML_PASS2,

  logLevel: process.env.LOG_LEVEL || 'debug',
}
