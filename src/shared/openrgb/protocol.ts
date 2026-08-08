export const DEFAULT_PORT = 6742;

export const PKT_MAGIC = "ORGB";

export enum PacketId {
	REQUEST_CONTROLLER_COUNT = 0, // Request RGBController device count from server[cite: 1]
	REQUEST_CONTROLLER_DATA = 1, // Request RGBController data block[cite: 1]
	REQUEST_PROTOCOL_VERSION = 40, // Request OpenRGB SDK protocol version from server[cite: 1]
	SET_CLIENT_NAME = 50, // Send client name string to server[cite: 1]
	DEVICE_LIST_UPDATED = 100, // Indicate to clients that device list has updated[cite: 1]
	RGBCONTROLLER_UPDATELEDS = 1050, // RGBController::UpdateLEDs()[cite: 1]
	RGBCONTROLLER_UPDATEZONELEDS = 1051, // RGBController::UpdateZoneLEDs()[cite: 1]
}
