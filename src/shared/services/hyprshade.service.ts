import GObject, { property, register } from "gnim/gobject";
import "ags/file";
import { execAsync } from "ags/process";
import { compareString } from "@util/string";
import { doesCommandExist } from "@util/cli";
import { timeout } from "ags/time";

namespace Hyprshade {
	@register()
	export class Shader extends GObject.Object {
		private onChange: (self: Shader, active: boolean) => void;

		@property(String)
		readonly id: string;

		@property(Boolean)
		active: boolean;

		set_active(active: boolean) {
			this.onChange(this, active);
		}

		constructor(
			id: string,
			active: boolean,
			createActiveListener: (
				self: Shader,
				callback: (active: boolean) => void,
			) => void,
			onChange: (self: Shader, active: boolean) => void,
		) {
			super();
			this.id = id;
			this.active = active;
			this.onChange = onChange;

			createActiveListener(this, (active) => {
				this.active = active;
				this.notify("active");
			});
		}
	}

	@register()
	class HyprshadeService extends GObject.Object {
		private activeCallbacks = new Map<Shader, (active: boolean) => void>();

		constructor() {
			super();

			doesCommandExist("hyprshade", "--version").then(async (enabled) => {
				if (!enabled) {
					console.log("Hyprshade support is disabled. Install Hyprshade.");
					return;
				}
				console.log("Hyprshade support is enabled.");
				while (true) {
					try {
						await this.scan();
					} catch (e) {
						console.error(e);
					}
					await new Promise<void>((r) => timeout(3_000, r));
				}
			});
		}

		public async scan() {
			const listOutput = await execAsync(["hyprshade", "ls"]);
			const shaderIds = listOutput.split("\n").map((file) => {
				const active = file.startsWith("* ");
				if (active || file.startsWith("  ")) {
					file = file.substring(2);
				}
				return {
					active,
					id: file,
				};
			});
			let updated = false;

			const shaders = new Map<string, Shader>();
			for (const shader of this.shaders) {
				shaders.set(shader.id, shader);
			}

			for (const [shaderId, shader] of shaders.entries()) {
				const entry = shaderIds.find((shader) => shader.id == shaderId);

				if (entry) {
					shaderIds.splice(shaderIds.indexOf(entry), 1);
					if (entry.active != shader.active) {
						this.activeCallbacks.get(shader)?.(entry.active);
					}
				} else {
					shaders.delete(shaderId);
					updated = true;
				}
			}

			for (const { id, active } of shaderIds) {
				shaders.set(
					id,
					new Shader(
						id,
						active,
						(self, callback) => this.activeCallbacks.set(self, callback),
						(self, active) => {
							for (const shader of this.shaders) {
								if (self == shader) {
									if (shader.active != active) {
										this.activeCallbacks.get(self)?.(active);
									}
								} else if (shader.active) {
									this.activeCallbacks.get(shader)?.(false);
								}
							}
							if (active) {
								execAsync(["hyprshade", "on", self.id]).catch(console.error);
							} else {
								execAsync(["hyprshade", "off"]).catch(console.error);
							}
						},
					),
				);
				updated = true;
			}

			if (updated) {
				this.shaders = Array.from(shaders.values()).sort((a, b) =>
					compareString(a.id, b.id),
				);
				this.notify("shaders");
			}
		}

		@property(Object)
		shaders: Shader[] = [];
	}

	let instance: HyprshadeService | null = null;
	export function get_default() {
		if (!instance) {
			instance = new HyprshadeService();
		}
		return instance;
	}
}

export default Hyprshade;
