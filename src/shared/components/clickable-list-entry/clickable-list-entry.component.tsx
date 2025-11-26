import { Accessor, With } from "gnim";
import styles from "./clickable-list-entry.style";
import { cc } from "@util/string";
import { optionalAs } from "@util/ags";
import { Gtk } from "ags/gtk4";
import { WithOptional } from "@components/with-optional/with-optional";

interface Props {
	label: string | Accessor<string>;
	subLabel?: string | null | Accessor<string | undefined | null>;
	endLabel?: string | null | Accessor<string | undefined | null>;
	iconName?: string | Accessor<string>;
	active?: boolean | Accessor<boolean>;
	onClicked?: () => void;
}

export function ClickableListEntry({
	label,
	subLabel,
	endLabel,
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
				<centerbox hexpand>
					<box
						orientation={Gtk.Orientation.VERTICAL}
						$type="start"
						hexpand
						valign={Gtk.Align.CENTER}
					>
						<label label={label} halign={Gtk.Align.START} />
						<WithOptional value={subLabel}>
							{(subLabel) => (
								<box>
									{subLabel && (
										<label label={subLabel} cssClasses={[styles.subLabel]} />
									)}
								</box>
							)}
						</WithOptional>
					</box>
					<box $type="end">
						<WithOptional value={endLabel}>
							{(endLabel) => (
								<box>{endLabel && <label label={endLabel} />}</box>
							)}
						</WithOptional>
					</box>
				</centerbox>
			</box>
		</button>
	);
}
