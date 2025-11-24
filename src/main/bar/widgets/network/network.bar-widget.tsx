import { NetworkOverviewIcon } from "@icon/network-overview";
import styles from "./network.bar-widget.style";

interface Props {
	onClicked?: () => void;
}

export function NetworkBarWidget({ onClicked }: Props) {
	return (
		<button cssClasses={[styles.button]} onClicked={onClicked}>
			<NetworkOverviewIcon />
		</button>
	);
}
