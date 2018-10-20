/**
 * Stub api for get status on camera.
 */
exports.status = async (event, context) => {
  try {
    if (!isAuthorized(event)) {
      return {
        statusCode: 403,
        body: JSON.stringify({Status: "ERROR", "Error": "Invalid Credentials"})
      }
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({Status: "UNPAIRED"}) //or PAIRING, PAIRED, ERROR
      }
    }
  } catch (err) {
    console.log(err)
    return {
      statusCode: 500,
      body: JSON.stringify({Status: "ERROR", "Error": err.message})
    }
  }
}

/**
 * Stub api to provision camera.
 *
 */
exports.pair = async (event, context) => {
  try {
    if (!isAuthorized(event)) {
      return {
        statusCode: 403,
        body: JSON.stringify({Status: "ERROR", "Error": "Invalid Credentials"})
      }
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({})
      }
    }
  } catch (err) {
    console.log(err)
    return {
      statusCode: 500,
      body: JSON.stringify({Status: "ERROR", "Error": err.message})
    }
  }
}

/**
 * return true, or false iff provided basic auth user/pass fail/fail
 */
const isAuthorized = (event) => {
  const headers = event.headers || {}
  return headers.Authorization != 'Basic ZmFpbDpmYWls'
}
