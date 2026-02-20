import { CACHE_DIRECTORY } from "@const/cache-directory";
import { WALLUST_FILE } from "@const/wallust-file";
import app from "ags/gtk4/app";
import { exec } from "ags/process";

export function generateStylesSync() {
	console.log("Generating CSS synchronously...");
	const start = Date.now();
	exec([
		"node",
		"styles.js",
		"--output-file",
		`${CACHE_DIRECTORY}/style.css`,
		"--wallust-file",
		WALLUST_FILE,
	]);
	app.apply_css(`${CACHE_DIRECTORY}/style.css`);
	const duration = Date.now() - start;
	console.log(`Generated and applied CSS in ${duration}ms`);
}
