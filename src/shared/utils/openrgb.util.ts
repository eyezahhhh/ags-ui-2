import { ControllerData, RGBColor } from "shared/openrgb/types";

export function generateDeviceId(controller: ControllerData): string {
	if (controller.serial && controller.serial.length > 3) {
		return controller.serial;
	}
	return `${controller.name}-${controller.location}`.replace(/\s+/g, "_");
}

export function hexToRGB(hex: string): RGBColor {
	let cleanHex = hex.replace(/^#/, "").trim();

	if (cleanHex.length === 3) {
		cleanHex = cleanHex
			.split("")
			.map((char) => char + char)
			.join("");
	}

	const num = parseInt(cleanHex, 16);

	if (cleanHex.length !== 6 || isNaN(num)) {
		console.warn(
			`[OpenRGB] Invalid hex color string: "${hex}". Defaulting to black.`,
		);
		return { r: 0, g: 0, b: 0 };
	}

	return {
		r: (num >> 16) & 0xff,
		g: (num >> 8) & 0xff,
		b: num & 0xff,
	};
}
