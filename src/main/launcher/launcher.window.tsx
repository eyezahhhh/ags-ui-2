import { Astal, Gtk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { CLASS } from "constants/class.const";
import styles from "./launcher.window.style";

export function LauncherWindow() {
	const { TOP, RIGHT } = Astal.WindowAnchor;

	return (
		<window
			visible
			name="launcher"
			class={`${CLASS}_launcher`}
			exclusivity={Astal.Exclusivity.EXCLUSIVE}
			keymode={Astal.Keymode.ON_DEMAND}
			application={app}
			namespace={CLASS}
			cssClasses={[styles.window]}
			anchor={TOP | RIGHT}
		>
			<box
				cssClasses={[styles.container]}
				orientation={Gtk.Orientation.VERTICAL}
			>
				{/* <label label="Launcher" /> */}
				<entry
					cssClasses={[styles.entry]}
					onNotifyText={(entry) => {
						console.log(entry.text);
					}}
					onActivate={() => {
						console.log("Enter pressed");
					}}
				/>
				<box>
					<Gtk.ScrolledWindow
						widthRequest={400}
						hexpand
						heightRequest={300}
					></Gtk.ScrolledWindow>
				</box>
			</box>
		</window>
	);
}
