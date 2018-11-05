import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer, webFrame, remote } from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';

import { Camera } from '../camera';

@Injectable()
export class ElectronService {

  ipcRenderer: typeof ipcRenderer;
  webFrame: typeof webFrame;
  remote: typeof remote;
  childProcess: typeof childProcess;
  fs: typeof fs;

  constructor() {
    // Conditional imports
    if (this.isElectron()) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.webFrame = window.require('electron').webFrame;
      this.remote = window.require('electron').remote;

      this.childProcess = window.require('child_process');
      this.fs = window.require('fs');
    }
  }

  isElectron = () => {
    return window && window.process && window.process.type;
  }

  checkStackEndpoint(stackEndpoint, provisioningKey): Promise<boolean> {
    return new Promise((resolve, reject) => {
      console.log('electron service checkStackEndpoint')
      this.ipcRenderer.once('check-stack-endpoint-response', (event, arg) => {
        console.log('got check-stack-endpoint-response')
        console.log(arg)
        if (arg.error) {
          reject(new Error(arg.error))
        } else {
          resolve(arg)
        }
      })
      this.ipcRenderer.send('check-stack-endpoint-request', {stackEndpoint, provisioningKey})
    })
  }

  provisionCameras(stackEndpoint, provisioningKey, cameras): Promise<void> {
    console.log("Provisioning cameras..")

    //create promises with an external resolution mechanism for all the cameras
    const provisioningStatusList = cameras.map(camera => {
      console.log("creating provisioning status for camera " + camera.urn)
      const provisioningStatus = {
        camera,
        promise: undefined,
        resolve: undefined
      }
      provisioningStatus.promise = new Promise(resolve => provisioningStatus.resolve = resolve)
      return provisioningStatus
    })

    //register response listener
    this.ipcRenderer.on('provision-camera-response', (event, arg) => {
      console.log("got provision-camera-response")
      console.log(arg)

      //find camera provisioning status this response is for
      const provisioningStatus = provisioningStatusList.find(provisioningStatus => provisioningStatus.camera.urn == arg.camera.urn)
      if (!provisioningStatus) {
        console.log("Error: response for unknown camera " + arg.camera.urn)
      }

      //set error state
      if (arg.error) {
        provisioningStatus.camera.workflowError = true
        provisioningStatus.camera.workflowErrorMessage = arg.errorMessage
      }

      //complete provisioning promise
      provisioningStatus.resolve()
    })

    //send provisioning requests
    cameras.forEach(camera => {
      console.log("sending the provisioning request for camera " + camera.urn)
      this.ipcRenderer.send('provision-camera-request', {stackEndpoint, provisioningKey, camera})
    })

    //wait for all camera provisioning
    return Promise.all(provisioningStatusList.map(provisioningStatus => provisioningStatus.promise))
      .then(() => {
        console.log("all camera provisioning requests completed.")
        this.ipcRenderer.removeAllListeners('provision-camera-response')
      })
  }

  discoverCameras(stackEndpoint, provisioningKey): Promise<Camera[]> {
    return new Promise((resolve, reject) => {
      console.log('electron service discover')
      this.ipcRenderer.once('discover-response', (event, arg) => {
        console.log("got discover-response..")
        console.log(event)
        console.log(arg)
        resolve(arg)
      })
      this.ipcRenderer.send('discover-request', {stackEndpoint, provisioningKey})
    })
  }

}
