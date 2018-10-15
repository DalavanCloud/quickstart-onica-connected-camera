import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { State } from './state';

@Injectable({
  providedIn: 'root'
})
export class ProvisioningService {

  constructor(private http: HttpClient) { }

  checkStackEndpoint(stackEndpoint, provisioningKey): Promise<boolean> {
    //TODO check connectivity. state model, etc.
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (stackEndpoint == 'fail') {
          reject(new Error('stackEndpoint'))
          return
        }
        if (provisioningKey == 'fail') {
          reject(new Error('provisioningKey'))
          return
        }
        resolve(true)
      }, 250)
    })
    //const url = "https://www.google.com"
    // return new Promise((resolve) => {
    //   this.http.get(url)
    //     .toPromise()
    //     .then(result => {
    //       console.log(result)
    //       resolve(true)
    //     })
    //     .catch(err => {
    //       console.log("ERROR")
    //       console.log(err)
    //       resolve(true) //FIXME CORS
    //     })
    // })
  }

  /**
   * Modifies camera status in place.
   */
  provisionCameras(cameras): Promise<void> {
    console.log("Provisioning cameras..")
    //TODO provision api
    return new Promise(resolve => {
      setTimeout(() => {
        cameras.forEach(camera => {
          console.log(camera)

          //FIXME
          if (camera.name == 'fail') {
            camera.workflowError = true
            camera.workflowErrorMessage = "Provisioning API failure."
          }
        })
        resolve()
      }, 1500)
    })
  }
}
