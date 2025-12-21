import { createComputed, createState, For } from "gnim";
import styles from "./gamepad-password-input.style";
import Gamepad from "@service/gamepad";
import { cc } from "@util/string";
import { Destroyer } from "@util/destroyer";

const PASSWORD_LENGTH = 6;

abstract class Input {
	public readonly character: string;

	constructor(blockedChars: string) {
		const CHARACTERS = "@#$%&!";
		let character: string;
		do {
			character = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
		} while (blockedChars.includes(character));
		this.character = character;
	}

	abstract serialize(): string;
}

class JoystickInput extends Input {
	public readonly type = "joystick";

	constructor(
		blockedChars: string,
		public readonly axisIndex: number,
		public readonly direction: Gamepad.GamepadDirection,
	) {
		super(blockedChars);
	}

	serialize(): string {
		return `j`; // todo: serialize properly
	}
}

class ButtonInput extends Input {
	public readonly type = "button";

	constructor(
		blockedChars: string,
		public readonly buttonIndex: number,
	) {
		super(blockedChars);
	}

	serialize(): string {
		return `b${this.buttonIndex}`;
	}
}

export function GamepadPasswordInput() {
	const gamepad = Gamepad.get_default();
	const [password, setPassword] = createState<(JoystickInput | ButtonInput)[]>(
		[],
	);
	const [focusedController, setFocusedController] =
		createState<Gamepad.Gamepad | null>(null);
	const [isSubmitting, setIsSubmitting] = createState(false);

	focusedController.subscribe(() => {
		const controller = focusedController.get();
		if (controller) {
			console.log("Listening to controller inputs!");
			// todo: add joystick support

			const destroyer = new Destroyer();
			destroyer.add(() => buttonsDestroyer?.destroy());

			let buttonsDestroyer: Destroyer | null = null;
			const buttonsUpdate = () => {
				buttonsDestroyer?.destroy();
				buttonsDestroyer = new Destroyer();

				const buttons = controller.buttons;
				const buttonsPressed = buttons.map((button) => button.value == 1);

				for (const [index, button] of buttons.entries()) {
					buttonsDestroyer.addDisconnect(
						button,
						button.connect("notify::value", () => {
							const pressed = button.value == 1;
							if (buttonsPressed[index] != pressed) {
								buttonsPressed[index] = pressed;
								if (!isSubmitting.get() && pressed) {
									const inputs = password.get();
									let blockedChars = "";
									for (
										let i = Math.max(0, inputs.length - 3);
										i < inputs.length;
										i++
									) {
										blockedChars += inputs[i].character;
									}

									const input = new ButtonInput(blockedChars, index);
									setPassword([...password.get(), input]);
								}
							}
						}),
					);
				}
			};
			controller.connect("notify::buttons", buttonsUpdate);
			buttonsUpdate();
		}
	});

	password.subscribe(() => {
		const inputs = password.get();
		if (inputs.length >= PASSWORD_LENGTH) {
			const serializedPassword = inputs
				.map((input) => input.serialize())
				.join("");
			setIsSubmitting(true);
			console.log(`Password: ${serializedPassword}`);
		}
	});

	return (
		<button
			cssClasses={createComputed([focusedController], (focusedController) =>
				cc(styles.container, focusedController && styles.focused),
			)}
			onClicked={() => {
				const controller = gamepad.gamepads[0];
				if (controller) {
					setFocusedController(controller);
				}
			}}
		>
			<box>
				<For each={password}>
					{(input) => (
						<box>
							<label label={input.character} />
						</box>
					)}
				</For>
			</box>
		</button>
	);
}
