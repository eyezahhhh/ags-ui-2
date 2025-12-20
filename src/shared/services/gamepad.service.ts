import { UnixSocket } from "@util/socket";
import GObject, { register } from "gnim/gobject";

interface SerializedGamepadButton {
	pressed: boolean;
	touched: boolean;
	value: number;
}

type SerializedGamepad = {
	id: string;
	index: number;
} & (
	| {
			connected: false;
	  }
	| {
			connected: true;
			buttons: SerializedGamepadButton[];
			axes: number[];
	  }
);

namespace Gamepad {
	@register()
	export class GamepadService extends GObject.Object {
		private _socket: UnixSocket | null = null;

		constructor() {
			super();

			this.listen();
		}

		listen() {
			if (this._socket) {
				this._socket.close();
			}

			const socket = new UnixSocket("/tmp/gamepad-listener.sock");
			this._socket = socket;

			socket.addEventListener("data", (chunk) => {
				try {
				} catch (e) {}
				console.log(`"${chunk}"`);
				// console.log(chunk.length);
				// const parts = (buffer + chunk).split("\n");
				// // console.log(parts.length);
				// buffer = parts.pop()!;

				// const updates = parts
				// 	.map((update) => {
				// 		try {
				// 			const json = JSON.parse(update) as SerializedGamepad;
				// 			return json;
				// 		} catch {
				// 			console.error("Failed to parse Gamepad-Listener chunk");
				// 			return null;
				// 		}
				// 	})
				// 	.filter((update) => !!update);

				// console.log(JSON.stringify(updates, null, 2));
			});
		}
	}

	let instance: GamepadService | null = null;
	export function get_default() {
		if (!instance) {
			instance = new GamepadService();
		}
		return instance;
	}
}

export default Gamepad;
