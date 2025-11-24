import AstalNetwork from "gi://AstalNetwork";
import { createBinding, createState } from "gnim";
import { Destroyer } from "../../utils/destroyer.util";
import { With, onCleanup } from "ags";
import styles from "./wifi.widget.style";
import { Gtk } from "ags/gtk4";

interface Props {
	iconSize?: Gtk.IconSize;
	cssClasses?: string[];
}

export function WifiWidget({ iconSize, cssClasses }: Props) {
	const network = AstalNetwork.get_default();

	const [icon, setIcon] = createState("");
	const destroyer = new Destroyer();

	const update = () => {
		if (network.primary == AstalNetwork.Primary.WIRED) {
			setIcon(network.wired.iconName);
		} else {
			if (network.wifi.enabled) {
				setIcon(network.wifi.iconName);
			} else {
				setIcon("network-wireless-offline-symbolic");
			}
		}
	};

	let wiredCleanup: (() => void) | null = null;
	destroyer.addDisconnect(
		network,
		network.connect("notify::wired", () => {
			console.log("Wired update");
			wiredCleanup?.();
			if (network.wired) {
				wiredCleanup = () =>
					network.wired.disconnect(network.wired.connect("notify", update));
			}
		}),
	);

	let wifiCleanup: (() => void) | null = null;
	destroyer.addDisconnect(
		network,
		network.connect("notify::wifi", () => {
			console.log("Wifi update");
			wifiCleanup?.();
			if (network.wifi) {
				wifiCleanup = () =>
					network.wifi.disconnect(network.wifi.connect("notify", update));
			}
		}),
	);

	update();

	onCleanup(() => {
		console.log("Network widget destroyed");
		wiredCleanup?.();
		destroyer.destroy();
	});

	return <image iconName={icon} cssClasses={cssClasses} iconSize={iconSize} />;
}
