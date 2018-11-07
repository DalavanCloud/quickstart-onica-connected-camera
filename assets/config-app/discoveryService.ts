import { ipcMain } from 'electron';
const onvif = require('node-onvif');
const url = require('url');
const request = require('request-promise-native')

/**
 * Discovery service in main process (onvif)
 */
export class DiscoveryService {

  registerMainProcessIPC() {
    console.log("setupDiscovery")
    ipcMain.on('discover-request', this.discover.bind(this))
    ipcMain.on('status-request', this.statusRequest.bind(this))
  }

  /**
   * @param args irrelevant.
   */
  discover(event, args) {
    console.log("main process received discover requests.")
    onvif.startProbe().then((device_info_list) => {
      console.log(device_info_list.length + ' devices were found.');
      const cameras = this._processDeviceInfoList(device_info_list)

      //check discovered cameras reported status
      const cameraStatusPromises = cameras.map(camera => {
        camera.cameraApiScheme = args.cameraApiScheme
        camera.cameraApiUsername = args.cameraApiUsername
        camera.cameraApiPassword = args.cameraApiPassword
        return this.updateCameraStatus({camera})
      })

      const shadows = cameras.map(camera => {
        return this._checkShadow(event, args, camera).then(shadow => {
          try {
            camera.streaming = shadow.state.reported.streaming;
          } catch (err) {
            console.log(err);
            camera.streaming = false;
          }

          return camera;
        }).catch(err => {
            camera.streaming = false;
        });
      });

      Promise.all([...cameraStatusPromises, ...shadows]).then(() => {
        event.sender.send('discover-response', cameras)
      });

    }).catch((error) => {
      console.log("ERROR discovering");
      console.log(error);
      //console.error(error);
      //reject();
    });
  }

  _processDeviceInfoList(deviceInfoList) {
    //return [{urn: 'a4cf0b67-ed25-418d-2910-55ac6ce5dadb', name: 'CAMERA ABCD1234-EFG', ip: '172.16.22.178', status: 'UNPAIRED'}]

    //FIXME handle unexpected input
    let urnStart = 'urn:uuid:'
    return deviceInfoList.map(device => {
      console.log(device)
      let urn = device.urn.startsWith(urnStart) ? device.urn.substring(urnStart.length) : device.urn
      let name = device.name.replace('%20', ' ')
      let ip = url.parse(device.xaddrs[0]).hostname
      let status = "UNPAIRED" //TODO getStatus
      return {urn,name,ip,status}
    })
  }

  _checkShadow(event, args, camera) {
    console.log('check shadow', camera.urn)
    const url = (args.stackEndpoint || '').trim() + "/cameras/" + camera.urn + '/shadow'
    const Authorization = (args.provisioningKey || '').trim()

    return request({
      url,
      method: 'get',
      headers: {
        Authorization
      }
    }).then(result => {
      console.log("Shadow acquired")
      console.log(result)
      return JSON.parse(result)
    }).catch(err => {
      console.log("Failure to get camera shadow")
      console.log(err)
      console.log(err.name)
      console.log(err.statusCode)
      console.log(err.message)
      throw err
    })
  }

  statusRequest(event, args) {
    console.log("main process received status request.")
    this.updateCameraStatus(args).then(() => {
      console.log("finished checking camera status.")
      console.log(args)
      event.sender.send('status-response', args)
    })
  }

  /**
   * @param args {camera}
   * Updates camera.status and camera.workflowError in place upon retrieving status from camera api.
   */
  updateCameraStatus(args) {
    console.log("checking camera status")
    console.log(args.camera)

    //camera pairing url
    const url = `${args.camera.cameraApiScheme}://${args.camera.ip}/provisioning/status`
    console.log(url)

    //camera Basic auth
    let Authorization
    if (args.camera.cameraApiUsername.length > 0 || args.camera.cameraApiPassword.length > 0) {
      console.log("Including camera authentication.")
      Authorization = "Basic " + Buffer.from(`${args.camera.cameraApiUsername}:${args.camera.cameraApiPassword}`).toString('base64')
      console.log(Authorization)
    } else {
      console.log("Skipping camera authentication.")
    }

    //provisioning docs mistakenly specified 'Authentication' header, so provide both
    const Authentication = Authorization

    //provide provisioned thing data via camera pairing api
    return request({
      url,
      method: 'get',
      headers: {
        Authorization,
        Authentication
      },
    }).then(result => {
      console.log("Got camera status from camera api!")
      console.log(result)
      return JSON.parse(result)
    }).then(result => {
      if (result.Status != null && result.Status.length > 0) {
        args.camera.status = result.Status
        if (result.Error != null && result.Error.length > 0) {
          console.log("Camera status api returned an error message: " + result.Error)
          args.camera.workflowError = true
          args.camera.workflowErrorMessage = result.Error
        }
      }
    }).catch(err => {
      //camera may not have implemented this api, just leave status as is in that case.
      console.log("Unable to get camera status from camera api!")
      console.log(err)
      console.log(err.name)
      console.log(err.statusCode)
      console.log(err.message)

      //if we get an auth error, it likely means camera api username/password is incorrect
      //leave default status but highlight the potential error.
      if (err.statusCode == 401 || err.statusCode == 403) {
        args.camera.workflowError = true
        args.camera.workflowErrorMessage = "Unable to determine status: received authentication error from camera. Check camera api username/password."
      }
    })
  }
}
