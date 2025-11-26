import { Astal } from "ags/gtk4";
import app from "ags/gtk4/app";
import styles from "./menu.window.style";
import { getActiveHandlerStateAccessor, MENU_HANDLERS } from "./menu.manager";
import { createComputed, createState, onCleanup, With } from "gnim";
import { MenuHandler } from "./handlers/menu-handler";
import { CLASS } from "constants/class.const";

export function MenuWindow() {
	const { TOP, RIGHT } = Astal.WindowAnchor;

	const [handler, setHandler] = createState<MenuHandler | null>(null);

	const stateAccessor = getActiveHandlerStateAccessor();
	const disconnect = stateAccessor.subscribe(() => {
		const handlerInfo = stateAccessor.get();
		if (handlerInfo.handler) {
			for (let handler of MENU_HANDLERS) {
				if (handler instanceof handlerInfo.handler) {
					return setHandler(handler);
				}
			}
		}
		setHandler(null);
	});

	onCleanup(() => {
		disconnect();
	});

	const computedBind = createComputed(
		[handler, stateAccessor],
		(handler, stateAccessor) =>
			[handler, stateAccessor.handler && stateAccessor.data] as [
				MenuHandler | null,
				string | number | null,
			],
	);

	const window = (
		<window
			anchor={TOP | RIGHT}
			application={app}
			marginTop={34}
			marginRight={10}
			cssClasses={[styles.window]}
			visible={handler.as((handler) => !!handler)}
			name="menu"
			class={`${CLASS}_menu`}
			namespace={CLASS}
			keymode={Astal.Keymode.ON_DEMAND}
		>
			<With value={computedBind}>
				{([handler, data]) => (
					<box cssClasses={[styles.container]}>
						{handler?.getContent(window, data)}
					</box>
				)}
			</With>
		</window>
	);
}
