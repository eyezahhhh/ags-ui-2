import { Accessor, With } from "gnim";
import styles from "./clickable-list-entry.style";
import { cc } from "@util/string";
import { optionalAs } from "@util/ags";

interface Props {
	label: string | Accessor<string>;
	iconName?: string | Accessor<string>;
	active?: boolean | Accessor<boolean>;
	onClicked?: () => void;
}

export function ClickableListEntry({
	label,
	iconName,
	active,
	onClicked,
}: Props) {
	return (
		<button
			cssClasses={optionalAs(active, (active) =>
				cc(styles.button, active && styles.active),
			)}
			onClicked={onClicked}
		>
			<box>
				{iconName instanceof Accessor ? (
					<With value={iconName}>
						{(iconName) =>
							iconName && (
								<image iconName={iconName} cssClasses={[styles.icon]} />
							)
						}
					</With>
				) : (
					iconName && <image iconName={iconName} cssClasses={[styles.icon]} />
				)}
				<label label={label} />
			</box>
		</button>
	);
}
