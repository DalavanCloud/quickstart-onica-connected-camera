'use strict';

const AWS = require("aws-sdk")

class ProvisioningService {

  constructor() {
    this._iot = new AWS.Iot()
    this._iam = new AWS.IAM()
  }

  async provisionThing(id) {
    //unique id is the thing name.
    const thingName = id

    // TBD what to do if thing already exists. reprovisioning it works fine
    // and may be desired anyway e.g. if camera is in some kind of error state.
    try {
      const existingThing = await this._iot.describeThing({thingName}).promise()
      console.log(`WARN: Thing ${thingName} already exists.`)
      console.log(existingThing)
    } catch (err) {
      //Ignore ResourceNotFoundException
    }

    //create thing
    const thing = await this._iot.createThing({thingName}).promise()

    //create cert
    const keys = await this._iot.createKeysAndCertificate({setAsActive: true}).promise()

    //associate certificate with thing
    const principal = keys.certificateArn
    const attachThingPrincipal = await this._iot.attachThingPrincipal({thingName, principal}).promise()

    //associate iot policy
    const policyName = process.env.IoTCameraPolicyName
    const target = keys.certificateArn
    const attachPolicy = await this._iot.attachPolicy({ policyName, target }).promise()

    //iot credential endpoint for role alias
    const endpoint = await this._iot.describeEndpoint({endpointType: "iot:CredentialProvider"}).promise()
    const roleAlias = process.env.CameraStreamingRoleAliasName
    const IoTCredentialUrl = `https://${endpoint.endpointAddress}/role-aliases/${roleAlias}/credentials`

    return {
      StreamName: thingName, //TODO provision stream
      Region: "REGION-TBD", //TBD
      IoTCertificate: keys.certificatePem,
      IoTPrivateKey: keys.keyPair.PrivateKey,
      IoTCredentialUrl
    }
  }


}

module.exports = new ProvisioningService()
