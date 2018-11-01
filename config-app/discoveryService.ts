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
  }

  /**
   * @param args irrelevant.
   */
  discover(event, args) {
    console.log("main process received discover requests.")
    onvif.startProbe().then((device_info_list) => {
      console.log(device_info_list.length + ' devices were found.');
      const cameras = this._processDeviceInfoList(device_info_list)

      const shadows = cameras.map(camera => {
        return this._checkShadow(event, args, camera).then(shadow => {
          try {
            camera.streaming = shadow.state.reported.streaming;
          } catch (err) {
            console.log(err);
            camera.streaming = false;
          }

          return camera;
        });
      });

      Promise.all(shadows).then(() => {
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
}
