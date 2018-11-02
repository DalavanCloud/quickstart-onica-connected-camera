'use strict';

const AWS = require("aws-sdk")

class ProvisioningKeyRepository {

  constructor() {
    this._docClient = new AWS.DynamoDB.DocumentClient({convertEmptyValues: true})
  }

  existsProvisioningKey(key) {
    const params = {
      TableName: process.env.ProvisioningKeyTableName,
      Key: {
        key
      }
    }

    return this._docClient.get(params).promise()
      .then(data => data.Item != undefined)
  }

}

module.exports = new ProvisioningKeyRepository()
