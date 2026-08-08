import { watchStyles } from "@util/app";
import Config, { ConfigSection } from "@util/config";
import { hexToRGB } from "@util/openrgb";
import { monitorFile, readFileAsync } from "ags/file";
import GObject, { getter, register } from "gnim/gobject";
import { OpenRGBClient } from "shared/openrgb/client";
import { DEFAULT_PORT } from "shared/openrgb/protocol";
import { ControllerData, RGBColor } from "shared/openrgb/types";
import Yaml from "yaml";

namespace OpenRGB {
	@register()
	export class OpenRGBService extends GObject.Object {
		private _client: OpenRGBClient;
		private _controllers: ControllerData[];
		private _connected: boolean;
		private readonly _configFilePath = Config.getString(
			"theme.openRGBFile",
			true,
		);

		constructor() {
			super();
			this._client = new OpenRGBClient();
			this._controllers = [];
			this._connected = false;

			this._initConnection()
				.then(async () => {
					if (this._configFilePath) {
						monitorFile(this._configFilePath, () => {
							console.log(`Wallust file changed (${this._configFilePath})`);
							this.readConfig().catch(console.error);
						});
						await this.readConfig();
					}
				})
				.catch((err) => {
					console.error("OpenRGB connection failed:", err);
				});
		}

		/**
		 * Connects to the server and retrieves the initial controller list.
		 */
		private async _initConnection() {
			try {
				// The default port for the OpenRGB SDK server is 6742[cite: 1]
				await this._client.connect("127.0.0.1", DEFAULT_PORT);

				this._connected = true;
				this.notify("connected");

				await this.refreshControllers();
			} catch (error) {
				throw error;
			}
		}

		/**
		 * Refreshes the internal list of controllers.
		 * Widgets binding to the "controllers" property will update when this finishes.
		 */
		async refreshControllers() {
			if (!this._connected) return;

			try {
				const count = await this._client.getControllerCount();
				const controllers: ControllerData[] = [];

				// The client should request controller data from 0 to [controller count][cite: 1]
				for (let i = 0; i < count; i++) {
					const data = await this._client.getControllerData(i);
					controllers.push(data);
				}

				this._controllers = controllers;
				this.notify("controllers");
			} catch (error) {
				console.error("Failed to fetch controllers:", error);
			}
		}

		/**
		 * Applies a single solid color to a specific device.
		 */
		async applyColor(deviceId: number, color: RGBColor) {
			if (!this._connected || !this._controllers[deviceId]) {
				console.warn(
					`Cannot apply color. Device ${deviceId} not found or server disconnected.`,
				);
				return;
			}

			const controller = this._controllers[deviceId];
			// Create an array mapping the single color to every LED on the device
			const colorArray = Array(controller.leds.length).fill(color);

			await this._client.applySolidColors(deviceId, colorArray);
		}

		/**
		 * Convenience method to apply a solid color to all connected devices.
		 */
		async applyColorToAll(color: RGBColor) {
			for (let i = 0; i < this._controllers.length; i++) {
				await this.applyColor(i, color);
			}
		}

		@getter(Boolean)
		get connected() {
			return this._connected;
		}

		@getter(Object)
		get controllers() {
			// Return a shallow copy to prevent external mutation
			return [...this._controllers];
		}

		async readConfig() {
			if (this._configFilePath) {
				const configString = await readFileAsync(this._configFilePath);
				console.log(configString);
				const configObject = Yaml.parse(configString, {
					prettyErrors: true,
				});
				const config = new ConfigSection("", configObject);
				const colorsSection = config.getSection("colors");

				const names = colorsSection.getKeys();

				for (const name of names) {
					const value = colorsSection.get(name, true);
					const color = hexToRGB(value);

					const controllers = this._controllers.filter(
						(controller) => controller.name == name,
					);

					for (const controller of controllers) {
						await this.applyColor(controller.deviceId, color);
					}

					console.log(`- ${name}: "${value}" (${controllers.length})`);
				}
			}
		}
	}

	let instance: OpenRGBService | null = null;
	export function get_default() {
		if (!instance) {
			instance = new OpenRGBService();
		}
		return instance;
	}
}

export default OpenRGB;
