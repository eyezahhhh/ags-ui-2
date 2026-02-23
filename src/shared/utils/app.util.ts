import { CACHE_DIRECTORY } from "@const/cache-directory";
import { ROOT } from "@const/root";
import { WALLUST_FILE } from "@const/wallust-file";
import app from "ags/gtk4/app";
import { exec } from "ags/process";
import { createCommandProcess } from "./cli.util";

const GENERATE_STYLE_COMMAND = [
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
];

export function generateStylesSync() {
	console.log("Generating CSS synchronously...");
	const start = Date.now();

	const response = exec(GENERATE_STYLE_COMMAND);
	const lines = response.split("\n");
	for (const line of lines) {
		console.log(`[CSS GENERATOR]:`, line);
	}
	app.reset_css();
	app.apply_css(`${CACHE_DIRECTORY}/style.css`);
	const duration = Date.now() - start;
	console.log(`Generated and applied CSS in ${duration}ms`);
}

export async function generateStyles() {
	const promise = createCommandProcess(GENERATE_STYLE_COMMAND, {
		onStdout: (stdout) => console.log("[CSS GENERATOR]:", stdout),
		onStderr: (stderr) => console.error("[CSS GENERATOR]:", stderr),
	});
	await promise;
}
