import { Gtk } from "ags/gtk4";
import styles from "./power-button.component.style";

interface Props {
	iconName: string;
}

export function PowerButton({ iconName }: Props) {
	return (
		<button cssClasses={[styles.button]}>
			<image iconName={iconName} iconSize={Gtk.IconSize.LARGE} />
		</button>
	);
}
