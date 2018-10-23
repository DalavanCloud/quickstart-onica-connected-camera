"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var onvif = require('node-onvif');
var url = require('url');
/**
 * Discovery service in main process (onvif)
 */
var DiscoveryService = /** @class */ (function () {
    function DiscoveryService() {
    }
    DiscoveryService.prototype.registerMainProcessIPC = function () {
        console.log("setupDiscovery");
        electron_1.ipcMain.on('discover-request', this.discover.bind(this));
    };
    /**
     * @param args irrelevant.
     */
    DiscoveryService.prototype.discover = function (event, args) {
        var _this = this;
        console.log("main process received discover requests.");
        onvif.startProbe().then(function (device_info_list) {
            console.log(device_info_list.length + ' devices were found.');
            var cameras = _this._processDeviceInfoList(device_info_list);
            event.sender.send('discover-response', cameras);
        }).catch(function (error) {
            console.log("ERROR discovering");
            console.log(error);
            //console.error(error);
            //reject();
        });
    };
    DiscoveryService.prototype._processDeviceInfoList = function (deviceInfoList) {
        //return [{urn: 'a4cf0b67-ed25-418d-2910-55ac6ce5dadb', name: 'CAMERA ABCD1234-EFG', ip: '172.16.22.178', status: 'UNPAIRED'}]
        //FIXME handle unexpected input
        var urnStart = 'urn:uuid:';
        return deviceInfoList.map(function (device) {
            console.log(device);
            var urn = device.urn.startsWith(urnStart) ? device.urn.substring(urnStart.length) : device.urn;
            var name = device.name.replace('%20', ' ');
            var ip = url.parse(device.xaddrs[0]).hostname;
            var status = "UNPAIRED"; //TODO getStatus
            return { urn: urn, name: name, ip: ip, status: status };
        });
    };
    return DiscoveryService;
}());
exports.DiscoveryService = DiscoveryService;
//# sourceMappingURL=discoveryService.js.map