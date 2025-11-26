import AstalNetwork from "gi://AstalNetwork?version=0.1";
import { createCommandProcess } from "./cli.util";
import { createState } from "gnim";

const [connectingWifi, setConnectingWifi] =
	createState<AstalNetwork.AccessPoint | null>(null);
let connectingWifiController: (() => void) | null = null;

export async function connectToWifi(
	accessPoint: AstalNetwork.AccessPoint,
	onPasswordRequired?: (() => void) | string,
) {
	connectingWifiController?.();
	connectingWifiController = null;

	setConnectingWifi(accessPoint);

	const password =
		typeof onPasswordRequired == "string" ? onPasswordRequired : null;

	const args: string[] = ["nmcli", "dev", "wifi", "connect", accessPoint.bssid];
	if (password) {
		args.push("--ask");
	}

	return new Promise<void>((resolve, reject) => {
		const connectCommand = createCommandProcess(args, {
			onStdout: (stdout) => {
				if (stdout.startsWith("Passwords or encryption keys are required")) {
					if (password) {
						connectCommand.writeSync(password + "\n");
					}
				}
			},
		});

		connectingWifiController = () => connectCommand.kill();

		connectCommand
			.then(() => {
				resolve();
			})
			.catch((e) => {
				if (typeof e == "string") {
					if (e.startsWith("Warning: password for ")) {
						if (typeof onPasswordRequired == "function") {
							onPasswordRequired();
						}
						return reject(new Error("Password required"));
					}
				}
				reject(e);
			})
			.finally(() => {
				if (connectingWifi.get() == accessPoint) {
					setConnectingWifi(null);
				}
			});
	});
}

export function getConnectingWifiAccessor() {
	return connectingWifi;
}

const [rescanningWifi, setRescanningWifi] = createState<boolean>(false);

export function rescanWifi() {
	if (rescanningWifi.get()) {
		throw new Error("Wifi is already scanning");
	}
	setRescanningWifi(true);

	return new Promise<void>((resolve, reject) => {
		const command = createCommandProcess(["nmcli", "dev", "wifi", "rescan"]);

		command
			.then(() => resolve())
			.catch(reject)
			.finally(() => {
				setRescanningWifi(false);
			});
	});
}

export function getRescanningWifiAccessor() {
	return rescanningWifi;
}
