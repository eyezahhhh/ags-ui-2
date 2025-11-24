import app from "ags/gtk4/app";
import { monitorFile } from "ags/file";
import { createDebouncer } from "@util/time";
import { BarWindow } from "./bar/bar.window";
import { MenuWindow } from "./menu/menu.window";

const reloadStyles = createDebouncer(() => {
	app.reset_css();
	app.apply_css("./astal-style.css");
	console.log("Reloaded CSS.");
}, 100);

app.start({
	css: "./astal-style.css",
	main: () => {
		const monitors = app.get_monitors();
		for (const monitor of monitors) {
			BarWindow(monitor);
		}
		MenuWindow();

		monitorFile("./astal-style.css", () => reloadStyles());
	},
});
