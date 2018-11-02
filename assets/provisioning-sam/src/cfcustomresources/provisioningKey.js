const AWS = require("aws-sdk");
const uuid = require('uuid/v4')

/**
 * Custom resource lambda to create provisioning key in ddb.
 */
exports.handler = function(event, context) {
  try {
    console.log("REQUEST RECEIVED:\n" + JSON.stringify(event))

    // For Delete requests, immediately send a SUCCESS response.
    // Stack deletion will remove the table anyway.
    if (event.RequestType == "Delete") {
      sendResponse(event, context, "SUCCESS")
      return
    }

    //verify params
    const provisioningKeyTableName = event.ResourceProperties.ProvisioningKeyTableName
    if (!provisioningKeyTableName) {
      throw new Error("ProvisioningKeyTableName parameter is required.")
    }

    //some users may want to manually generate keys
    const createProvisioningKey = event.ResourceProperties.CreateProvisioningKey
    if (createProvisioningKey !== 'true') {
      console.log("Skip creating provisioning key.")
      sendResponse(event, context, "SUCCESS", {provisioningKey: `Create manually in ${provisioningKeyTableName} DynamoDB table`})
      return
    }

    //generate key
    const provisioningKey = uuid()

    //add to ddb
    const docClient = new AWS.DynamoDB.DocumentClient()
    docClient.put({
      TableName: provisioningKeyTableName,
      Item: {
        key: provisioningKey
      }
    }).promise()
      .then(() => {
        console.log("Created provisioning key.")
        sendResponse(event, context, "SUCCESS", {provisioningKey})
      })
      .catch(err => sendFailed(event, context, err, "Error adding provisioning key."))
  } catch (err) {
    sendFailed(event, context, err, "Error executing provisioningKey custom resource.")
  }
}

function sendFailed(event, context, err, message) {
  if (message != null) {
    console.log(message)
  }
  console.log(err)
  const responseData = {message, errorMessage: err.message, errorStack: err.stack}
  sendResponse(event, context, "FAILED", responseData)
}

// Send response to the pre-signed S3 URL
function sendResponse(event, context, responseStatus, responseData) {

  var responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData
  });

  console.log("RESPONSE BODY:\n", responseBody);

  var https = require("https");
  var url = require("url");

  var parsedUrl = url.parse(event.ResponseURL);
  var options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: "PUT",
    headers: {
      "content-type": "",
      "content-length": responseBody.length
    }
  };

  console.log("SENDING RESPONSE...\n");

  var request = https.request(options, function(response) {
    console.log("STATUS: " + response.statusCode);
    console.log("HEADERS: " + JSON.stringify(response.headers));
    // Tell AWS Lambda that the function execution is done
    context.done();
  });

  request.on("error", function(error) {
    console.log("sendResponse Error:" + error);
    // Tell AWS Lambda that the function execution is done
    context.done();
  });

  // write data to request body
  request.write(responseBody);
  request.end();
}
