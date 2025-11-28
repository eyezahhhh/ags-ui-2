import { execAsync } from "ags/process";
import GObject, { register } from "gnim/gobject";

class BrightnessDevice extends GObject.Object {
	constructor() {
		super();
	}
}

@register()
class BrightnessService extends GObject.Object {
	constructor() {
		super();
		this.scanForDevices().catch(console.error);
	}

	private parseData() {}

	private async scanForDevices() {
		const output = await execAsync(`brightnessctl --machine-readable --list`);
		console.log(output);
	}
}

export const Brightness = new BrightnessService();
