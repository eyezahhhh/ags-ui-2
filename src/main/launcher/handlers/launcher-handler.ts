import { Astal, Gtk } from "ags/gtk4";

export type ManagerEntry = {
	id: string;
	name: string;
	icon: string | null;
};

export abstract class LauncherHandler {
	private readonly listeners = new Set<() => void>();
	private enabled = false;

	constructor(
		private readonly name: string,
		protected readonly setQuery: (query: string) => void,
		enabled?: boolean,
	) {
		if (enabled !== undefined) {
			this.setEnabled(enabled);
		}
	}

	public getName() {
		return this.name;
	}

	public isEnabled() {
		return this.enabled;
	}

	protected setEnabled(enabled: boolean) {
		if (this.enabled != enabled) {
			this.enabled = enabled;
			this.triggerUpdate();
			console.log(
				`Manager "${this.getName()}" is ${this.enabled ? "enabled" : "disabled"}.`,
			);
		}
	}

	public addListener(listener: () => void) {
		this.listeners.add(listener);
		return () => this.removeListener(listener);
	}

	public removeListener(listener: () => void) {
		const wasListening = this.listeners.has(listener);
		if (wasListening) {
			this.listeners.delete(listener);
		}
		return wasListening;
	}

	protected triggerUpdate() {
		for (let listener of this.listeners) {
			listener();
		}
	}

	public abstract update(query: string): void;

	public abstract getContent(
		entryId: string,
		window: Astal.Window,
	): Gtk.Widget | Promise<Gtk.Widget>;

	public abstract getEntries(): ManagerEntry[];

	public onEnter(entryId: string, window: Astal.Window) {}

	public onLauncherOpen() {}
}
