import { Astal } from "ags/gtk4";
import GObject from "gnim/gobject";
import { LauncherEntry, LauncherHandler } from "../launcher-handler";
import Wallpaper from "@service/wallpaper";

export class WallpaperLauncherHandler extends LauncherHandler {
	private readonly wallpaper = Wallpaper.get_default();

	constructor(setQuery: (query: string) => void) {
		super("Wallpaper", setQuery, true);
	}

	public update(query: string): void {
		throw new Error("Method not implemented.");
	}
	public getContent(
		entryId: string,
		window: Astal.Window,
	): GObject.Object | null {
		return null;
	}
	public getEntries(): LauncherEntry[] {
		return [];
	}
	public getIcon(): string {
		throw new Error("Method not implemented.");
	}
}
