// Convert a string value to an number. Return defaultValue if conversion fails.
function getNumArg(value, defaultValue) {
  const n = parseInt(value, 10)

  if (Number.isNaN(n)) {
    return defaultValue
  }
  return n
}

// Extract remote IP addresses from the request.
function remoteIps(req) {
  return `${req.socket.remoteAddress},${req.headers['x-forwarded-for']}`
}

// Traverse the object tree and do string replacement (fromStr to toStr)
// for each string value it encounter.
function replaceStringsInObject(obj, fromStr, toStr) {
  if (!(fromStr && toStr) || obj == null) {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(elem => replaceStringsInObject(elem, fromStr, toStr))
  }
  if (typeof obj === 'object') {
    const returnObj = {}
    Object.entries(obj).forEach(elem => {
      const [k, v] = elem
      returnObj[k] = replaceStringsInObject(v, fromStr, toStr)
    })
    return returnObj
  }
  if (typeof obj === 'string') {
    return obj.replace(fromStr, toStr)
  }
  return obj
}

/*
 * Convert nano seconds to more readable string
 * @param {bigint} nanoSec - duration in nanoseconds
 */
function nanoSecToString(nanoSec) {
  let s = nanoSec / 1_000_000_000n
  const ns = nanoSec % 1_000_000_000n
  const m = s / 60n
  s %= 60n

  if (m < 1) {
    return `${s}.${`${ns}`.padStart(9, '0')}s`
  }

  return `${m}m ${s}.${`${ns}`.padStart(9, '0')}s`
}

export {
  getNumArg,
  nanoSecToString,
  replaceStringsInObject,
  remoteIps,
}
