import app from "ags/gtk4/app";
import { monitorFile } from "ags/file";
import { createDebouncer } from "@util/time";
import WireGuard from "@service/wireguard";
import { CLASS } from "@const/class";
import { ROOT } from "@const/root";
import { IS_DEV } from "@const/is-dev";
import { CACHE_DIRECTORY } from "@const/cache-directory";
import { WALLUST_FILE } from "@const/wallust-file";
import { generateStyles, generateStylesSync, watchStyles } from "@util/app";
import { makeDirectoryRecursiveSync } from "@util/file";
import Gio from "gi://Gio?version=2.0";
import AppRequest from "@service/app-request";
import { TouchbarWindow } from "touchbar/touchbar.window";

console.log(`ROOT:`, ROOT);

const reloadStyles = createDebouncer(() => {
	app.reset_css();
	app.apply_css(`${CACHE_DIRECTORY}/style.css`);
	console.log("Reloaded CSS.");
}, 100);

app.start({
	css: `${CACHE_DIRECTORY}/style.css`,
	instanceName: `${CLASS}_touchbar`,
	iconTheme: "Papirus",
	main: () => {
		makeDirectoryRecursiveSync(Gio.File.new_for_path(CACHE_DIRECTORY));
		generateStylesSync(IS_DEV);

		const monitors = app.get_monitors();
		TouchbarWindow(monitors[monitors.length - 1]);

		monitorFile(`${CACHE_DIRECTORY}/style.css`, () => reloadStyles());
		monitorFile(WALLUST_FILE, () => {
			console.log(`Wallust file changed (${WALLUST_FILE})`);
			generateStyles().catch(console.error);
		});

		WireGuard.get_default(); // load WireGuard before it's visually needed

		if (IS_DEV) {
			console.log("Launched in DEV mode, watching .scss files");
			watchStyles({
				onStdout: (stdout) => {
					console.log("[SCSS MONITOR]:", stdout);
				},
				onStderr: (stderr) => {
					console.error("[SCSS MONITOR]:", stderr);
				},
			});
		}
	},
	requestHandler: (...options) => AppRequest.get_default().invoke(...options),
});
