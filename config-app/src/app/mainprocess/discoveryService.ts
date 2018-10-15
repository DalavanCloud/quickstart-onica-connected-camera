import { ipcMain } from 'electron';
const onvif = require('node-onvif');
const url = require('url');

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
      event.sender.send('discover-response', cameras)
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
}
