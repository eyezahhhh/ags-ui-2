import { CLASS } from "@const/class";
import { Astal, Gdk } from "ags/gtk4";
import styles from "./greeter.window.style";
import app from "ags/gtk4/app";
import { createState, onCleanup } from "gnim";
import Gamepad from "@service/gamepad";
import { Destroyer } from "@util/destroyer";

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
			<box>
				<label label="Greeter!" />
			</box>
		</window>
	);
}
