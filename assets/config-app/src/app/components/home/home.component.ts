import { Component, OnInit } from '@angular/core';

import { Camera } from '../../camera';
import { State } from '../../state';

import { ElectronService } from '../../providers/electron.service';

import {FormControl, FormGroupDirective, NgForm, Validators} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';

/**
 * Form input error binding for stackEndpoint
 */
export class StackEndpointErrorStateMatcher implements ErrorStateMatcher {
  constructor(private state: State) {
    this.state = state
  }

  isErrorState(): boolean {
    return this.state.stackEndpointError
  }
}

/**
 * Form input error binding for provisioningKey
 */
export class ProvisioningKeyErrorStateMatcher implements ErrorStateMatcher {
  constructor(private state: State) {
    this.state = state
  }

  isErrorState(): boolean {
    return this.state.provisioningKeyError
  }
}

/**
 * Form input error binding for new camera fields
 */
export class NewCameraErrorStateMatcher implements ErrorStateMatcher {
  constructor(private state: State, private field: String) {
    this.state = state
    this.field = field
  }

  newCamera: Camera;
  cameras: Camera[];

  setNewCamera(newCamera): void {
    this.newCamera = newCamera
  }

  setCameraList(cameras) {
    this.cameras = cameras
  }

  isErrorState(): boolean {
    return this.state.showAddingNewCameraError && this.fieldHasError()
  }

  fieldHasError(): boolean {
    if (this.newCamera == null) {
      console.log("The newCamera object is null and can't be validated.")
      return true
    }

    switch(this.field) {
      case 'ip':
        return this.newCamera.ip == null || this.newCamera.ip.length == 0
      case 'urn':
        if (this.newCamera.urn == null || this.newCamera.urn.length == 0) {
          return true
        } else {
          let notUniqueError = false
          this.cameras.forEach(camera => {
            if (camera.urn == this.newCamera.urn) {
              notUniqueError = true
            }
          })
          return notUniqueError
        }
      case 'name':
        return this.newCamera.name == null || this.newCamera.name.length == 0
      default:
        console.log("Unknown newCamera validation field: " + this.field)
        return false
    }
  }
}


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  displayedColumns: string[] = ['select', 'ip', 'urn', 'name', 'status', /*'streaming',*/ 'status-error'];

  constructor(private electronService: ElectronService) { }

  ngOnInit() {

    //initial state
    this.state = {
      stackEndpoint: "",
      provisioningKey: "",
      stackAvailabilityLoading: false,
      stackAvailabilitySuccess: false,
      stackEndpointError: false,
      provisioningKeyError: false,
      cameraApiSchemes: ["http", "https"],
      cameraApiScheme: "http",
      cameraApiUsername: "",
      cameraApiPassword: "",
      discoveryLoading: false,
      anyCameraChecked: false,
      provisioningLoading: false,
      statusMessage: "Enter stack endpoint and provisioning key",
      addingNewCamera: false,
      showAddingNewCameraError: false
    }

    //bind form errors
    this.stackEndpointErrorStateMatcher = new StackEndpointErrorStateMatcher(this.state)
    this.provisioningKeyErrorStateMatcher = new ProvisioningKeyErrorStateMatcher(this.state)
    this.newCameraIpErrorStateMatcher = new NewCameraErrorStateMatcher(this.state, 'ip')
    this.newCameraUrnErrorStateMatcher = new NewCameraErrorStateMatcher(this.state, 'urn')
    this.newCameraNameErrorStateMatcher = new NewCameraErrorStateMatcher(this.state, 'name')

    //set list of cameras (depends on newCameraUrnErrorStateMatcher instance)
    this.setCameras([])
  }

  setCameras(cameras) {
    this.cameras = cameras
    this.setAnyCameraChecked()
    this.newCameraUrnErrorStateMatcher.setCameraList(cameras)
  }

  /**
   * Submit stackEndpoint and provisioningKey.
   * -check stack availability
   * -show errors or transition to discovery
   */
  onConfigureEndpoint() {
    this.state.stackAvailabilityLoading = true
    this.state.stackEndpointError = false
    this.state.provisioningKeyError = false
    this.electronService.checkStackEndpoint(this.state.stackEndpoint, this.state.provisioningKey)
      .then(success => {
        this.state.stackAvailabilityLoading = false

        //transition to discovery
        this.state.stackAvailabilitySuccess = true
        this.state.statusMessage = "Waiting to discover cameras"
      })
      .catch(err => {
        console.log(err)
        this.state.stackAvailabilityLoading = false

        if (err.message == 'stackEndpoint') {
          this.state.stackEndpointError = true
        } else if (err.message == 'provisioningKey') {
          this.state.provisioningKeyError = true
        } else {
          console.log("Unhandled error: " + err.message)
        }
      })
  }

  /**
   * Run native onvif discovery code to retrieve list of cameras.
   */
  onDiscover() {
    this.setCameras([])
    this.state.discoveryLoading = true;
    this.state.statusMessage = "Discovering cameras"
    this.electronService.discoverCameras(this.state.stackEndpoint, this.state.provisioningKey, this.state.cameraApiScheme, this.state.cameraApiUsername, this.state.cameraApiPassword)
      .then(cameras => {
        this.state.discoveryLoading = false
        this.state.statusMessage = cameras.length > 0 ? "Camera discovery completed" : "No cameras found"
        this.setCameras(cameras)
      })
  }

  /**
   * Evaluate whether any camera is selected for provisioning.
   * Expect to be called upon user selection or camera list updates.
   */
  setAnyCameraChecked() {
    let anyCameraChecked = false
    this.cameras.forEach(camera => {
      if (camera.checked) {
        anyCameraChecked = true
      }
    })
    this.state.anyCameraChecked = anyCameraChecked
  }

  /**
   * Run the provisioning workflow on selected cameras.
   * -provision against the stack API
   * -provide credentials to the cameras
   * -update pairing state or display errors
   */
  onProvisionCameras() {
    //clear previous errors
    this.cameras.forEach(camera => {
      camera.workflowError = false
      camera.workflowErrorMessage = undefined
    })

    const camerasToProvision = this.cameras.filter(camera => camera.checked)
    if (camerasToProvision.length > 0) {

      //add global camera provisioning info
      camerasToProvision.forEach(camera => {
        camera.cameraApiScheme = this.state.cameraApiScheme,
        camera.cameraApiUsername = this.state.cameraApiUsername,
        camera.cameraApiPassword = this.state.cameraApiPassword
      })

      //provision cameras
      this.state.provisioningLoading = true
      this.electronService.provisionCameras(this.state.stackEndpoint, this.state.provisioningKey, camerasToProvision)
        .then(() => {
          this.state.provisioningLoading = false

          let success = true
          camerasToProvision.forEach(camera => {
            if (camera.workflowError) {
              success = false
            } else {
              camera.checked = false
            }
          })
          this.setAnyCameraChecked()

          this.state.statusMessage = success ? `Successfully provisioned ${camerasToProvision.length} camera(s)` : "Failed to provision cameras"
        })
    } else {
      this.state.statusMessage = "No cameras selected"
    }
  }

  checkCameraStatus(camera) {
    console.log("check camera status")
    camera.cameraApiScheme = this.state.cameraApiScheme
    camera.cameraApiUsername = this.state.cameraApiUsername
    camera.cameraApiPassword = this.state.cameraApiPassword
    this.electronService.checkCameraStatus(camera)
  }

  /**
   * Allow manual entry of camera.
   */
  onClickAdd() {
    this.state.addingNewCamera = true
    this.newCamera = new Camera();
    this.newCameraIpErrorStateMatcher.setNewCamera(this.newCamera)
    this.newCameraUrnErrorStateMatcher.setNewCamera(this.newCamera)
    this.newCameraNameErrorStateMatcher.setNewCamera(this.newCamera)
  }

  /**
   * Validate and add manually entered camera to the list.
   */
  onSaveNew() {
    if (this.newCameraIpErrorStateMatcher.fieldHasError() || this.newCameraUrnErrorStateMatcher.fieldHasError() || this.newCameraNameErrorStateMatcher.fieldHasError()) {
      this.state.showAddingNewCameraError = true
    } else {
      this.newCamera.status = 'UNPAIRED'
      this.newCamera.checked = true

      //fire request to determine actual status if we can
      this.checkCameraStatus(this.newCamera)

      //bug in table datasource requires replacement to update
      //this.cameras.push(this.newCamera)
      this.cameras = [...this.cameras, this.newCamera]

      this.setAnyCameraChecked()
      this.onCancelNew()

    }
  }

  onCancelNew() {
    this.state.addingNewCamera = false
    this.state.showAddingNewCameraError = false
    this.newCamera = undefined
  }

  state: State;
  cameras: Camera[];
  newCamera: Camera;

  stackEndpointErrorStateMatcher: StackEndpointErrorStateMatcher;
  provisioningKeyErrorStateMatcher: ProvisioningKeyErrorStateMatcher;
  newCameraIpErrorStateMatcher: NewCameraErrorStateMatcher;
  newCameraUrnErrorStateMatcher: NewCameraErrorStateMatcher;
  newCameraNameErrorStateMatcher: NewCameraErrorStateMatcher;


}
