import { createState } from "gnim";
import { timeout, Timer } from "ags/time";
import { IMenuHandlerState } from "@interface/menu-handler-state";
import { MenuHandler } from "./handlers/menu-handler";
import { AudioMenuHandler } from "./handlers/audio/audio.menu-handler";
import { NetworkMenuHandler } from "./handlers/network/network.menu-handler";
import { BluetoothMenuHandler } from "./handlers/bluetooth/bluetooth.menu-handler";
import { TimeMenuHandler } from "./handlers/time/time.menu-handler";

const [activeHandler, setActiveHandler] = createState<IMenuHandlerState>({
	handler: null,
});
let visibilityTimer: Timer | null = null;

export function setMenu(
	handlerClass: typeof MenuHandler | null,
	data?: string | number | null,
) {
	visibilityTimer?.cancel();

	if (handlerClass) {
		if (activeHandler.get()) {
			visibilityTimer = timeout(100, () => {
				setActiveHandler({
					handler: handlerClass,
					data: data ?? null,
				});
			});
		} else {
			setActiveHandler({
				handler: handlerClass,
				data: data ?? null,
			});
			return;
		}
	}
	setActiveHandler({
		handler: null,
	});
}

export function toggleMenu(
	handlerClass: typeof MenuHandler | null,
	data?: string | number | null,
) {
	const activeHandlerState = activeHandler.get();

	if (
		handlerClass?.name == activeHandlerState.handler?.name &&
		(!activeHandlerState.handler || activeHandlerState.data == data)
	) {
		setMenu(null);
	} else {
		setMenu(handlerClass, data);
	}
}

export function getActiveHandlerStateAccessor() {
	return activeHandler;
}

export const MENU_HANDLERS: MenuHandler[] = [
	new AudioMenuHandler(),
	new NetworkMenuHandler(),
	new BluetoothMenuHandler(),
	new TimeMenuHandler()
] as const;
