'use strict';

const AWS = require("aws-sdk")

class MonitoringService {

  constructor() {
    this._iot = new AWS.Iot()

    this._iotdata = this._iot.describeEndpoint({endpointType: 'iot:Data'}).promise()
      .then(data => {
        const endpoint = data.endpointAddress
        return new AWS.IotData({endpoint})
      })
  }

  async setStreaming(id, isStreaming) {
    const iot = await this._iotdata

    if (!id) {
      console.log("Missing stream id.")
      return
    }

    console.log(`Updating camera(${id}) shadow streaming(${isStreaming}) state.`)

    const shadow = {
      state: {
        reported: {
          streaming: isStreaming || false
        }
      }
    }

    const thingName = id
    const payload = JSON.stringify(shadow)

    const state = await iot.updateThingShadow({thingName, payload}).promise()

    console.log(`Camera(${id}) shadow updated.`)
  }
}

module.exports = new MonitoringService()
