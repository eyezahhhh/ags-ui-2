import { CLASS } from "@const/class";
import { createDebouncer } from "@util/time";
import { monitorFile } from "ags/file";
import app from "ags/gtk4/app";
import { GreeterWindow } from "greeter/greeter.window";

const reloadStyles = createDebouncer(() => {
	app.reset_css();
	app.apply_css("./astal-style.css");
	console.log("Reloaded CSS.");
}, 100);

app.start({
	css: "./astal-style.css",
	instanceName: `${CLASS}_greeter`,
	iconTheme: "Papirus",
	main: () => {
		const monitors = app.get_monitors();
		GreeterWindow(monitors[monitors.length - 1]);

		monitorFile("./astal-style.css", () => reloadStyles());
	},
});
