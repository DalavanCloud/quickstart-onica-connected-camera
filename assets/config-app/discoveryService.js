"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var onvif = require('node-onvif');
var url = require('url');
var request = require('request-promise-native');
/**
 * Discovery service in main process (onvif)
 */
var DiscoveryService = /** @class */ (function () {
    function DiscoveryService() {
    }
    DiscoveryService.prototype.registerMainProcessIPC = function () {
        console.log("setupDiscovery");
        electron_1.ipcMain.on('discover-request', this.discover.bind(this));
        electron_1.ipcMain.on('status-request', this.statusRequest.bind(this));
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
            //check discovered cameras reported status
            var cameraStatusPromises = cameras.map(function (camera) {
                camera.cameraApiScheme = args.cameraApiScheme;
                camera.cameraApiUsername = args.cameraApiUsername;
                camera.cameraApiPassword = args.cameraApiPassword;
                return _this.updateCameraStatus({ camera: camera });
            });
            var shadows = cameras.map(function (camera) {
                return _this._checkShadow(event, args, camera).then(function (shadow) {
                    try {
                        camera.streaming = shadow.state.reported.streaming;
                    }
                    catch (err) {
                        console.log(err);
                        camera.streaming = false;
                    }
                    return camera;
                }).catch(function (err) {
                    camera.streaming = false;
                });
            });
            Promise.all(cameraStatusPromises.concat(shadows)).then(function () {
                event.sender.send('discover-response', cameras);
            });
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
    DiscoveryService.prototype._checkShadow = function (event, args, camera) {
        console.log('check shadow', camera.urn);
        var url = (args.stackEndpoint || '').trim() + "/cameras/" + camera.urn + '/shadow';
        var Authorization = (args.provisioningKey || '').trim();
        return request({
            url: url,
            method: 'get',
            headers: {
                Authorization: Authorization
            }
        }).then(function (result) {
            console.log("Shadow acquired");
            console.log(result);
            return JSON.parse(result);
        }).catch(function (err) {
            console.log("Failure to get camera shadow");
            console.log(err);
            console.log(err.name);
            console.log(err.statusCode);
            console.log(err.message);
            throw err;
        });
    };
    DiscoveryService.prototype.statusRequest = function (event, args) {
        console.log("main process received status request.");
        this.updateCameraStatus(args).then(function () {
            console.log("finished checking camera status.");
            console.log(args);
            event.sender.send('status-response', args);
        });
    };
    /**
     * @param args {camera}
     * Updates camera.status and camera.workflowError in place upon retrieving status from camera api.
     */
    DiscoveryService.prototype.updateCameraStatus = function (args) {
        console.log("checking camera status");
        console.log(args.camera);
        //camera pairing url
        var url = args.camera.cameraApiScheme + "://" + args.camera.ip + "/provisioning/status";
        console.log(url);
        //camera Basic auth
        var Authorization;
        if (args.camera.cameraApiUsername.length > 0 || args.camera.cameraApiPassword.length > 0) {
            console.log("Including camera authentication.");
            Authorization = "Basic " + Buffer.from(args.camera.cameraApiUsername + ":" + args.camera.cameraApiPassword).toString('base64');
            console.log(Authorization);
        }
        else {
            console.log("Skipping camera authentication.");
        }
        //provisioning docs mistakenly specified 'Authentication' header, so provide both
        var Authentication = Authorization;
        //provide provisioned thing data via camera pairing api
        return request({
            url: url,
            method: 'get',
            headers: {
                Authorization: Authorization,
                Authentication: Authentication
            },
        }).then(function (result) {
            console.log("Got camera status from camera api!");
            console.log(result);
            return JSON.parse(result);
        }).then(function (result) {
            if (result.Status != null && result.Status.length > 0) {
                args.camera.status = result.Status;
                if (result.Error != null && result.Error.length > 0) {
                    console.log("Camera status api returned an error message: " + result.Error);
                    args.camera.workflowError = true;
                    args.camera.workflowErrorMessage = result.Error;
                }
            }
        }).catch(function (err) {
            //camera may not have implemented this api, just leave status as is in that case.
            console.log("Unable to get camera status from camera api!");
            console.log(err);
            console.log(err.name);
            console.log(err.statusCode);
            console.log(err.message);
        });
    };
    return DiscoveryService;
}());
exports.DiscoveryService = DiscoveryService;
//# sourceMappingURL=discoveryService.js.map