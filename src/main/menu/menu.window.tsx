import { Astal, Gtk } from "ags/gtk4";
import app from "ags/gtk4/app";
import styles from "./menu.window.style";
import { getActiveHandlerStateAccessor, MENU_HANDLERS } from "./menu.manager";
import { createComputed, createState, onCleanup, With } from "gnim";
import { MenuHandler } from "./handlers/menu-handler";
import { CLASS } from "constants/class.const";
import GLib from "gi://GLib?version=2.0";
import Gtk4LayerShell from "gi://Gtk4LayerShell?version=1.0";
import { Destroyer } from "@util/destroyer";

const TOP_MARGIN = 34;

export function MenuWindow() {
	const { TOP, LEFT, RIGHT } = Astal.WindowAnchor;

	const [handler, setHandler] = createState<MenuHandler | null>(null);
	const [anchor, setAnchor] = createState<Astal.WindowAnchor>(TOP);
	const [height, setHeight] = createState(0);

	const stateAccessor = getActiveHandlerStateAccessor();
	const disconnect = stateAccessor.subscribe(() => {
		const handlerInfo = stateAccessor.peek();
		if (handlerInfo.handler) {
			for (let handler of MENU_HANDLERS) {
				if (handler instanceof handlerInfo.handler) {
					if (handlerInfo.side == "left") {
						setAnchor(TOP | LEFT);
					} else {
						setAnchor(TOP | RIGHT);
					}

					return setHandler(handler);
				}
			}
		}
		setHandler(null);
	});

	onCleanup(() => {
		disconnect();
	});

	const computedBind = createComputed(() => {
		const state = stateAccessor();
		const menuHandler = handler();
		let data: string | number | null = null;
		if (state.handler) {
			data = state.data;
		}

		return [menuHandler, data] as [MenuHandler | null, string | number | null];
	});

	const window = (
		<window
			anchor={anchor}
			application={app}
			marginTop={TOP_MARGIN}
			marginRight={10}
			marginLeft={10}
			cssClasses={[styles.window]}
			visible={handler.as((handler) => !!handler)}
			name="menu"
			namespace={`${CLASS}_menu`}
			class={CLASS}
			keymode={Astal.Keymode.ON_DEMAND}
			layer={Astal.Layer.OVERLAY}
			$={(self) => onCleanup(() => self.destroy())}
		>
			<With value={computedBind}>
				{([handler, data]) => (
					<Gtk.ScrolledWindow
						cssClasses={[styles.scroll]}
						maxContentHeight={500}
						propagateNaturalHeight
						widthRequest={250}
						vexpand={false}
						hscrollbarPolicy={Gtk.PolicyType.NEVER}
						valign={Gtk.Align.START}
					>
						<box
							cssClasses={[styles.container]}
							valign={Gtk.Align.START}
							onRealize={(container) => {
								const destroyer = new Destroyer();
								destroyer.addDisconnect(
									container,
									container.connect("unrealize", () => destroyer.destroy()),
								);

								const paintable = new Gtk.WidgetPaintable({
									widget: container,
								});

								destroyer.addDisconnect(
									paintable,
									paintable.connect("invalidate-size", () => {
										// jiggle layer to force compositor to resize
										Gtk4LayerShell.set_margin(
											window,
											Gtk4LayerShell.Edge.TOP,
											TOP_MARGIN + 1,
										);
										Gtk4LayerShell.set_margin(
											window,
											Gtk4LayerShell.Edge.TOP,
											TOP_MARGIN,
										);
									}),
								);
							}}
						>
							{handler?.getContent(window, data)}
						</box>
					</Gtk.ScrolledWindow>
				)}
			</With>
		</window>
	) as Gtk.Window;
}
