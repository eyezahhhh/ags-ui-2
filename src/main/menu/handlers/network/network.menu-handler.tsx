import GObject from "gnim/gobject";
import { MenuHandler } from "../menu-handler";
import AstalNetwork from "gi://AstalNetwork?version=0.1";
import styles from "./network.menu-handler.style";
import { Gtk } from "ags/gtk4";
import { Accessor, createBinding, createComputed, For, With } from "gnim";

export class NetworkMenuHandler extends MenuHandler {
	constructor() {
		super("network");
	}

	public getContent(
		_window: GObject.Object,
		_data: string | number | null,
	): GObject.Object {
		const network = AstalNetwork.get_default();

		return (
			<box orientation={Gtk.Orientation.VERTICAL} widthRequest={250}>
				<With
					value={
						createBinding(network, "wifi") as Accessor<AstalNetwork.Wifi | null>
					}
				>
					{(wifi) =>
						wifi ? (
							<box orientation={Gtk.Orientation.VERTICAL}>
								<For
									each={
										createBinding(wifi, "access_points").as((accessPoints) =>
											accessPoints.sort((a, b) => b.strength - a.strength),
										) as Accessor<AstalNetwork.AccessPoint[]>
									}
								>
									{(accessPoint) => (
										<box>
											<image
												iconName={createBinding(accessPoint, "icon_name")}
											/>
											<label
												label={createComputed(
													[
														createBinding(accessPoint, "ssid"),
														createBinding(accessPoint, "bssid"),
													],
													(ssid, bssid) => ssid || bssid,
												)}
											/>
										</box>
									)}
								</For>
							</box>
						) : (
							<box>
								<label label="WiFi is not enabled" />
							</box>
						)
					}
				</With>
			</box>
		);
	}
}
