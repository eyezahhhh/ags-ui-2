import { RGBColor } from "./types";

// buffer.ts
export class BufferReader {
	private view: DataView;
	private offset: number = 0;

	constructor(buffer: Uint8Array) {
		this.view = new DataView(
			buffer.buffer,
			buffer.byteOffset,
			buffer.byteLength,
		);
	}

	readUInt32(): number {
		const val = this.view.getUint32(this.offset, true); // Little endian
		this.offset += 4;
		return val;
	}

	readUInt16(): number {
		const val = this.view.getUint16(this.offset, true);
		this.offset += 2;
		return val;
	}

	readInt32(): number {
		const val = this.view.getInt32(this.offset, true);
		this.offset += 4;
		return val;
	}

	readString(): string {
		const len = this.readUInt16(); // Length of string, including null termination[cite: 1]
		if (len === 0) return "";
		const bytes = new Uint8Array(
			this.view.buffer,
			this.view.byteOffset + this.offset,
			len - 1,
		);
		this.offset += len;
		return new TextDecoder().decode(bytes);
	}

	readColor(): RGBColor {
		// OpenRGB colors are 4 bytes[cite: 1]
		const r = this.view.getUint8(this.offset++);
		const g = this.view.getUint8(this.offset++);
		const b = this.view.getUint8(this.offset++);
		this.offset++; // Skip dummy/alpha byte
		return { r, g, b };
	}
}

export class BufferWriter {
	private buffer: number[] = [];

	writeString(str: string) {
		const bytes = new TextEncoder().encode(str);
		// Size of the packet is the size of the string including the null terminator[cite: 1]
		this.buffer.push(...bytes, 0);
	}

	writeUInt32(val: number) {
		this.buffer.push(
			val & 0xff,
			(val >> 8) & 0xff,
			(val >> 16) & 0xff,
			(val >> 24) & 0xff,
		);
	}

	writeUInt16(val: number) {
		this.buffer.push(val & 0xff, (val >> 8) & 0xff);
	}

	writeColor(color: RGBColor) {
		this.buffer.push(color.r, color.g, color.b, 0);
	}

	toUint8Array(): Uint8Array {
		return new Uint8Array(this.buffer);
	}

	writeMagic(magic: string) {
		const bytes = new TextEncoder().encode(magic);
		this.buffer.push(...bytes);
	}
}
