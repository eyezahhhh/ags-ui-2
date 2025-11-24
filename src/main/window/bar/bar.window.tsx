import { Astal, Gdk } from "ags/gtk4";
import { CLASS } from "../../../constants/class.const";
import styles from "./bar.window.style";
import app from "ags/gtk4/app";
import { WifiWidget } from "../../../widgets/wifi/wifi.widget";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import { createBinding } from "gnim";
import { With } from "ags";
import { getIconForWindow } from "../../../utils/icon.util";
import { getReleaseInfo } from "../../../utils/release-info.util";
import GLib from "gi://GLib?version=2.0";

export function BarWindow(gdkMonitor: Gdk.Monitor) {
	const { TOP, LEFT, RIGHT } = Astal.WindowAnchor;

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
		>
			<box cssClasses={[styles.container]}>
				<centerbox>
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
								const icon = getIconForWindow(client.class);

								return (
									<box cssClasses={[styles.currentApp]}>
										{icon && (
											<image iconName={icon} cssClasses={[styles.appIcon]} />
										)}
										<label label={client.title} />
									</box>
								);
							}}
						</With>
					</box>
					<box $type="end">
						<WifiWidget />
					</box>
				</centerbox>
			</box>
		</window>
	);
}
