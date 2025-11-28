import Hyprshade from "@service/hyprshade";
import styles from "./brightness.bar-widget.style";
import { createBinding, createComputed, With } from "gnim";

interface Props {
	onClicked?: () => void;
}

export function BrightnessBarWidget({ onClicked }: Props) {
	const hyprshade = Hyprshade.get_default();

	const enabledBinding = createComputed(
		[createBinding(hyprshade, "shaders")],
		(shaders) => !!shaders.length,
	);

	return (
		<With value={enabledBinding}>
			{(enabled) =>
				enabled ? (
					<button cssClasses={[styles.button]} onClicked={onClicked}>
						<image iconName="display-brightness-symbolic" />
					</button>
				) : (
					<box />
				)
			}
		</With>
	);
}
