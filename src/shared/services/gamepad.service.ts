import { Destroyer } from "@util/destroyer";
import { UnixSocket } from "@util/socket";
import GObject, { getter, register } from "gnim/gobject";

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
	export enum GamepadDirection {
		NONE = "none",
		UP = "up",
		DOWN = "down",
		LEFT = "left",
		RIGHT = "right",
	}

	@register()
	export class GamepadButton extends GObject.Object {
		private _pressed: boolean;
		private _touched: boolean;
		private _value: number;

		constructor(
			json: SerializedGamepadButton,
			addUpdateListener: (
				self: GamepadButton,
				callback: (json: SerializedGamepadButton) => void,
			) => void,
		) {
			super();
			addUpdateListener(this, (json) => {
				if (this._pressed != json.pressed) {
					this._pressed = json.pressed;
					this.notify("is_pressed");
				}
				if (this._touched != json.touched) {
					this._touched = json.touched;
					this.notify("is_touched");
				}
				if (this._value != json.value) {
					this._value = json.value;
					this.notify("value");
				}
			});
			this._pressed = json.pressed;
			this._touched = json.touched;
			this._value = json.value;
		}

		@getter(Boolean)
		get is_pressed() {
			return this._pressed;
		}

		@getter(Boolean)
		get is_touched() {
			return this._touched;
		}

		@getter(Number)
		get value() {
			return this._value;
		}
	}

	@register()
	export class Gamepad extends GObject.Object {
		private _index: number;
		private _id: string;
		private _axes: number[] = [];
		private _connected: boolean;
		private _direction = GamepadDirection.NONE;
		private _buttons: {
			button: GamepadButton;
			update: (json: SerializedGamepadButton) => void;
		}[] = [];

		constructor(
			json: SerializedGamepad,
			addUpdateListener: (
				self: Gamepad,
				callback: (json: SerializedGamepad) => void,
			) => void,
		) {
			super();

			addUpdateListener(this, (json) => {
				if (this._index != json.index) {
					this._index = json.index;
					this.notify("index");
				}
				if (this._id != json.id) {
					this._id = json.id;
					this.notify("id");
				}
				if (this._connected != json.connected) {
					this._connected = json.connected;
					this.notify("is_connected");
				}
				if (json.connected) {
					this.populateButtons(json.buttons);
					if (this._axes.length == json.axes.length) {
						for (let i = 0; i < json.axes.length; i++) {
							if (this._axes[i] != json.axes[i]) {
								this._axes = json.axes;
								this.notify("axes");
								break;
							}
						}
					} else {
						this._axes = json.axes;
						this.notify("axes");
					}
				} else {
					if (this._buttons.length) {
						this._buttons = [];
						this.notify("buttons");
					}
				}
			});

			this._index = json.index;
			this._id = json.id;
			this._connected = json.connected;
			if (json.connected) {
				this._axes = json.axes;
				this.populateButtons(json.buttons);
			}

			let buttonsChangeDestroyer: Destroyer | null = null;
			const onButtonsChange = () => {
				buttonsChangeDestroyer?.destroy();
				const destroyer = new Destroyer();
				buttonsChangeDestroyer = destroyer;

				const buttons = this.buttons;

				const DIRECTION_KEYS: Record<number, GamepadDirection> = {
					[12]: GamepadDirection.UP,
					[13]: GamepadDirection.DOWN,
					[14]: GamepadDirection.LEFT,
					[15]: GamepadDirection.RIGHT,
				};
				const directionKeyIndexes = Object.keys(DIRECTION_KEYS)
					.map((key) => parseInt(key))
					.sort();

				if (buttons[directionKeyIndexes[directionKeyIndexes.length - 1]]) {
					for (let index of directionKeyIndexes) {
						const direction = DIRECTION_KEYS[index];
						const button = buttons[index];
						destroyer.addDisconnect(
							button,
							button.connect("notify::is-pressed", () => {
								if (button.is_pressed) {
									if (this._direction != direction) {
										this._direction = direction;
										this.notify("direction");
									}
								} else if (this._direction == direction) {
									this._direction = GamepadDirection.NONE;
									this.notify("direction");
								}
							}),
						);
					}
				}
			};
			this.connect("notify::buttons", onButtonsChange);
			onButtonsChange();

			let joystickDirection = GamepadDirection.NONE;
			this.connect("notify::axes", () => {
				const axes = this.axes;
				if (axes.length < 2) {
					return;
				}
				const x = Math.round(axes[0]);
				const y = Math.round(axes[1]);

				let direction = GamepadDirection.NONE;
				if (!y) {
					if (x == 1) {
						direction = GamepadDirection.RIGHT;
					}
					if (x == -1) {
						direction = GamepadDirection.LEFT;
					}
				}
				if (!x) {
					if (y == 1) {
						direction = GamepadDirection.DOWN;
					}
					if (y == -1) {
						direction = GamepadDirection.UP;
					}
				}
				if (joystickDirection != direction) {
					joystickDirection = direction;
					if (this._direction != direction) {
						if (direction == GamepadDirection.NONE) {
							if (!x && !y) {
								this._direction = GamepadDirection.NONE;
								this.notify("direction");
							}
						} else {
							this._direction = direction;
							this.notify("direction");
						}
					}
				}
			});
		}

		private populateButtons(buttons: SerializedGamepadButton[]) {
			const changed = buttons.length != this._buttons.length;
			this._buttons = this._buttons.slice(0, buttons.length);
			for (let [index, button] of this._buttons.entries()) {
				button.update(buttons[index]);
			}
			for (let i = this._buttons.length; i < buttons.length; i++) {
				new GamepadButton(buttons[i], (button, update) => {
					this._buttons.push({ button, update });
				});
			}
			if (changed) {
				this.notify("buttons");
			}
		}

		@getter(Object)
		get buttons() {
			return this._buttons.map((button) => button.button);
		}

		@getter(Object)
		get axes() {
			return [...this._axes];
		}

		@getter(String)
		get id() {
			return this._id;
		}

		@getter(Number)
		get index() {
			return this._index;
		}

		@getter(Boolean)
		get is_connected() {
			return this._connected;
		}

		@getter(String)
		get direction() {
			return this._direction;
		}
	}

	@register()
	export class GamepadService extends GObject.Object {
		private _socket: UnixSocket | null = null;
		private readonly _gamepads = new Map<
			number,
			{ gamepad: Gamepad; update: (json: SerializedGamepad) => void }
		>();

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
					const json = JSON.parse(chunk) as SerializedGamepad;
					const gamepad = this._gamepads.get(json.index);
					if (gamepad) {
						// todo: handle connected: false
						gamepad.update(json);
					} else {
						new Gamepad(json, (gamepad, update) => {
							this._gamepads.set(json.index, {
								gamepad,
								update,
							});
							console.log(`Registered new Gamepad #${json.index} (${json.id})`);
						});
						this.notify("gamepads");
					}
				} catch (e) {
					console.error(e);
				}
			});
		}

		@getter(Object)
		get gamepads() {
			return Array.from(this._gamepads.values())
				.map((gamepad) => gamepad.gamepad)
				.sort((a, b) => a.index - b.index);
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
