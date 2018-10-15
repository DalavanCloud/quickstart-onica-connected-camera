import { ipcMain } from 'electron';
//const url = require('url');
const request = require('request-promise-native')

/**
 * Provisioning service in main process
 */
export class ProvisioningService {

  registerMainProcessIPC() {
    ipcMain.on('check-stack-endpoint-request', this.checkStackEndpoint.bind(this))
    ipcMain.on('provision-camera-request', this.provisionCamera.bind(this))
  }

  /**
   * @param args {stackEndpoint, provisioningKey}.
   */
  checkStackEndpoint(event, args) {
    console.log("main process received stack endpoint requests.")
    console.log(args)

    const url = (args.stackEndpoint || '').trim() + "/stack_availability"
    const Authorization = (args.provisioningKey || '').trim()
    console.log(url)
    request({
      url,
      method: 'get',
      headers: {
        Authorization
      }
    }).then(result => {
      console.log("Stack available.")
      console.log(result)
      event.sender.send('check-stack-endpoint-response', {})
    }).catch(err => {
      //403 response means invalid provisioning key.
      //No response means stack url is incorrect or inaccessible.
      console.log("Stack not available")
      console.log(err)
      console.log(err.name)
      console.log(err.statusCode)
      console.log(err.message)
      const error = err.statusCode == 403 ? 'provisioningKey' : 'stackEndpoint'
      event.sender.send('check-stack-endpoint-response', {error})
    })
  }

  /**
   * @param args {stackEndpoint, provisioningKey, camera}.
   * @returns {camera, error, errorMessage}
   */
  provisionCamera(event, args) {
    console.log("main process received provisiong camera request.")
    console.log(args)

    const url = (args.stackEndpoint || '').trim() + "/provision"
    const Authorization = (args.provisioningKey || '').trim()
    const id = args.camera.urn
    console.log(url)
    request({
      url,
      method: 'post',
      headers: {
        Authorization
      },
      body: JSON.stringify({id})
    }).then(result => {
      console.log("Provisioning success!")
      console.log(result)
      event.sender.send('provision-camera-response', {camera: args.camera})
    }).catch(err => {
      console.log("Provisioning failure!")
      console.log(err)
      console.log(err.name)
      console.log(err.statusCode)
      console.log(err.message)
      event.sender.send('provision-camera-response', {camera: args.camera, error: true, errorMessage: "Stack provisioning api failure: " + err.message})
    })
  }
}
