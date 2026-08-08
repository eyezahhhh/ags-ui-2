import app from "ags/gtk4/app";
import { monitorFile } from "ags/file";
import { createDebouncer } from "@util/time";
import { BarWindow } from "./bar/bar.window";
import { MenuWindow } from "./menu/menu.window";
import WireGuard from "@service/wireguard";
import { LauncherWindow } from "./launcher/launcher.window";
import { CLASS } from "@const/class";
import { ROOT } from "@const/root";
import { WallpaperWindow } from "@window/wallpaper/wallpaper";
import { SliderWindow } from "@window/slider/slider";
import { createBinding, For, This } from "gnim";
import { IS_DEV } from "@const/is-dev";
import { CACHE_DIRECTORY } from "@const/cache-directory";
import { generateStyles, generateStylesSync, watchStyles } from "@util/app";
import { makeDirectoryRecursiveSync } from "@util/file";
import Gio from "gi://Gio?version=2.0";
import { WorkspacesWindow } from "main/workspaces/workspaces.window";
import AppRequest from "@service/app-request";
import { StatsWindow } from "main/stats/stats.window";
import Config from "@util/config";
import { DockWindow } from "main/dock/dock.window";
import { PERSISTENT_STORAGE_DIRECTORY } from "@const/persistent-storage-directory";
import { NotificationsWindow } from "main/notifications/notifications.window";
import OpenRGB from "@service/openrgb";

const WALLUST_FILE = Config.getString("theme.wallustThemeFile");

console.log(`ROOT:`, ROOT);

const reloadStyles = createDebouncer(() => {
	app.reset_css();
	app.apply_css(`${CACHE_DIRECTORY}/style.css`);
	console.log("Reloaded CSS.");
}, 100);

app.start({
	css: `${CACHE_DIRECTORY}/style.css`,
	instanceName: `${CLASS}_main`,
	iconTheme: "Fluent",
	main: () => {
		const enableDock = Config.getBoolean("dock.enable", true);

		makeDirectoryRecursiveSync(Gio.File.new_for_path(CACHE_DIRECTORY));
		makeDirectoryRecursiveSync(
			Gio.File.new_for_path(PERSISTENT_STORAGE_DIRECTORY),
		);
		generateStylesSync(IS_DEV);

		MenuWindow();
		LauncherWindow();
		SliderWindow();
		WorkspacesWindow();
		NotificationsWindow();

		monitorFile(`${CACHE_DIRECTORY}/style.css`, () => reloadStyles());
		monitorFile(WALLUST_FILE, () => {
			console.log(`Wallust file changed (${WALLUST_FILE})`);
			generateStyles().catch(console.error);
		});

		WireGuard.get_default(); // load WireGuard before it's visually needed
		OpenRGB.get_default();

		if (IS_DEV) {
			console.log("Launched in DEV mode, watching .scss files");
			watchStyles({
				onStdout: (stdout: any) => {
					console.log("[SCSS MONITOR]:", stdout);
				},
				onStderr: (stderr: any) => {
					console.error("[SCSS MONITOR]:", stderr);
				},
			});
		}

		const monitors = createBinding(app, "monitors");

		return (
			<For each={monitors}>
				{(monitor) => (
					<This this={app}>
						<BarWindow gdkMonitor={monitor} />
						<WallpaperWindow gdkMonitor={monitor} />
						<StatsWindow gdkMonitor={monitor} />
						{enableDock !== false && <DockWindow gdkMonitor={monitor} />}
					</This>
				)}
			</For>
		);
	},
	requestHandler: (...options) => AppRequest.get_default().invoke(...options),
});
