import { IDesktopSession } from "@interface/desktop-session";
import { asAccessor, createCursorPointer } from "@util/ags";
import { Gtk } from "ags/gtk4";
import { Accessor, createComputed, createState, onCleanup, With } from "gnim";
import styles from "./session-selector.component.style";
import { cc } from "@util/string";
import Gamepad from "@service/gamepad";
import { Destroyer } from "@util/destroyer";
import GLib from "gi://GLib?version=2.0";

interface Props {
	sessions: (IDesktopSession[] | null) | Accessor<IDesktopSession[] | null>;
	selectedIndex: number | Accessor<number>;
	onChange?: (index: number) => void;
}

export function SessionSelector({ sessions, selectedIndex, onChange }: Props) {
	const [focusedButton, setFocusedButton] = createState<number>(-1);
	const [isFocused, setIsFocused] = createState(false);
	const gamepad = Gamepad.get_default();
	let container: Gtk.Button | null = null;

	const destroyer = new Destroyer();

	destroyer.add(
		focusedButton.subscribe(() => setIsFocused(focusedButton.get() >= 0)),
	);

	onCleanup(() => {
		destroyer.destroy();
	});

	return (
		<button
			cssClasses={focusedButton.as((focusedButton) =>
				cc(styles.container, focusedButton >= 0 && styles.focus),
			)}
			$={(self) => {
				container = self;
			}}
			halign={Gtk.Align.START}
		>
			<Gtk.EventControllerFocus
				onEnter={(self) => {
					const destroyer = new Destroyer();
					destroyer.add(
						gamepad.connectForAllGamepadButtons(
							"notify::value",
							(gamepad, button, buttonIndex) => {
								if (button.value == 1) {
									if (buttonIndex == 0) {
										const focusedButtonIndex = focusedButton.get();
										if (focusedButtonIndex >= 0) {
											onChange?.(focusedButtonIndex);
										} else if (container?.has_focus) {
											// console.log(`${buttonIndex}, ${button.value == 1}`);
											setFocusedButton(0);
											console.log("Setting focused button!");
										}
									}
									console.log(buttonIndex);
									if (buttonIndex == 1) {
										setFocusedButton(-1);
										container?.grab_focus();
									}
								}
							},
						),
					);

					destroyer.addDisconnect(
						self,
						self.connect("leave", () => {
							destroyer.destroy();
							setFocusedButton(-1);
						}),
					);
				}}
			/>
			<With value={asAccessor(sessions) as Accessor<IDesktopSession[] | null>}>
				{(sessions) =>
					sessions ? (
						<box orientation={Gtk.Orientation.VERTICAL}>
							{sessions.map((session, index) => (
								<button
									cssClasses={asAccessor(selectedIndex).as((selectedIndex) =>
										cc(styles.session, selectedIndex == index && styles.active),
									)}
									onClicked={() => onChange?.(index)}
									cursor={createCursorPointer()}
									focusable={focusedButton.as(
										(focusedButton) => focusedButton >= 0,
									)}
									onRealize={(self) => {
										const focusChange = () => {
											if (
												isFocused.get() &&
												asAccessor(selectedIndex).get() == index
											) {
												console.log("ITS TIME TO GRAB FOCUS", index);
												setTimeout(() => {
													self.grab_focus();
												});
											}
										};

										const destroyer = new Destroyer();
										destroyer.add(isFocused.subscribe(focusChange));
										destroyer.addDisconnect(
											self,
											self.connect("unrealize", () => destroyer.destroy()),
										);
										focusChange();
									}}
								>
									<Gtk.EventControllerFocus
										onEnter={() => {
											console.log("Focus given to button", index);
											setFocusedButton(index);
										}}
									/>
									<label label={session.name} />
								</button>
							))}
						</box>
					) : (
						<box>
							<label label="Loading sessions..." />
						</box>
					)
				}
			</With>
		</button>
	);
}
