import { Group } from "../group/group.component";
import styles from "./power-button-group.component.style";

export function PowerButtonGroup() {
	return (
		<Group selectedIndex={0} itemCssClasses={[styles.button]}>
			<image iconName="system-shutdown-symbolic" pixelSize={32} />
			<image iconName="system-reboot-symbolic" pixelSize={32} />
		</Group>
	);
}
