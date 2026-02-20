import app from "ags/gtk4/app";
import { monitorFile } from "ags/file";
import { createDebouncer } from "@util/time";
import { BarWindow } from "./src/main/bar/bar.window";
import { MenuWindow } from "./src/main/menu/menu.window";
import WireGuard from "@service/wireguard";
import { LauncherWindow } from "./src/main/launcher/launcher.window";
import { CLASS } from "@const/class";
import { ROOT } from "@const/root";
import { Gdk, Gtk } from "ags/gtk4";
import { WallpaperWindow } from "@window/wallpaper/wallpaper";
import { SliderWindow } from "@window/slider/slider";
import { createBinding } from "gnim";
import { IS_DEV } from "@const/is-dev";
import { createCommandProcess } from "@util/cli";
import { CACHE_DIRECTORY } from "@const/cache-directory";
import { WALLUST_FILE } from "@const/wallust-file";
import { generateStylesSync } from "@util/app";

console.log(`ROOT:`, ROOT);

const reloadStyles = createDebouncer(() => {
	app.reset_css();
	app.apply_css(`${CACHE_DIRECTORY}/style.css`);
	console.log("Reloaded CSS.");
}, 100);

app.start({
	// iconTheme: "Papirus",
	instanceName: `${CLASS}_main`,
	iconTheme: "Papirus",
	main: () => {
		generateStylesSync();

		const monitorWindows = new Map<Gdk.Monitor, Gtk.Window[]>();

		const activateMonitors = () => {
			const monitors = app.get_monitors();
			console.log("Monitors list changed!", monitors.length);
			for (const monitor of monitors) {
				if (monitorWindows.has(monitor)) {
					continue;
				}
				const windows: Gtk.Window[] = [
					BarWindow(monitor),
					WallpaperWindow(monitor),
				];
				monitorWindows.set(monitor, windows);
			}

			setTimeout(() => {
				for (const [monitor, windows] of monitorWindows.entries()) {
					if (!monitors.includes(monitor)) {
						console.log("MONITOR REMOVED!");
						for (const window of windows) {
							window.destroy();
						}
						// monitorWindows.delete(monitor); // TODO: fix
					}
				}
			}, 1_000);
		};

		createBinding(app, "monitors").subscribe(activateMonitors);
		activateMonitors();

		MenuWindow();
		LauncherWindow();
		SliderWindow();

		monitorFile(`${CACHE_DIRECTORY}/style.css`, () => reloadStyles());

		WireGuard.get_default(); // load WireGuard before it's visually needed

		if (IS_DEV) {
			console.log("Launched in DEV mode, watching .scss files");
			createCommandProcess(
				[
					"node",
					"styles.js",
					"--output-file",
					`${CACHE_DIRECTORY}/style.css`,
					"--wallust-file",
					WALLUST_FILE,
					"--watch",
				],
				{
					onStdout: (stdout) => {
						console.log("[SCSS MONITOR]:", stdout);
					},
				},
			);
		}
	},
	requestHandler: (args, respond) => {
		console.log(args);
		respond("");
	},
});
