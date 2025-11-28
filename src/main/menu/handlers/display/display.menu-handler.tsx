import GObject from "gnim/gobject";
import { MenuHandler } from "../menu-handler";
import Hyprshade from "@service/hyprshade";
import { Accessor, createBinding, For, With } from "gnim";
import { Gtk } from "ags/gtk4";
import { ClickableListEntry } from "@components/clickable-list-entry/clickable-list-entry";

export class DisplayMenuHandler extends MenuHandler {
	constructor() {
		super("display");
	}

	public getContent(
		_window: GObject.Object,
		_data: string | number | null,
	): GObject.Object {
		const hyprshade = Hyprshade.get_default();

		return (
			<box widthRequest={250}>
				<box orientation={Gtk.Orientation.VERTICAL}>
					<For
						each={
							createBinding(hyprshade, "shaders") as Accessor<
								Hyprshade.Shader[]
							>
						}
					>
						{(shader) => (
							<ClickableListEntry
								label={createBinding(shader, "id")}
								subLabel={createBinding(shader, "active").as((active) =>
									active ? "Active" : null,
								)}
								onClicked={() => shader.set_active(!shader.active)}
							/>
							// <box>
							// 	<label label={createBinding(shader, "id")} />
							// 	<label
							// 		label={createBinding(shader, "active").as((active) =>
							// 			active ? "Active" : "Inactive",
							// 		)}
							// 	/>
							// </box>
						)}
					</For>
				</box>
			</box>
		);
	}
}
