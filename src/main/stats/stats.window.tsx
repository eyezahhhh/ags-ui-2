import { CLASS } from "@const/class";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import app from "ags/gtk4/app";
import styles from "./stats.window.style";
import { STATS_SOURCES } from "./stats.manager";
import { Destroyer } from "@util/destroyer";
import { createState, For, onCleanup } from "gnim";
import { Statistic, StatsModule } from "./source/stats-source";
import Pango from "gi://Pango?version=1.0";

interface Props {
	gdkMonitor: Gdk.Monitor;
}

export function StatsWindow({ gdkMonitor }: Props) {
	const { BOTTOM, RIGHT } = Astal.WindowAnchor;
	const [modules, setModules] = createState<StatsModule[][]>([]);

	const destroyer = new Destroyer();
	{
		const modules: StatsModule[][] = [];

		for (const [index, source] of STATS_SOURCES.entries()) {
			modules.push(source.getModules());

			destroyer.add(
				source.addListener((modules) => {
					setModules((sources) => {
						return sources.map((sourceModules, sourceIndex) => {
							if (sourceIndex == index) {
								return modules;
							}
							return sourceModules;
						});
					});
				}),
			);
		}

		setModules(modules);
	}

	return (
		<window
			anchor={BOTTOM | RIGHT}
			name="stats"
			namespace={`${CLASS}_stats`}
			class={CLASS}
			application={app}
			keymode={Astal.Keymode.NONE}
			layer={Astal.Layer.BOTTOM}
			gdkmonitor={gdkMonitor}
			margin={10}
			visible
			$={(self) =>
				onCleanup(() => {
					destroyer.destroy();
					self.destroy();
				})
			}
		>
			<box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.END}>
				<For each={modules}>
					{(modules) => (
						<box orientation={Gtk.Orientation.VERTICAL}>
							{modules.map((module) => (
								<box
									cssClasses={[styles.section]}
									orientation={Gtk.Orientation.VERTICAL}
								>
									{!!module.title && <label label={module.title} />}
									<box orientation={Gtk.Orientation.VERTICAL}>
										{module.stats.map((stat) => (
											<box cssClasses={[styles.statContainer]}>
												<Stat stat={stat} />
											</box>
										))}
									</box>
								</box>
							))}
						</box>
					)}
				</For>
			</box>
		</window>
	) as Gtk.Window;
}

function Stat(props: { stat: Statistic }) {
	const { stat } = props;

	if (stat.type == "percent") {
		return (
			<box
				orientation={Gtk.Orientation.VERTICAL}
				cssClasses={[styles.stat]}
				widthRequest={260}
			>
				{!!stat.title && (
					<label
						label={stat.title}
						halign={Gtk.Align.START}
						justify={Gtk.Justification.LEFT}
						ellipsize={Pango.EllipsizeMode.MIDDLE}
						maxWidthChars={30}
					/>
				)}
				<box>
					<image iconName={stat.icon} valign={Gtk.Align.CENTER} />
					<Gtk.ProgressBar
						fraction={stat.percent / 100}
						hexpand
						valign={Gtk.Align.CENTER}
						cssClasses={[styles.progressBar]}
						halign={Gtk.Align.FILL}
					/>
					<label
						label={stat.label}
						// cssClasses={[styles.label]}
						valign={Gtk.Align.CENTER}
					/>
				</box>
			</box>
		);
	}

	return <box />;
}
