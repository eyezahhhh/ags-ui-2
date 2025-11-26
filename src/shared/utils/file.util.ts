import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";

export function getFileType(file: Gio.File) {
	return new Promise<Gio.FileType>((resolve, reject) => {
		file.query_info_async(
			"standard::type",
			Gio.FileQueryInfoFlags.NONE,
			GLib.PRIORITY_DEFAULT_IDLE,
			null,
			(_file, result) => {
				try {
					const info = file.query_info_finish(result);
					resolve(info.get_file_type());
				} catch (e) {
					reject(e);
				}
			},
		);
	});
}

export function makeDirectory(file: Gio.File) {
	return new Promise<void>((resolve, reject) => {
		file.make_directory_async(
			GLib.PRIORITY_DEFAULT_IDLE,
			null,
			(_file, result) => {
				try {
					const success = file.make_directory_finish(result);
					if (!success) {
						throw new Error("Failed to create directory");
					}
					resolve();
				} catch (e) {
					reject(e);
				}
			},
		);
	});
}

export async function makeDirectoryRecursive(file: Gio.File) {
	try {
		await makeDirectory(file);
	} catch (e) {
		if (e instanceof GLib.Error) {
			if (e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.EXISTS)) {
				const type = await getFileType(file);
				if (type == Gio.FileType.DIRECTORY) {
					return;
				}
			}

			if (e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) {
				const parent = file.get_parent();
				if (!parent) {
					throw new Error("Root doesn't exist? What the fuck.");
				}
				await makeDirectoryRecursive(parent);
				await makeDirectory(file);
				return;
			}
		}
		throw e;
	}
}
