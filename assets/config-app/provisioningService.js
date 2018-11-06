"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
//const url = require('url');
var request = require('request-promise-native');
var discoveryService_1 = require("./discoveryService");
/**
 * Provisioning service in main process
 */
var ProvisioningService = /** @class */ (function () {
    function ProvisioningService() {
        this.discoveryService = new discoveryService_1.DiscoveryService();
    }
    ProvisioningService.prototype.registerMainProcessIPC = function () {
        electron_1.ipcMain.on('check-stack-endpoint-request', this.checkStackEndpoint.bind(this));
        electron_1.ipcMain.on('provision-camera-request', this.provisionCamera.bind(this));
    };
    /**
     * @param args {stackEndpoint, provisioningKey}.
     */
    ProvisioningService.prototype.checkStackEndpoint = function (event, args) {
        console.log("main process received stack endpoint requests.");
        console.log(args);
        var url = (args.stackEndpoint || '').trim() + "/stack_availability";
        var Authorization = (args.provisioningKey || '').trim();
        console.log(url);
        request({
            url: url,
            method: 'get',
            headers: {
                Authorization: Authorization
            }
        }).then(function (result) {
            console.log("Stack available.");
            console.log(result);
            event.sender.send('check-stack-endpoint-response', {});
        }).catch(function (err) {
            //403 response means invalid provisioning key.
            //No response means stack url is incorrect or inaccessible.
            console.log("Stack not available");
            console.log(err);
            console.log(err.name);
            console.log(err.statusCode);
            console.log(err.message);
            var error = err.statusCode == 403 ? 'provisioningKey' : 'stackEndpoint';
            event.sender.send('check-stack-endpoint-response', { error: error });
        });
    };
    /**
     * @param args {stackEndpoint, provisioningKey, camera}.
     * @returns {camera, error, errorMessage}
     */
    ProvisioningService.prototype.provisionCamera = function (event, args) {
        var _this = this;
        console.log("main process received provisiong camera request.");
        console.log(args);
        this.provisionCloudStep(event, args)
            .then(function (thing) { return _this.provisionCameraStep(event, args, thing); })
            .then(function () {
            console.log("Provisioning success.");
            event.sender.send('provision-camera-response', { camera: args.camera });
        })
            .catch(function (err) {
            console.log("Provisioning error.");
            args.camera.workflowError = true;
            args.camera.workflowErrorMessage = "Provisioning failure in " + err.step + " step: " + err.message;
            event.sender.send('provision-camera-response', { camera: args.camera });
        });
    };
    ProvisioningService.prototype.provisionCloudStep = function (event, args) {
        console.log("cloud step");
        var url = (args.stackEndpoint || '').trim() + "/provision";
        var Authorization = (args.provisioningKey || '').trim();
        var id = args.camera.urn;
        console.log(url);
        return request({
            url: url,
            method: 'post',
            headers: {
                Authorization: Authorization
            },
            body: JSON.stringify({ id: id })
        }).then(function (result) {
            console.log("Provisioning success in cloud step!");
            console.log(result);
            var thing = JSON.parse(result);
            return thing;
        }).catch(function (err) {
            console.log("Provisioning failure in cloud step!");
            console.log(err);
            console.log(err.name);
            console.log(err.statusCode);
            console.log(err.message);
            err.step = "cloud";
            throw err;
        });
    };
    ProvisioningService.prototype.provisionCameraStep = function (event, args, thing) {
        var _this = this;
        console.log("camera step");
        //camera pairing url
        var url = args.camera.cameraApiScheme + "://" + args.camera.ip + "/provisioning/pair";
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
            method: 'put',
            headers: {
                Authorization: Authorization,
                Authentication: Authentication
            },
            body: JSON.stringify(thing)
        }).then(function (result) {
            console.log("Provisioning success in camera step!");
            console.log(result);
            //assume PAIRED status after successful api call, and check camera status api.
            args.camera.status = 'PAIRED';
            return _this.discoveryService.updateCameraStatus({ camera: args.camera });
        }).catch(function (err) {
            console.log("Provisioning failure in camera step!");
            console.log(err);
            console.log(err.name);
            console.log(err.statusCode);
            console.log(err.message);
            err.step = "camera";
            throw err;
        });
    };
    return ProvisioningService;
}());
exports.ProvisioningService = ProvisioningService;
//# sourceMappingURL=provisioningService.js.map