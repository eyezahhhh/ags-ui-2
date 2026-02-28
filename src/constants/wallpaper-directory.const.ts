// @ts-nocheck

import { WORKING_DIRECTORY } from "./working-directory.const";

export const WALLPAPER_DIRECTORY =
	typeof WALLPAPER_DIR == "string"
		? WALLPAPER_DIR
		: `${WORKING_DIRECTORY}/example-wallpapers`;
