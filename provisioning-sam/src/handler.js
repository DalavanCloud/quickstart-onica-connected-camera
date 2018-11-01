const provisioningService = require('./service/provisioningService')
const monitoringService = require('./service/monitoringService')

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 * @param {string} event.resource - Resource path.
 * @param {string} event.path - Path parameter.
 * @param {string} event.httpMethod - Incoming request's method name.
 * @param {Object} event.headers - Incoming request headers.
 * @param {Object} event.queryStringParameters - query string parameters.
 * @param {Object} event.pathParameters - path parameters.
 * @param {Object} event.stageVariables - Applicable stage variables.
 * @param {Object} event.requestContext - Request context, including authorizer-returned key-value pairs, requestId, sourceIp, etc.
 * @param {Object} event.body - A JSON string of the request payload.
 * @param {boolean} event.body.isBase64Encoded - A boolean flag to indicate if the applicable request payload is Base64-encode
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 * @param {string} context.logGroupName - Cloudwatch Log Group name
 * @param {string} context.logStreamName - Cloudwatch Log stream name.
 * @param {string} context.functionName - Lambda function name.
 * @param {string} context.memoryLimitInMB - Function memory.
 * @param {string} context.functionVersion - Function version identifier.
 * @param {function} context.getRemainingTimeInMillis - Time in milliseconds before function times out.
 * @param {string} context.awsRequestId - Lambda request ID.
 * @param {string} context.invokedFunctionArn - Function ARN.
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * @returns {boolean} object.isBase64Encoded - A boolean flag to indicate if the applicable payload is Base64-encode (binary support)
 * @returns {string} object.statusCode - HTTP Status Code to be returned to the client
 * @returns {Object} object.headers - HTTP Headers to be returned
 * @returns {Object} object.body - JSON Payload to be returned
 *
 */
exports.getStackAvailability = async (event, context) => {
  try {
    const headers = event.headers || {}
    const authorized = await provisioningService.authorize(headers.Authorization)
    if (!authorized) {
      return {
        statusCode: 403,
        body: JSON.stringify({message: "Invalid Provisioning Key."})
      }
    } else {
      //stack available
      return {
        statusCode: 200,
        body: JSON.stringify({})
      }
    }
  } catch (err) {
    console.log(err)
    return {
      statusCode: 500,
      body: JSON.stringify({message: err.message, stack: err.stack})
    }
  }
}

/**
 * Provision thing. Post body thing: {id}
 */
exports.provisionThing = async (event, context) => {

  try {
    const headers = event.headers || {}
    const authorized = await provisioningService.authorize(headers.Authorization)
    if (!authorized) {
      return {
        statusCode: 403,
        body: JSON.stringify({message: "Invalid Provisioning Key."})
      }
    } else {
      //provision thing
      const body = JSON.parse(event.body)
      const id = body.id

      let thing = await provisioningService.provisionThing(id)
      return {
        statusCode: 200,
        body: JSON.stringify(thing)
      }
    }
  } catch (err) {
    console.log(err)
    return {
      statusCode: 500,
      body: JSON.stringify({message: err.message, stack: err.stack})
    }
  }
}

/**
 * Monitor the state of the stream. The event is a CloudWatch Alarm via SNS.
 */
exports.monitoring = async (event, context) => {
  try {
    for (let record of event.Records) {
      const alarm = JSON.parse(record.Sns.Message)
      const id = alarm.Trigger.Dimensions.filter(d => 'StreamName' == d.name).map(d => d.value)[0]

      await monitoringService.setStreaming(id, 'OK' == alarm.NewStateValue)
    }
  } catch (err) {
    console.log(JSON.stringify(event))
    console.log(err)
  }
}
