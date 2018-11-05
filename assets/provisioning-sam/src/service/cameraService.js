'use strict';

const AWS = require("aws-sdk")

class CameraService {

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
      console.log("Missing camera id.")
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

  async getShadow(id) {
    console.log(`getShadow(id = ${id})`)

    const iot = await this._iotdata

    if (!id) {
      console.log("Missing camera id.")
      return {}
    }

    const thingName = id
    const dataShadow = await iot.getThingShadow({thingName}).promise()
    const shadow = dataShadow.payload

    return JSON.parse(shadow)
  }
}

module.exports = new CameraService()
