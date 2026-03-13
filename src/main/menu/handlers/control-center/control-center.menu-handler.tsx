import GObject from "gnim/gobject";
import { MenuHandler } from "../menu-handler";
import { Accessor, createBinding, With } from "gnim";
import { ToggleButton } from "@components/toggle-button/toggle-button";
import styles from "./control-center.menu-handler.style";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import { exec } from "ags/process";

export class ControlCenterMenuHandler extends MenuHandler {
	constructor() {
		super("control-center");
	}

	public getContent(
		_window: GObject.Object,
		_data: string | number | null,
	): GObject.Object {
		const hyprland = AstalHyprland.get_default();

		return (
			<box cssClasses={[styles.buttons]}>
				<ToggleButton onClicked={() => exec("shutdown now")}>
					<image iconName="system-shutdown-symbolic" />
				</ToggleButton>
				<ToggleButton onClicked={() => exec("reboot")}>
					<image iconName="system-reboot-symbolic" />
				</ToggleButton>
				<ToggleButton onClicked={() => hyprland.message("dispatch exit")}>
					<image iconName="system-switch-user-symbolic" />
				</ToggleButton>
			</box>
		);
	}
}
