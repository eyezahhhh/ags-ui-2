import AstalBattery from "gi://AstalBattery?version=0.1";
import styles from "./battery.bar-widget.style";
import { createBinding, createComputed } from "gnim";
import { createCursorPointer } from "@util/ags";
import AstalPowerProfiles from "gi://AstalPowerProfiles?version=0.1";

interface Props {
	onClicked?: () => void;
}

export function BatteryBarWidget({ onClicked }: Props) {
	const battery = AstalBattery.get_default();
	const powerProfiles = AstalPowerProfiles.get_default();

	const profilesCount = powerProfiles.get_profiles().length;

	if (!profilesCount && battery.deviceType == AstalBattery.Type.UNKNOWN) {
		return <box />;
	}

	return (
		<button
			cssClasses={[styles.button]}
			onClicked={onClicked}
			cursor={createCursorPointer()}
		>
			{/* <image iconName={createBinding(battery, "battery_icon_name")} /> */}
			<image
				iconName={createComputed(
					[
						createBinding(battery, "device_type"),
						createBinding(battery, "battery_icon_name"),
					],
					(type, icon) =>
						type == AstalBattery.Type.UNKNOWN
							? "gnome-power-manager-symbolic"
							: icon,
				)}
			/>
		</button>
	);
}
