import path from "path";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = [...process.argv];
function getFlag(flag) {
	if (!flag.startsWith("--")) {
		throw new Error(`Flag "${flag}" doesn't start with --`);
	}
	for (let i = 0; i < args.length; i++) {
		if (args[i] == flag) {
			if (i == args.length - 1) {
				throw new Error(`Option not provided for "${flag}"`);
			}
			const value = args[i + 1];
			args.splice(i, 2);
			return value;
		}
	}

	return null;
}

const instanceId = getFlag("--instance");
if (!instanceId) {
	throw new Error("--instance is not defined");
}

const home = process.env.HOME;

const file = path.join(
	home,
	".cache",
	"ags",
	"instance",
	instanceId,
	"wallust.scss",
);
writeFileSync(
	path.join(__dirname, "..", "wallust.scss"),
	`@forward ${JSON.stringify(file.replace(/\\/g, "/"))};`,
);
