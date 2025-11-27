import GObject from "gnim/gobject";
import { MenuHandler } from "../menu-handler";
import AstalNetwork from "gi://AstalNetwork?version=0.1";
import styles from "./network.menu-handler.style";
import { Gtk } from "ags/gtk4";
import {
	Accessor,
	createBinding,
	createComputed,
	createState,
	For,
	onCleanup,
	With,
} from "gnim";
import { ClickableListEntry } from "@components/clickable-list-entry/clickable-list-entry";
import {
	connectToWifi,
	getConnectingWifiAccessor,
	rescanWifi,
} from "@util/network";
import { createCommandProcess, doesCommandExist } from "@util/cli";
import NM from "gi://NM?version=1.0";
import GLib from "gi://GLib?version=2.0";
import { CACHE_DIRECTORY } from "constants/cache-directory.const";
import { setMenu } from "main/menu/menu.manager";
import { makeDirectoryRecursive } from "@util/file";
import Gio from "gi://Gio?version=2.0";
import Thumbnail from "@components/thumbnail/thumbnail";

export class NetworkMenuHandler extends MenuHandler {
	private qrCodeSupported = false;

	constructor() {
		super("network");

		doesCommandExist("qrencode").then((supported) => {
			this.qrCodeSupported = supported;
			if (supported) {
				console.log(`WiFi QR-code generation is enabled.`);
			} else {
				console.log(
					`WiFi QR-code generation is not enabled. Install qrencode.`,
				);
			}
		});
	}

	private getWifiPassword(connection: NM.RemoteConnection) {
		// enterprise (wpa-eap) not supported
		return new Promise<string>((resolve, reject) => {
			connection.get_secrets_async(
				"802-11-wireless-security",
				null,
				(_connection, result) => {
					try {
						const variant = connection.get_secrets_finish(result);
						const data = variant.deepUnpack() as any;
						const psk = data["802-11-wireless-security"]["psk"] as
							| GLib.Variant
							| undefined;
						if (!psk) {
							throw new Error("WiFi doesn't have PSK secret");
						}

						const password = psk.get_string()[0];
						resolve(password);
					} catch (e) {
						reject(e);
					}
				},
			);
		});
	}

	private async generateWifiQrCode(connection: NM.RemoteConnection) {
		if (!this.qrCodeSupported) {
			throw new Error("QR-code generation isn't enabled");
		}
		if (connection.get_connection_type() != "802-11-wireless") {
			throw new Error("Connection isn't WiFi network");
		}

		const escapeString = (string: string) => {
			return string.replace(/([\\;,:])/g, "\\$1");
		};

		const wireless = connection.get_setting_wireless();
		const ssidBytes = wireless.get_ssid().get_data()!;
		const ssid = [...ssidBytes]
			.map((char) => String.fromCharCode(char))
			.join("");
		const ssidHex = ssid
			.split("")
			.map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
			.join("");

		const wirelessSecurity = connection.get_setting_wireless_security();

		const securityType =
			{
				none: "nopass",
				"wpa-psk": "WPA",
				"wpa-eap": "WPA2-EAP",
			}[wirelessSecurity.get_key_mgmt()] || "unknown";

		let password: string | null = null;

		if (securityType != "nopass") {
			try {
				password = await this.getWifiPassword(connection);
			} catch (e) {
				if (e instanceof Error && e.message == "WiFi doesn't have PSK secret") {
					password = null;
				} else {
					throw e;
				}
			}
		}

		const hidden = wireless.get_hidden();

		let code = `WIFI:T:${securityType};S:${escapeString(ssid)};`;
		if (password) {
			code += `P:${escapeString(password)};`;
		}

		if (hidden) {
			code += "H:true;";
		}

		code += ";";

		const directory = `${CACHE_DIRECTORY}/wifi-qr`;
		await makeDirectoryRecursive(Gio.File.new_for_path(directory));
		const file = `${directory}/${ssidHex}.svg`;
		await createCommandProcess([
			"qrencode",
			"-o",
			file,
			code,
			"--background",
			"00000000",
			"--margin",
			"0",
			"--size",
			"20",
			"-t",
			"SVG",
		]);

		return {
			file,
			wireless,
			ssid,
			password,
		};
	}

	public getContent(
		_window: GObject.Object,
		data: string | number | null,
	): GObject.Object {
		const network = AstalNetwork.get_default();

		if (typeof data == "string" && data.startsWith("qrcode_")) {
			const ssid = data.substring("qrcode_".length);
			const connection = network.client
				.get_connections()
				.find(
					(connection) =>
						connection.get_connection_type() == "802-11-wireless" &&
						connection.get_id() == ssid,
				);
			if (connection) {
				const [info, setInfo] = createState<null | {
					password?: string;
					file?: string;
				}>(null);

				this.generateWifiQrCode(connection)
					.then((info) => {
						setInfo({
							file: info.file,
							password: info.password || undefined,
						});
					})
					.catch(async (error) => {
						console.error(error);
						try {
							const password = await this.getWifiPassword(connection);
							setInfo({
								password,
							});
						} catch (e) {
							console.error(e);
							setMenu(null);
						}
					});

				return (
					<box widthRequest={250}>
						<With value={info}>
							{(info) =>
								info?.password ? (
									<box
										orientation={Gtk.Orientation.VERTICAL}
										cssClasses={[styles.passwordRevealContainer]}
									>
										{info?.file && (
											<box widthRequest={250} heightRequest={250}>
												<Thumbnail
													path={info.file}
													contentFit={Gtk.ContentFit.CONTAIN}
												/>
											</box>
										)}
										<box
											halign={Gtk.Align.CENTER}
											cssClasses={[styles.passwordTextContainer]}
										>
											<image
												iconName="lock-symbolic"
												cssClasses={[styles.passwordLockIcon]}
											/>
											<label label={info.password} />
										</box>
									</box>
								) : (
									<box>
										<label label="Loading WiFi details..." />
									</box>
								)
							}
						</With>
					</box>
				);
			}
		}

		const [openWifiNetwork, setOpenWifiNetwork] = createState<string | null>(
			null,
		);
		const [showWifiPasswordEntry, setShowWifiPasswordEntry] =
			createState(false);

		const openWifiDispose = openWifiNetwork.subscribe(() => {
			setShowWifiPasswordEntry(false);
		});

		const connectToAccessPoint = (
			accessPoint: AstalNetwork.AccessPoint,
			password?: string,
		) => {
			setShowWifiPasswordEntry(false);
			connectToWifi(
				accessPoint,
				password ||
				(() => {
					if (openWifiNetwork.get() == accessPoint.bssid) {
						setShowWifiPasswordEntry(true);
					}
				}),
			).catch((e) => {
				console.error(e);
			});
		};

		onCleanup(() => {
			openWifiDispose();
		});

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
								<box cssClasses={[styles.wifiSectionButtons]}>
									<button cssClasses={[styles.wifiSectionButton]}>
										<image iconName="network-wireless-symbolic" />
									</button>
									<button
										cssClasses={[styles.wifiSectionButton]}
										onClicked={() => rescanWifi().catch(() => { })}
									>
										<image iconName="view-refresh-symbolic" />
									</button>
								</box>
								<For
									each={
										createBinding(wifi, "access_points").as((accessPoints) =>
											accessPoints.sort((a, b) => b.strength - a.strength),
										) as Accessor<AstalNetwork.AccessPoint[]>
									}
								>
									{(accessPoint) => (
										<box orientation={Gtk.Orientation.VERTICAL}>
											<ClickableListEntry
												label={createComputed(
													[
														createBinding(accessPoint, "ssid"),
														createBinding(accessPoint, "bssid"),
													],
													(ssid, bssid) => ssid || bssid,
												)}
												subLabel={createComputed(
													[
														createBinding(
															network.wifi,
															"active_access_point",
														),
														getConnectingWifiAccessor(),
													],
													(activeAP, connectingAP) => {
														if (connectingAP == accessPoint) {
															return "Connecting...";
														}
														if (activeAP == accessPoint) {
															return "Connected";
														}
														return null;
													},
												)}
												endLabel={createBinding(accessPoint, "frequency").as(
													(frequency) =>
														`${Math.round(frequency / 100) / 10}Ghz`,
												)}
												iconName={createBinding(accessPoint, "icon_name")}
												onClicked={() =>
													setOpenWifiNetwork(
														openWifiNetwork.get() == accessPoint.bssid
															? null
															: accessPoint.bssid,
													)
												}
											/>

											<revealer
												revealChild={openWifiNetwork.as(
													(openNetwork) => openNetwork == accessPoint.bssid,
												)}
											>
												<With
													value={
														createComputed(
															[
																createBinding(
																	network.wifi,
																	"active_access_point",
																),
																showWifiPasswordEntry,
																createBinding(network.client, "connections"),
															],
															(
																activeAP,
																showPasswordEntry,
																remoteConnections,
															) => ({
																isActive: activeAP == accessPoint,
																showPasswordEntry,
																remoteConnection: remoteConnections.find(
																	(connection) =>
																		connection.get_connection_type() ==
																		"802-11-wireless" &&
																		connection.get_id() == accessPoint.ssid,
																),
															}),
														) as Accessor<{
															isActive: boolean;
															showPasswordEntry: boolean;
															remoteConnection: NM.RemoteConnection | null;
														}>
													}
												>
													{({
														isActive,
														showPasswordEntry,
														remoteConnection,
													}) =>
														showPasswordEntry ? (
															<box>
																<entry
																	placeholderText="WiFi Password"
																	hexpand
																	visibility={false}
																	onMap={(self) => self.grab_focus()}
																	onActivate={(self) =>
																		connectToAccessPoint(accessPoint, self.text)
																	}
																/>
															</box>
														) : (
															<box cssClasses={[styles.accessPointRevealer]}>
																<button
																	hexpand
																	onClicked={() => {
																		if (isActive) {
																			network.wifi?.device.disconnect_async(
																				null,
																				(device, result) => {
																					device?.disconnect_finish(result);
																				},
																			);
																		} else {
																			connectToAccessPoint(accessPoint);
																		}
																	}}
																>
																	<box hexpand>
																		<label
																			hexpand
																			label={
																				isActive ? "Disconnect" : "Connect"
																			}
																		/>
																	</box>
																</button>
																{remoteConnection && (
																	<>
																		<button
																			onClicked={() =>
																				setMenu(
																					NetworkMenuHandler,
																					`qrcode_${accessPoint.ssid}`,
																				)
																			}
																			cssClasses={[styles.extraButton]}
																		>
																			<image iconName="emblem-shared-symbolic" />
																		</button>
																		<button
																			onClicked={() => {
																				remoteConnection.delete_async(
																					null,
																					(_connection, result) => {
																						try {
																							remoteConnection.delete_finish(
																								result,
																							);
																						} catch (e) {
																							console.error(e);
																						}
																					},
																				);
																			}}
																			cssClasses={[styles.extraButton]}
																		>
																			<image iconName="edit-delete-symbolic" />
																		</button>
																	</>
																)}
															</box>
														)
													}
												</With>
											</revealer>
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
