import AstalBattery from "gi://AstalBattery?version=0.1";
import styles from "./battery.bar-widget.style";
import { createBinding, createComputed } from "gnim";
import { createCursorPointer } from "@util/ags";
import AstalPowerProfiles from "gi://AstalPowerProfiles?version=0.1";
import { Gtk } from "ags/gtk4";

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
			<box>
				<image
					iconName={createComputed(() => {
						const type = createBinding(battery, "device_type")();
						const percent = createBinding(battery, "percentage")();
						const charging = createBinding(battery, "charging")();

						if (type == AstalBattery.Type.UNKNOWN) {
							return "gnome-power-manager-symbolic";
						}

						const percentString = (Math.round(percent * 10) * 10)
							.toString()
							.padStart(2, "0");

						return `battery-level-${percentString}${charging ? "-charging" : ""}-symbolic`;
					})}
					cssClasses={createComputed(() => {
						const charging = createBinding(battery, "charging")();
						const percent = createBinding(battery, "percentage")();

						const classes: string[] = [styles.icon];
						if (percent <= 0.2) {
							classes.push(styles["percent-danger"]);
						}
						if (percent <= 0.3) {
							classes.push(styles["percent-warning"]);
						}
						if (charging) {
							classes.push(styles["charging"]);
						}
						return classes;
					})}
				/>
				<revealer
					transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
					transitionDuration={250}
					revealChild={createBinding(battery, "percentage").as(
						(percent) => percent <= 0.2,
					)}
				>
					<label
						cssClasses={[styles.label]}
						label={createBinding(battery, "percentage").as(
							(percent) => `${Math.round(percent * 100)}%`,
						)}
					/>
				</revealer>
			</box>
		</button>
	);
}
