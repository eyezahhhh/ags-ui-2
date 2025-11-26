import { Gtk } from "ags/gtk4";
import { Accessor, createComputed } from "gnim";

export function ToggleButton(
	props: {
		active?: boolean | Accessor<boolean>;
		disabled?: boolean | Accessor<boolean>;
	} & Gtk.Button.ConstructorProps,
) {
	const { active, disabled, cssClasses, ...passthroughProps } = props;

	return <button {...passthroughProps} cssClasses={createComputed}></button>;

	return Button({
		...props,
		cssName: props.cssName || "iconbutton",
		cssClasses: bind(
			Variable.derive(
				[
					toBinding(props.active),
					toBinding(props.cssClasses),
					toBinding(props.disabled),
				],
				(active, classes, disabled) =>
					cc(...(classes || []), active && "active", disabled && "disabled"),
			),
		),
	});
}
