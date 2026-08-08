// types.ts
export interface RGBColor {
	r: number;
	g: number;
	b: number;
}

export interface ModeData {
	name: string; // Mode name string value, including null termination[cite: 1]
	value: number; // Mode value field value[cite: 1]
	flags: number; // Mode flags field value[cite: 1]
	speedMin: number; // Mode speed_min field value[cite: 1]
	speedMax: number; // Mode speed_max field value[cite: 1]
	colorsMin: number; // Mode colors_min field value[cite: 1]
	colorsMax: number; // Mode colors_max field value[cite: 1]
	speed: number; // Mode speed value[cite: 1]
	direction: number; // Mode direction value[cite: 1]
	colorMode: number; // Mode color_mode value[cite: 1]
	colors: RGBColor[]; // Mode color values[cite: 1]
}

export interface ZoneData {
	name: string; // Zone name string value, including null termination[cite: 1]
	type: number; // Zone type value[cite: 1]
	ledsMin: number; // Zone leds_min value[cite: 1]
	ledsMax: number; // Zone leds_max value[cite: 1]
	ledsCount: number; // Zone leds_count value[cite: 1]
}

export interface LedData {
	name: string; // LED name string value, including null termination[cite: 1]
	value: number; // LED value field value[cite: 1]
}

export interface ControllerData {
	deviceId: number;
	type: number; // RGBController type field value[cite: 1]
	name: string; // RGBController name field string value[cite: 1]
	description: string; // RGBController description field string value[cite: 1]
	version: string; // RGBController version field string value[cite: 1]
	serial: string; // RGBController serial field string value[cite: 1]
	location: string; // RGBController location field string value[cite: 1]
	modes: ModeData[];
	zones: ZoneData[];
	leds: LedData[];
	colors: RGBColor[]; // RGBController colors field values[cite: 1]
}
