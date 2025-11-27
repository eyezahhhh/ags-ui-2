import { Astal, Gdk } from "ags/gtk4";
import { CLASS } from "constants/class.const";
import styles from "./bar.window.style";
import app from "ags/gtk4/app";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import { createBinding } from "gnim";
import { With } from "ags";
import { getWindowIcon } from "@util/icon";
import { getReleaseInfo } from "@util/release-info";
import GLib from "gi://GLib?version=2.0";
import { ClockBarWidget } from "main/bar/widgets/clock/clock.bar-widget";
import { VolumeBarWidget } from "main/bar/widgets/volume/volume.bar-widget";
import { BluetoothBarWidget } from "main/bar/widgets/bluetooth/bluetooth.bar-widget";
import { NetworkBarWidget } from "main/bar/widgets/network/network.bar-widget";
import { toggleMenu } from "main/menu/menu.manager";
import { AudioMenuHandler } from "main/menu/handlers/audio/audio.menu-handler";
import { NetworkMenuHandler } from "main/menu/handlers/network/network.menu-handler";
import { BluetoothMenuHandler } from "main/menu/handlers/bluetooth/bluetooth.menu-handler";
import { TimeMenuHandler } from "main/menu/handlers/time/time.menu-handler";

export function BarWindow(gdkMonitor: Gdk.Monitor) {
	const { TOP, LEFT, RIGHT } = Astal.WindowAnchor;

	const RIGHT_WIDGETS = [
		// <label label="❤️" />,
		<VolumeBarWidget onClicked={() => toggleMenu(AudioMenuHandler)} />,
		// <BluetoothBarWidget onClicked={() => toggleMenu(BluetoothMenuHandler)} />,
		<NetworkBarWidget onClicked={() => toggleMenu(NetworkMenuHandler)} />,
		<ClockBarWidget onClicked={() => toggleMenu(TimeMenuHandler)} />,
	] as const;

	const hyprland = AstalHyprland.get_default();
	const focusedClient = createBinding(hyprland, "focusedClient");

	return (
		<window
			visible
			name="bar"
			class={`${CLASS}_bar`}
			gdkmonitor={gdkMonitor}
			cssClasses={[styles.window]}
			exclusivity={Astal.Exclusivity.EXCLUSIVE}
			anchor={TOP | LEFT | RIGHT}
			application={app}
			namespace={CLASS}
		>
			<box cssClasses={[styles.container]}>
				<centerbox hexpand>
					<box $type="start" hexpand>
						<With value={focusedClient}>
							{(client: AstalHyprland.Client | null) => {
								if (!client) {
									return (
										<box cssClasses={[styles.currentApp]}>
											<image
												iconName={getReleaseInfo("LOGO")}
												cssClasses={[styles.appIcon]}
											/>
											<label
												label={`${GLib.get_host_name()} - ${getReleaseInfo(
													"PRETTY_NAME",
												)}`}
											/>
										</box>
									);
								}
								const icon = getWindowIcon(client.class);

								return (
									<box cssClasses={[styles.currentApp]}>
										{icon && (
											<image iconName={icon} cssClasses={[styles.appIcon]} />
										)}
										<label label={createBinding(client, "title")} />
									</box>
								);
							}}
						</With>
					</box>
					<box $type="end">
						{RIGHT_WIDGETS.map((widget) => (
							<box>{widget}</box>
						))}
					</box>
				</centerbox>
			</box>
		</window>
	);
}
