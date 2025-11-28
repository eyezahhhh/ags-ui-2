import { ISystemctlUnitFile } from "@interface/systemctl-unit-file";
import { IVpnPingAddress } from "@interface/vpn-ping-address";
import { IWireguardSystemctlUnitFile } from "@interface/wireguard-systemctl-unit-file";
import { compareString } from "@util/string";
import { readFileAsync } from "ags/file";
import { execAsync } from "ags/process";
import AstalNetwork from "gi://AstalNetwork?version=0.1";
import GObject, { property, register } from "gnim/gobject";

const PING_ADDRESS_FILE = "/etc/wireguard-ping-address";

@register()
export class WireguardConnection extends GObject.Object {
	private readonly network = AstalNetwork.get_default();

	private _status = WireguardStatus.UNKNOWN;
	private readonly _name: string;
	private _unitFile: IWireguardSystemctlUnitFile;
	private _connection: NM.ActiveConnection | null = null;
	private _pingAddress: string | null;
	private _isLoading = false;
	private _ping = -1;
	private testAbortController: AbortController | null = null;

	constructor(
		unitFile: IWireguardSystemctlUnitFile,
		options: {
			pingAddress: string | null;
		},
	) {
		super();
		this._unitFile = unitFile;
		this._name = unitFile.interface;
		this._pingAddress = options.pingAddress;

		const network = AstalNetwork.get_default();

		this.network.client.connect("active-connection-added", () =>
			this.updateConnection(),
		);
		this.network.client.connect("active-connection-removed", () =>
			this.updateConnection(),
		);

		let disconnectWifi: (() => void) | null = null;
		const checkWifi = () => {
			disconnectWifi?.();
			const wifi = network.get_wifi();
			if (wifi) {
				const id = wifi.connect(
					"state-changed",
					(_, newState, oldState, reason) => {
						this.updateConnection();
					},
				);
				disconnectWifi = () => wifi.disconnect(id);
			} else {
				disconnectWifi = null;
			}
		};

		network.connect("notify::wifi", () => checkWifi());
		checkWifi();
		this.updateConnection();
	}

	@property(String)
	get name() {
		return this._name;
	}

	@property(Object)
	get unit_file() {
		return this._unitFile;
	}

	set unit_file(unitFile: IWireguardSystemctlUnitFile) {
		if (this._unitFile == unitFile) {
			return;
		}
		if (!this.matchesUnitFile(unitFile)) {
			throw new Error("Unit file is not for this WireGuard connection");
		}
		this._unitFile = unitFile;
		this.notify("unit_file");
	}

	matchesUnitFile(unitFile: IWireguardSystemctlUnitFile) {
		return this.name === unitFile.interface;
	}

	@property(String)
	get status() {
		return this._status;
	}

	private set status(status: WireguardStatus) {
		if (this._status != status) {
			this._status = status;
			this.notify("status");
		}
	}

	@property(NM.ActiveConnection)
	get connection() {
		return this._connection;
	}

	private updateConnection() {
		const activeConnections = this.network.client.get_active_connections();
		const connection =
			activeConnections.find((conn) => conn.get_id() == this.name) || null;
		if (connection != this._connection) {
			this._connection = connection;
			this.notify("connection");
		}

		if (this._connection) {
			this.checkConnection();
		} else {
			this.status = WireguardStatus.DISABLED;
			this.ping = -1;
		}
	}

	@property(String)
	get ping_address() {
		return this._pingAddress;
	}

	set ping_address(address: string | null) {
		if (this._pingAddress == address) {
			return;
		}
		this._pingAddress = address;
		this.notify("ping_address");
		this.checkConnection();
	}

	checkConnection() {
		this.testAbortController?.abort();
		const abortController = new AbortController();
		this.testAbortController = abortController;

		const connection = this.connection;
		const pingAddress = this._pingAddress;

		if (!connection) {
			this.status = WireguardStatus.DISABLED;
			return;
		}

		if (!pingAddress) {
			this.status = WireguardStatus.UNKNOWN;
			return;
		}

		if (
			[WireguardStatus.UNKNOWN, WireguardStatus.DISABLED].includes(this.status)
		) {
			this.status = WireguardStatus.CONNECTING;
		}

		// timeout for ipv4 config to load
		const timeout = setTimeout(() => {
			const ipv4Config = connection.get_ip4_config();
			if (!ipv4Config) {
				console.log(`No IPv4 config for VPN ${this.name}! Can't check status`);
				this.status = WireguardStatus.MISSING_IP;
				return;
			}

			if (
				![WireguardStatus.CONNECTED, WireguardStatus.DISCONNECTED].includes(
					this.status,
				)
			) {
				this.status = WireguardStatus.CONNECTING;
			}

			// console.log(`Wireguard pinging ${pingAddress}...`);
			const pinger = ping(pingAddress, {
				timeout: 10_000,
				attempts: 3,
				interface: this.name,
			});
			abortController.addListener(() => pinger.kill());

			pinger
				.then((ping) => {
					if (abortController.aborted) {
						return;
					}
					this.ping = ping;
					this.status = WireguardStatus.CONNECTED;
					const timeout = setTimeout(() => this.checkConnection(), 10_000);
					abortController.addListener(() => clearTimeout(timeout));
				})
				.catch((error) => {
					if (
						abortController.aborted ||
						error instanceof CommandTerminationError
					) {
						return;
					}
					this.ping = -1;
					this.status = WireguardStatus.DISCONNECTED;
					const timeout = setTimeout(() => this.checkConnection(), 3_000);
					abortController.addListener(() => clearTimeout(timeout));
				});
		}, 100);
		abortController.addListener(() => clearTimeout(timeout));
	}

	@property(Boolean)
	get is_loading() {
		return this._isLoading;
	}

	private set is_loading(isLoading: boolean) {
		if (this.is_loading != isLoading) {
			this._isLoading = isLoading;
			this.notify("is_loading");
		}
	}

	@property(Number)
	get ping() {
		return this._ping;
	}

	private set ping(ping: number) {
		if (this._ping != ping) {
			this._ping = ping;
			this.notify("ping");
		}
	}

	async setActive(active: boolean) {
		if (this.is_loading) {
			return;
		}
		this.is_loading = true;

		const COMMAND = `sudo /etc/manage-wg.sh ${active ? "start" : "stop"} ${
			this.name
		}`;
		try {
			await execAsync(COMMAND);
		} catch (e) {
			throw e;
		} finally {
			this.is_loading = false;
		}
	}
}

@register()
export class WireguardService extends GObject.Object {
	private readonly network = AstalNetwork.get_default();
	private _connections: WireguardConnection[] = [];

	constructor() {
		super();

		this.network.connect("notify::connections", () => {
			this.reloadWireguardServices().catch(console.error);
		});
		this.reloadWireguardServices();
	}

	public async reloadWireguardServices(
		options: {
			skipSystemd?: boolean;
		} = {},
	) {
		const wireguardUnits: IWireguardSystemctlUnitFile[] = [];

		const promises: Promise<void>[] = [];
		if (options.skipSystemd) {
			wireguardUnits.push(
				...this._connections.map((connection) => connection.unit_file),
			);
		} else {
			promises.push(
				execAsync(
					"systemctl list-unit-files --type=service --all --no-pager --output=json",
				).then((result) => {
					const units = JSON.parse(result) as ISystemctlUnitFile[];
					wireguardUnits.push(
						...units
							.filter(
								(unit) =>
									unit.unit_file.startsWith("wg-quick-") ||
									unit.unit_file.startsWith("wg-quick@"),
							)
							.map((unit) => ({
								...unit,
								interface: unit.unit_file.substring(
									9,
									unit.unit_file.length - 8,
								),
							})),
					);
				}),
			);
		}

		const pingAddresses: IVpnPingAddress[] = [];

		if (true) {
			// todo make this optional
			promises.push(
				readFileAsync(PING_ADDRESS_FILE)
					.then((result) => {
						const lines = result
							.split("\n")
							.map((line) => {
								const parts = line.split(" ");
								const name = parts.shift();
								const pingAddress = parts.shift();
								const alias = parts.join(" ");

								if (name && pingAddress) {
									return {
										name,
										pingAddress,
										alias,
									};
								}
								return null;
							})
							.filter((entry) => !!entry);
						pingAddresses.push(...lines);
					})
					.catch((e) => {
						console.error(
							`Failed to parse wireguard ping address file (${PING_ADDRESS_FILE}):`,
							e,
						);
					}),
			);
		}

		await Promise.all(promises);

		const connections = this.connections; // clone array
		let changed = false;

		for (let i = connections.length - 1; i >= 0; i--) {
			const connection = connections[i];
			if (!wireguardUnits.some((unit) => connection.matchesUnitFile(unit))) {
				connections.splice(i, 1);
				changed = true;
			}
		}

		for (let unit of wireguardUnits) {
			const existingConnection = connections.find((connection) =>
				connection.matchesUnitFile(unit),
			);
			const pingAddress = pingAddresses.find(
				(address) => address.name == unit.interface,
			);
			if (existingConnection) {
				existingConnection.unit_file = unit;
				existingConnection.ping_address = pingAddress?.pingAddress || null;
			} else {
				const connection = new WireguardConnection(unit, {
					pingAddress: pingAddress?.pingAddress || null,
				});
				connections.push(connection);
				changed = true;
			}
		}

		if (changed) {
			connections.sort((a, b) => compareString(a.name, b.name));

			this._connections = connections;
			this.notify("connections");
		}
	}

	// @property(Object)
	get connections() {
		return [...this._connections];
	}
}

const Wireguard = new WireguardService();
export default Wireguard;
