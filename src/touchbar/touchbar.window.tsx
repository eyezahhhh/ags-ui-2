import { CLASS } from "@const/class";
import Wallpaper from "@service/wallpaper";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import app from "ags/gtk4/app";
import { Accessor, createBinding, createComputed } from "gnim";

export function TouchbarWindow(gdkMonitor: Gdk.Monitor) {
	const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor;

	const wallpaperService = Wallpaper.get_default();

	return (
		<window
			visible
			name="touchbar"
			namespace={`${CLASS}_touchbar`}
			gdkmonitor={gdkMonitor}
			anchor={TOP | RIGHT}
			application={app}
			class={CLASS}
		>
			<box hexpand vexpand>
				<Gtk.Overlay $={(overlay) => {}}>
					<revealer
						hexpand
						vexpand
						transitionType={Gtk.RevealerTransitionType.CROSSFADE}
						revealChild={createComputed(
							() =>
								createBinding(wallpaperService, "is_current_set")() &&
								!createBinding(wallpaperService, "is_loading_colors")(),
						)}
						child={createComputed(() => {
							if (!createBinding(wallpaperService, "is_current_set")()) {
								return (<box />) as Gtk.Widget;
							}
							const picture = Gtk.Picture.new_for_filename(
								createBinding(wallpaperService, "current")().getPath(),
							);
							picture.set_content_fit(Gtk.ContentFit.COVER);
							return picture;
						})}
					/>
				</Gtk.Overlay>
			</box>
		</window>
	);
}
