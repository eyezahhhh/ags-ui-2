import { CLASS } from "@const/class";
import { Destroyer } from "@util/destroyer";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import { Accessor, createBinding, createState, For, onCleanup } from "gnim";
import styles from "./workspaces.window.style";
import { cc } from "@util/string";
import AppRequest from "@service/app-request";
import { getWindowIcon } from "@util/icon";
import { asAccessor } from "@util/ags";
import app from "ags/gtk4/app";
import { IS_DEV } from "@const/is-dev";

const syncHyprland = async (hyprland: AstalHyprland.Hyprland) => {
	await Promise.all([
		new Promise<void>((resolve) =>
			hyprland.sync_monitors((_, res) => {
				hyprland.sync_monitors_finish(res);
				// console.log("Synced monitors");
				resolve();
			}),
		),
		new Promise<void>((resolve) =>
			hyprland.sync_workspaces((_, res) => {
				hyprland.sync_workspaces_finish(res);
				// console.log("Synced workspaces");
				resolve();
			}),
		),
		new Promise<void>((resolve) =>
			hyprland.sync_clients((_, res) => {
				hyprland.sync_clients_finish(res);
				// console.log("Synced clients");
				resolve();
			}),
		),
	]);
};

interface WorkspaceInfo {
	workspace: AstalHyprland.Workspace;
	clients: AstalHyprland.Client[];
}

export function WorkspacesWindow() {
	const hyprland = AstalHyprland.get_default();
	// const [workspaces, setWorkspaces] = createState<AstalHyprland.Workspace[]>(
	// 	[],
	// );
	const [activeWorkspace, setActiveWorkspace] = createState<number | null>(
		null,
	);
	const changeActiveWorkspace = (increase: number) => {
		const currentWorkspaces = workspaces().map(({ workspace }, index) => ({
			workspace,
			index,
		}));
		const activeId = activeWorkspace();
		let activeIndex = currentWorkspaces.find(
			({ workspace }) => workspace.id === activeId || activeId === null,
		)!.index;

		activeIndex += increase;
		while (activeIndex < 0) {
			activeIndex += currentWorkspaces.length;
		}
		while (activeIndex >= currentWorkspaces.length) {
			activeIndex -= currentWorkspaces.length;
		}
		const newWorkspace = currentWorkspaces[activeIndex].workspace;
		setActiveWorkspace(newWorkspace.id);
	};

	const [workspaces, setWorkspaces] = createState<WorkspaceInfo[]>([]);

	const goToWorkspace = (
		workspace: AstalHyprland.Workspace | number | null,
	) => {
		window.visible = false;
		if (typeof workspace == "number") {
			workspace = hyprland.get_workspace(workspace);
		}
		if (workspace) {
			hyprland.message(`dispatch workspace ${workspace.id}`);
		}
		setActiveWorkspace(null);
	};

	// destroyer.add(
	// 	AppRequest.get_default().addListener("workspaces", async (args) => {
	// 		if (args.length == 1 && args[0] == "toggle") {
	// 			if (window.visible) {
	// 				window.visible = false;
	// 			} else {
	// 				updateWorkspaces();
	// 				window.visible = true;
	// 			}

	// 			return "success";
	// 		}

	// 		return "Unknown command";
	// 	}),
	// );

	const updateWorkspaces = async (resetActiveId?: boolean) => {
		await syncHyprland(hyprland);

		const workspaces: WorkspaceInfo[] = hyprland
			.get_workspaces()
			.sort((a, b) => a.id - b.id)
			.map((workspace) => ({
				workspace,
				clients: hyprland
					.get_clients()
					.filter((client) => client.workspace.id === workspace.id),
			}));

		setWorkspaces(workspaces);

		// setWorkspaces(hyprland.workspaces.sort((a, b) => a.id - b.id));
		if (resetActiveId) {
			setActiveWorkspace(hyprland.get_focused_workspace().id);
		} else {
			const active = activeWorkspace();
			if (!workspaces.some(({ workspace }) => workspace.id == active)) {
				setActiveWorkspace(hyprland.get_focused_workspace().id);
			}
		}
	};

	const destroyer = new Destroyer();
	destroyer.addDisconnect(
		hyprland,
		hyprland.connect("workspace-added", () => updateWorkspaces()),
	);
	destroyer.addDisconnect(
		hyprland,
		hyprland.connect("workspace-removed", () => updateWorkspaces()),
	);

	destroyer.add(
		AppRequest.get_default().addListener("workspaces", async (args) => {
			if (args.length == 1) {
				if (args[0] == "toggle") {
					if (window.visible) {
						window.visible = false;
					} else {
						await syncHyprland(hyprland);
						updateWorkspaces(true);
						window.visible = true;
					}

					return "success";
				}

				if (args[0].startsWith("+") || args[0].startsWith("-")) {
					let number = parseInt(args[0].substring(1));
					if (isNaN(number)) {
						return "Invalid number";
					}
					if (args[0].startsWith("-")) {
						number *= -1;
					}
					if (!window.visible) {
						await syncHyprland(hyprland);
						await updateWorkspaces(true);
					}
					changeActiveWorkspace(number);
					window.visible = true;
					return "success";
				}
			}

			return "Unknown command";
		}),
	);

	updateWorkspaces();

	onCleanup(() => {
		destroyer.destroy();
	});

	const window = (
		<window
			name="workspaces"
			namespace={`${CLASS}_workspaces`}
			class={CLASS}
			application={app}
			keymode={Astal.Keymode.EXCLUSIVE}
			$={(self) => {
				hyprland.connect("notify", () => {
					// keep focus on window while it's open so we can listen for SUPER release
					if (self.visible) {
						self.grab_focus();
					}
				});
			}}
		>
			<Gtk.EventControllerKey
				onKeyPressed={(_self, keyVal) => {
					if (keyVal == Gdk.KEY_Escape) {
						goToWorkspace(null);
					}
					if (keyVal == Gdk.KEY_leftarrow) {
						changeActiveWorkspace(-1);
					}
					if (keyVal == Gdk.KEY_rightarrow) {
						changeActiveWorkspace(1);
					}
				}}
				onKeyReleased={(_self, keyVal) => {
					if (keyVal == Gdk.KEY_Super_L) {
						goToWorkspace(activeWorkspace());
					}
				}}
			/>
			<box>
				<For each={workspaces}>
					{({ workspace, clients }) => {
						return (
							<Workspace
								workspace={workspace}
								clients={clients}
								active={activeWorkspace.as((id) => workspace.id === id)}
								onClick={() => goToWorkspace(workspace)}
							/>
						);
					}}
				</For>
			</box>
		</window>
	) as Gtk.Window;

	return window;
}

interface WorkspaceProps {
	workspace: AstalHyprland.Workspace;
	clients: AstalHyprland.Client[];
	active: Accessor<boolean>;
	// onFocus?: (self: Gtk.Button) => void;
	onClick?: () => void;
}

function Workspace({ workspace, clients, active, onClick }: WorkspaceProps) {
	return (
		<button
			cssClasses={active.as((active) =>
				cc(styles.workspace, active && styles.active),
			)}
			onClicked={onClick}
		>
			<box orientation={Gtk.Orientation.VERTICAL}>
				<label label={workspace.name} />
				<Gtk.Fixed
					cssClasses={[styles.previewContainer]}
					$={(fixed) => {
						const calculateScale = (
							monitorWidth: number,
							monitorHeight: number,
						) => {
							const maxWidth = 300;
							const maxHeight = (300 / 16) * 9;

							return Math.min(
								maxWidth / monitorWidth,
								maxHeight / monitorHeight,
							);
						};

						const monitor = workspace.get_monitor();
						const monitorWidth = monitor.get_width();
						const monitorHeight = monitor.get_height();

						const scale = calculateScale(monitorWidth, monitorHeight);
						const monitorScale = monitor.get_scale();

						fixed.widthRequest = monitorWidth * scale;
						fixed.heightRequest = monitorHeight * scale;

						for (const client of clients) {
							const width = client.get_width() * scale;
							const height = client.get_height() * scale;
							const x = (client.get_x() - monitor.get_x()) * scale;
							const y = (client.get_y() - monitor.get_y()) * scale;

							fixed.put(
								(
									<button
										cssClasses={[styles.previewClient]}
										widthRequest={width * monitorScale}
										heightRequest={height * monitorScale}
									></button>
								) as Gtk.Button,
								x * monitorScale,
								y * monitorScale,
							);

							let iconPixelSize = 20;
							let iconSize = Gtk.IconSize.LARGE;

							if (width < 24 || height < 24) {
								iconPixelSize = 10;
								iconSize = Gtk.IconSize.NORMAL;
							}

							fixed.put(
								(
									<image
										iconName={createBinding(client, "initial_class").as(
											(initialClass) =>
												getWindowIcon(initialClass) || "new-window-symbolic",
										)}
										iconSize={iconSize}
									/>
								) as Gtk.Image,
								(x + (width - iconPixelSize) / 2) * monitorScale,
								(y + (height - iconPixelSize) / 2) * monitorScale,
							);
						}
					}}
				/>
			</box>
		</button>
	);
}
