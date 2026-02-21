import { CACHE_DIRECTORY } from "@const/cache-directory";
import { ROOT } from "@const/root";
import { WALLUST_FILE } from "@const/wallust-file";
import { readFileAsync } from "ags/file";
import app from "ags/gtk4/app";
import { exec } from "ags/process";

export function generateStylesSync() {
	console.log("Generating CSS synchronously...");
	const start = Date.now();

	const response = exec([
		"node",
		`${ROOT}/script/generate-styles.js`,
		"--output-file",
		`${CACHE_DIRECTORY}/style.css`,
		"--wallust-file",
		WALLUST_FILE,
		"--wallust-cache-file",
		`${CACHE_DIRECTORY}/wallust.scss`,
		"--root",
		ROOT,
		"--no-ts-output",
	]);
	const lines = response.split("\n");
	for (const line of lines) {
		console.log(`[CSS GENERATOR]:`, line);
	}
	// app.reset_css();
	// app.apply_css(`${CACHE_DIRECTORY}/style.css`);
	applyCss(`${CACHE_DIRECTORY}/style.css`, true);
	const duration = Date.now() - start;
	console.log(`Generated and applied CSS in ${duration}ms`);
}

export async function applyCss(path: string, reset?: boolean) {
	const contents = await readFileAsync(path);
	// console.log(contents);
	app.apply_css(contents, reset);
}
