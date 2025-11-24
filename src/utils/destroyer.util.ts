import GObject from "gnim/gobject";

interface Disconnectable {
	disconnect(id: number): void;
}

export class Destroyer {
	private readonly callbacks = new Set<() => void>();
	private destroyed = false;

	isDestroyed() {
		return this.destroyed;
	}

	add(callback: () => void) {
		if (this.isDestroyed()) {
			throw new Error("Destroyer is destroyed");
		}

		this.callbacks.add(callback);
	}

	addDisconnect(object: Disconnectable, connectionId: number) {
		this.add(() => object.disconnect(connectionId));
	}

	destroy() {
		if (this.isDestroyed()) {
			throw new Error("Destroyer is destroyed");
		}
		this.destroyed = true;
		for (let callback of this.callbacks) {
			callback();
		}
		this.callbacks.clear();
	}
}
