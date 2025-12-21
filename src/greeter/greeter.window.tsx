import { CLASS } from "@const/class";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import styles from "./greeter.window.style";
import app from "ags/gtk4/app";
import { Accessor, createBinding, createState, For, onCleanup } from "gnim";
import Gamepad from "@service/gamepad";
import { Destroyer } from "@util/destroyer";
import { GamepadPasswordInput } from "./widgets/gamepad-password-input.widget";

export function GreeterWindow(gdkMonitor: Gdk.Monitor) {
	const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor;
	const [controllerMode, setControllerMode] = createState(false);
	const gamepad = Gamepad.get_default();
	const destroyer = new Destroyer();

	onCleanup(() => {
		destroyer.destroy();
	});

	return (
		<window
			visible
			name="greeter"
			class={`${CLASS}_greeter`}
			gdkmonitor={gdkMonitor}
			cssClasses={[styles.window]}
			anchor={TOP | LEFT}
			application={app}
			namespace={CLASS}
		>
			<box cssClasses={[styles.container]}>
				<For
					each={
						createBinding(gamepad, "gamepads") as Accessor<Gamepad.Gamepad[]>
					}
				>
					{(gamepad) => (
						<box orientation={Gtk.Orientation.VERTICAL}>
							<label label={createBinding(gamepad, "direction")} />
							<GamepadPasswordInput />
						</box>
					)}
				</For>
			</box>
		</window>
	);
}
