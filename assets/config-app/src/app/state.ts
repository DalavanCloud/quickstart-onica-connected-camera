export class State {
  stackEndpoint: string; //stack endpoint url
  provisioningKey: string; //endpoint security key
  stackAvailabilityLoading: boolean; //spinner
  stackAvailabilitySuccess: boolean; //endpoint vs discovery/provisioning step.
  stackEndpointError: boolean; //stack availability error
  provisioningKeyError: boolean; //forbidden error on stack availability
  cameraApiSchemes: Array<string>; //http or https for camera provisioning apis
  cameraApiScheme: string; //selected provisioning scheme
  cameraApiUsername: string; //support basic auth for camera api
  cameraApiPassword: string; //support basic auth for camera api
  discoveryLoading: boolean; //onvif discovery in progress
  anyCameraChecked: boolean; //determine whether provision button is enabled
  provisioningLoading: boolean; //selected cameras are being provisioned
  addingNewCamera: boolean; //manual entry ui state
  showAddingNewCameraError: boolean; //error states for manual entry
  statusMessage: string; //high level processing info
}
