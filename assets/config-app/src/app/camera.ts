export class Camera {
  urn: string; //unique id from onvif message urn
  name: string; //name of camera from onvif message name
  ip: string; //ip of camera from onvif message xaddrs
  cameraApiScheme: string; //selected provisioning scheme
  cameraApiUsername: string; //support basic auth for camera api
  cameraApiPassword: string; //support basic auth for camera api
  status: string; //UNPAIRED, PAIRED, etc.
  checked: boolean; //UI state
  workflowError: boolean; //during provisioning api attempt
  workflowErrorMessage: string; //what went wrong
}
