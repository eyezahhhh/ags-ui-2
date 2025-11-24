import { Gdk, Gtk } from "ags/gtk4";
import AstalApps from "gi://AstalApps?version=0.1";

// todo: make this controllable from nixos
const ICON_ALIASES: Record<string, string> = {
	"^Minecraft*": "minecraft",
} as const;

export function getIconTheme() {
	return Gtk.IconTheme.get_for_display(Gdk.Display.get_default()!);
}

export function getIconForWindow(windowClass: string) {
	const theme = getIconTheme();
	const apps = new AstalApps.Apps();

	for (let [regex, icon] of Object.entries(ICON_ALIASES)) {
		if (windowClass.match(regex) && theme.has_icon(icon)) {
			return icon;
		}
	}

	if (theme.has_icon(windowClass)) {
		return windowClass;
	}

	const appList = apps.get_list();
	for (let app of appList) {
		const executable = app.executable.split(" ")[0];
		if (
			(app.wmClass && app.wmClass == windowClass) ||
			executable == windowClass
		) {
			return app.iconName;
		}
	}

	return null;
}
