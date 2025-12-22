import Gamepad from "@service/gamepad";
import { Destroyer } from "@util/destroyer";
import { Gtk } from "ags/gtk4";
import { Accessor, createComputed, createState, For, onCleanup } from "gnim";
import styles from "./group.component.style";
import { asAccessor, createCursorPointer } from "@util/ags";
import { cc } from "@util/string";

interface Props {
	// children: Gtk.Widget[] | Accessor<Gtk.Widget[]>;
	children: any[] | Accessor<any[]>;
	selectedIndex: number | Accessor<number>;
	onClicked?: (index: number) => void;
	containerCssClasses?: string[] | Accessor<string[]>;
	containerCssFocusedClass?: string | Accessor<string>;
	orientation?: Gtk.Orientation | Accessor<Gtk.Orientation>;
	itemCssClasses?: string[] | Accessor<string[]>;
	itemCssFocusedClass?: string | Accessor<string>;
}

export function Group({
	children,
	selectedIndex,
	onClicked,
	containerCssClasses,
	containerCssFocusedClass,
	orientation,
	itemCssClasses,
	itemCssFocusedClass,
}: Props) {
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
		<box cssClasses={[styles.paddingContainer]}>
			<button
				cssClasses={createComputed(
					[
						focusedButton,
						asAccessor(containerCssClasses),
						asAccessor(containerCssFocusedClass),
					],
					(focusedButton, classes, focusedClass) =>
						cc(
							styles.container,
							...(classes || []),
							focusedButton >= 0 && focusedClass,
						),
				)}
				$={(self) => {
					container = self;
				}}
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
												onClicked?.(focusedButtonIndex);
											} else if (container?.has_focus) {
												setFocusedButton(0);
												console.log("Setting focused button!");
											}
										}
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
				<box orientation={orientation}>
					<For each={asAccessor(children) as Accessor<Gtk.Widget[]>}>
						{(value, index) => (
							<button
								cssClasses={createComputed(
									[
										asAccessor(selectedIndex),
										asAccessor(index),
										asAccessor(itemCssClasses),
										asAccessor(itemCssFocusedClass),
									],
									(selectedIndex, index, classes, focusedClass) =>
										cc(
											styles.button,
											...(classes || []),
											selectedIndex == index && focusedClass,
										),
								)}
								onClicked={() => onClicked?.(index.get())}
								cursor={createCursorPointer()}
								focusable={isFocused}
								onRealize={(self) => {
									const focusChange = () => {
										if (
											isFocused.get() &&
											asAccessor(selectedIndex).get() == index.get()
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
										console.log("Focus given to button", index.get());
										setFocusedButton(index.get());
									}}
								/>
								{value}
							</button>
						)}
					</For>
				</box>

				{/* <With value={asAccessor(sessions) as Accessor<IDesktopSession[] | null>}>
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
			</With> */}
			</button>
		</box>
	);
}
