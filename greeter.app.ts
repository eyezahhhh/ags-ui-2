import { CLASS } from "@const/class";
import { createDebouncer } from "@util/time";
import { monitorFile } from "ags/file";
import app from "ags/gtk4/app";
import { GreeterWindow } from "greeter/greeter.window";

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
	css: `${globalThis.SRC}/astal-style.css`,
	instanceName: `${CLASS}_greeter`,
	iconTheme: "Papirus",
	main: () => {
		const monitors = app.get_monitors();
		GreeterWindow(monitors[monitors.length - 1]);

		monitorFile(`${globalThis.SRC}/astal-style.css`, () => reloadStyles());
	},
});
