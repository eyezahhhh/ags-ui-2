import app from "ags/gtk4/app";
import { monitorFile } from "ags/file";
import { createDebouncer } from "@util/time";
import { BarWindow } from "./src/main/bar/bar.window";
import { MenuWindow } from "./src/main/menu/menu.window";
import WireGuard from "@service/wireguard";
import { LauncherWindow } from "./src/main/launcher/launcher.window";
import Gamepad from "@service/gamepad";
import { CLASS } from "@const/class";

declare global {
	var SRC: string;
}

if (!("SRC" in globalThis)) {
	globalThis.SRC = ".";
}

console.log(`SRC:`, globalThis.SRC);

const reloadStyles = createDebouncer(() => {
	app.reset_css();
	app.apply_css(`${globalThis.SRC}/astal-style.css`);
	console.log("Reloaded CSS.");
}, 100);

app.start({
	// css: "./astal-style.css",
	css: `${globalThis.SRC}/astal-style.css`,
	// iconTheme: "Papirus",
	instanceName: `${CLASS}_main`,
	iconTheme: "Papirus",
	main: () => {
		const monitors = app.get_monitors();
		for (const monitor of monitors) {
			BarWindow(monitor);
		}
		MenuWindow();
		// LauncherWindow();

		monitorFile(`${globalThis.SRC}/astal-style.css`, () => reloadStyles());

		WireGuard.get_default(); // load WireGuard before it's visually needed
	},
});

Gamepad.get_default();
