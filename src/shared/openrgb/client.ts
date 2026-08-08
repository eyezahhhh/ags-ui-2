// client.ts
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { DEFAULT_PORT, PKT_MAGIC, PacketId } from "./protocol.js";
import {
	ControllerData,
	LedData,
	ModeData,
	RGBColor,
	ZoneData,
} from "./types.js";
import { BufferReader, BufferWriter } from "./buffer.js";

export class OpenRGBClient {
	private readonly client: Gio.SocketClient;
	private connection: Gio.SocketConnection | null = null;
	private inputStream: Gio.DataInputStream | null = null;
	private outputStream: Gio.OutputStream | null = null;
	private serverProtocolVersion: number = 0;

	constructor() {
		this.client = new Gio.SocketClient();
	}

	/**
	 * Connects to the OpenRGB server.
	 */
	async connect(
		host: string = "127.0.0.1",
		port: number = DEFAULT_PORT,
	): Promise<void> {
		const address = Gio.NetworkAddress.new(host, port);

		return new Promise((resolve, reject) => {
			this.client.connect_async(address, null, (client, res) => {
				try {
					this.connection = client!.connect_finish(res);
					this.inputStream = Gio.DataInputStream.new(
						this.connection.get_input_stream(),
					);
					this.outputStream = this.connection.get_output_stream();

					// Request protocol version upon connection[cite: 1]
					this.negotiateProtocol().then(resolve).catch(reject);
				} catch (e) {
					reject(e);
				}
			});
		});
	}

	private async negotiateProtocol(): Promise<void> {
		const writer = new BufferWriter();
		writer.writeUInt32(3); // Request Protocol Version 3[cite: 1]

		await this.sendPacket(
			0,
			PacketId.REQUEST_PROTOCOL_VERSION,
			writer.toUint8Array(),
		);
		const response = await this.readPacket();

		const reader = new BufferReader(response.data);
		this.serverProtocolVersion = reader.readUInt32();

		// 🚨 CRITICAL FIX: The server will drop us if we don't set a client name
		await this.setClientName("AGS Client");
	}

	/**
	 * Send client name string to server[cite: 1].
	 */
	async setClientName(name: string): Promise<void> {
		const writer = new BufferWriter();
		writer.writeString(name); // writeString includes the null terminator[cite: 1]

		// The size of the packet is the size of the string including the null terminator[cite: 1]
		await this.sendPacket(0, PacketId.SET_CLIENT_NAME, writer.toUint8Array());
	}

	/**
	 * Sends a command packet to the server.
	 * Each packet starts with a header that indicates the packet is an OpenRGB SDK packet
	 * and provides the device and packet IDs[cite: 1].
	 */
	private async sendPacket(
		deviceId: number,
		packetId: PacketId,
		data: Uint8Array = new Uint8Array(0),
	): Promise<void> {
		const headerWriter = new BufferWriter();
		headerWriter.writeMagic(PKT_MAGIC); // Always set this to the literal value "ORGB"[cite: 1]
		headerWriter.writeUInt32(deviceId); // Device Index[cite: 1]
		headerWriter.writeUInt32(packetId); // Packet ID[cite: 1]
		headerWriter.writeUInt32(data.length); // Packet Size[cite: 1]

		const header = headerWriter.toUint8Array();
		const packet = new Uint8Array(header.length + data.length);
		packet.set(header);
		packet.set(data, header.length);

		return new Promise((resolve, reject) => {
			this.outputStream!.write_bytes_async(
				GLib.Bytes.new(packet),
				GLib.PRIORITY_DEFAULT,
				null,
				(stream, res) => {
					try {
						stream!.write_bytes_finish(res);
						resolve();
					} catch (e) {
						reject(e);
					}
				},
			);
		});
	}

	private async readPacket(): Promise<{
		deviceId: number;
		packetId: number;
		data: Uint8Array;
	}> {
		return new Promise((resolve, reject) => {
			// Read 16 byte header
			this.inputStream!.read_bytes_async(
				16,
				GLib.PRIORITY_DEFAULT,
				null,
				(stream, res) => {
					try {
						const headerBytes = stream!.read_bytes_finish(res).toArray();
						const headerReader = new BufferReader(new Uint8Array(headerBytes));

						headerReader.readUInt32(); // Skip magic
						const deviceId = headerReader.readUInt32();
						const packetId = headerReader.readUInt32();
						const dataSize = headerReader.readUInt32();

						if (dataSize === 0) {
							return resolve({ deviceId, packetId, data: new Uint8Array(0) });
						}

						// Read Payload
						this.inputStream!.read_bytes_async(
							dataSize,
							GLib.PRIORITY_DEFAULT,
							null,
							(stream2, res2) => {
								const payloadBytes = stream2!.read_bytes_finish(res2).toArray();
								resolve({
									deviceId,
									packetId,
									data: new Uint8Array(payloadBytes),
								});
							},
						);
					} catch (e) {
						reject(e);
					}
				},
			);
		});
	}

	/**
	 * Request the number of controllers on the server.
	 * The request contains no data.[cite: 1]
	 */
	async getControllerCount(): Promise<number> {
		await this.sendPacket(0, PacketId.REQUEST_CONTROLLER_COUNT);
		const response = await this.readPacket();
		const reader = new BufferReader(response.data);
		return reader.readUInt32(); // The response contains a single unsigned int[cite: 1]
	}

	/**
	 * Request the controller data for a given controller[cite: 1].
	 */
	async getControllerData(deviceId: number): Promise<ControllerData> {
		const writer = new BufferWriter();
		if (this.serverProtocolVersion >= 1) {
			writer.writeUInt32(0); // Protocol version
		}

		await this.sendPacket(
			deviceId,
			PacketId.REQUEST_CONTROLLER_DATA,
			writer.toUint8Array(),
		);
		const response = await this.readPacket();
		const reader = new BufferReader(response.data);

		reader.readUInt32(); // data_size[cite: 1]

		const type = reader.readInt32(); // RGBController type field value[cite: 1]
		const name = reader.readString(); // RGBController name field string value[cite: 1]

		// Protocol 1+ omits vendor reading here for simplicity if we requested protocol 0

		const description = reader.readString();
		const version = reader.readString();
		const serial = reader.readString();
		const location = reader.readString();

		const numModes = reader.readUInt16(); // Number of modes in RGBController[cite: 1]
		reader.readInt32(); // active_mode

		const modes: ModeData[] = [];
		for (let i = 0; i < numModes; i++) {
			const modeName = reader.readString();
			const modeValue = reader.readInt32();
			const modeFlags = reader.readUInt32();
			const speedMin = reader.readUInt32();
			const speedMax = reader.readUInt32();
			const colorsMin = reader.readUInt32();
			const colorsMax = reader.readUInt32();
			const speed = reader.readUInt32();
			const direction = reader.readUInt32();
			const colorMode = reader.readUInt32();
			const modeNumColors = reader.readUInt16(); // Mode number of colors[cite: 1]

			const modeColors: RGBColor[] = [];
			for (let j = 0; j < modeNumColors; j++)
				modeColors.push(reader.readColor());

			modes.push({
				name: modeName,
				value: modeValue,
				flags: modeFlags,
				speedMin,
				speedMax,
				colorsMin,
				colorsMax,
				speed,
				direction,
				colorMode,
				colors: modeColors,
			});
		}

		const numZones = reader.readUInt16(); // Number of zones in RGBController[cite: 1]
		const zones: ZoneData[] = [];
		for (let i = 0; i < numZones; i++) {
			const zoneName = reader.readString();
			const zoneType = reader.readInt32();
			const ledsMin = reader.readUInt32();
			const ledsMax = reader.readUInt32();
			const ledsCount = reader.readUInt32();
			const matrixLen = reader.readUInt16(); // Zone matrix length[cite: 1]

			// Skip matrix data for brevity based on matrixLen
			for (let j = 0; j < matrixLen; j += 2) reader.readUInt16();

			zones.push({
				name: zoneName,
				type: zoneType,
				ledsMin,
				ledsMax,
				ledsCount,
			});
		}

		const numLeds = reader.readUInt16(); // Number of LEDs in RGBController[cite: 1]
		const leds: LedData[] = [];
		for (let i = 0; i < numLeds; i++) {
			leds.push({ name: reader.readString(), value: reader.readUInt32() });
		}

		const numColors = reader.readUInt16();
		const colors: RGBColor[] = [];
		for (let i = 0; i < numColors; i++) {
			colors.push(reader.readColor());
		}

		return {
			deviceId,
			type,
			name,
			description,
			version,
			serial,
			location,
			modes,
			zones,
			leds,
			colors,
		};
	}

	/**
	 * Updates all LEDs on a device to specific colors.
	 * The pkt_dev_idx of this request's header indicates which controller you are calling UpdateLEDs() on[cite: 1].
	 */
	async applySolidColors(deviceId: number, colors: RGBColor[]): Promise<void> {
		const writer = new BufferWriter();

		const dataSize = 4 + 2 + 4 * colors.length;
		writer.writeUInt32(dataSize); // Size of all data in packet[cite: 1]
		writer.writeUInt16(colors.length); // Number of color values in packet[cite: 1]

		for (const color of colors) {
			writer.writeColor(color); // Color values for each LED in device[cite: 1]
		}

		await this.sendPacket(
			deviceId,
			PacketId.RGBCONTROLLER_UPDATELEDS,
			writer.toUint8Array(),
		);
	}
}
