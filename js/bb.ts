let int32 = new Int32Array(1);
let float32 = new Float32Array(int32.buffer);
let int16 = new Int16Array(int32.buffer);
let uint16 = new Uint16Array(int32.buffer);
let uint32 = new Uint32Array(int32.buffer);
let uint8Buffer = new Uint8Array(int32.buffer);
let int8Buffer = new Int8Array(int32.buffer);

let textDecoder: TextDecoder;
let textEncoder: TextEncoder;

let ArrayBufferType =
  typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;
export class ByteBuffer {
  data: Uint8Array;
  index: number;
  length: number;

  constructor(data?: Uint8Array, addViews = false) {
    if (data && !(data instanceof Uint8Array)) {
      throw new Error("Must initialize a ByteBuffer with a Uint8Array");
    }
    this.data = data || new Uint8Array(256);
    this.index = 0;
    this.length = data ? data.length : 0;
  }

  toUint8Array(): Uint8Array {
    return this.data.subarray(0, this.length);
  }

  readByte(): number {
    //#ifdef ASSERTIONS
    if (this.index + 1 > this.data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    return this.data[this.index++];
  }

  readAlphanumeric(): string {
    if (!textDecoder) {
      textDecoder = new TextDecoder("utf-8");
    }

    let start = this.index;
    let char = 256;
    const end = this.length - 1;
    while (this.index < end && char > 0) {
      char = this.data[this.index++];
    }

    return String.fromCharCode(...this.data.subarray(start, this.index - 1));
  }

  writeAlphanumeric(contents: string) {
    //#ifdef ASSERTIONS
    if (this.length + 1 > this.data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif

    let index = this.length;
    this._growBy(contents.length);
    const data = this.data;
    let i = 0;
    let code = 0;
    while (i < contents.length) {
      code = data[index++] = contents.charCodeAt(i++);
      if (code > 127)
        throw new Error(`Non-ascii character at char ${i - 1} :${contents}`);
    }

    this.writeByte(0);
  }

  readFloat32(): number {
    //#ifdef ASSERTIONS
    if (this.index + 4 > this.data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    // TODO: see if DataView is faster
    uint8Buffer[0] = this.data[this.index++];
    uint8Buffer[1] = this.data[this.index++];
    uint8Buffer[2] = this.data[this.index++];
    uint8Buffer[3] = this.data[this.index++];
    return float32[0];
  }

  readByteArray(): Uint8Array {
    let length = this.readVarUint();
    let start = this.index;
    let end = start + length;
    //#ifdef ASSERTIONS
    if (end > this.data.length) {
      throw new Error("Read array out of bounds");
    }
    //#endif
    this.index = end;
    // Copy into a new array instead of just creating another view.
    let result = new Uint8Array(new ArrayBufferType(length));
    result.set(this.data.subarray(start, end));
    return result;
  }

  readUint32ByteArray(): Uint32Array {
    const array = this.readByteArray();
    return new Uint32Array(
      array.buffer,
      0,
      array.length / Uint32Array.BYTES_PER_ELEMENT
    );
  }

  readInt8ByteArray(): Int8Array {
    const array = this.readByteArray();
    return new Int8Array(
      array.buffer,
      0,
      array.length / Int8Array.BYTES_PER_ELEMENT
    );
  }

  readInt16ByteArray(): Int16Array {
    const array = this.readByteArray();
    return new Int16Array(
      array.buffer,
      0,
      array.length / Int16Array.BYTES_PER_ELEMENT
    );
  }

  readInt32ByteArray(): Int32Array {
    const array = this.readByteArray();
    return new Int32Array(
      array.buffer,
      0,
      array.length / Int32Array.BYTES_PER_ELEMENT
    );
  }

  readFloat32ByteArray(): Float32Array {
    const array = this.readByteArray();
    return new Float32Array(
      array.buffer,
      0,
      array.length / Float32Array.BYTES_PER_ELEMENT
    );
  }

  readVarFloat(): number {
    let index = this.index;
    let data = this.data;
    let length = data.length;

    //#ifdef ASSERTIONS
    // Optimization: use a single byte to store zero
    if (index + 1 > length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    let first = data[index];
    if (first === 0) {
      this.index = index + 1;
      return 0;
    }

    // Endian-independent 32-bit read
    if (index + 4 > length) {
      throw new Error("Index out of bounds");
    }
    let bits =
      first |
      (data[index + 1] << 8) |
      (data[index + 2] << 16) |
      (data[index + 3] << 24);
    this.index = index + 4;

    // Move the exponent back into place
    bits = (bits << 23) | (bits >>> 9);

    // Reinterpret as a floating-point number
    int32[0] = bits;
    return float32[0];
  }

  readUint32(): number {
    //#ifdef ASSERTIONS
    if (this.index + 4 > this.data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    // TODO: see if DataView is faster
    uint8Buffer[0] = this.data[this.index++];
    uint8Buffer[1] = this.data[this.index++];
    uint8Buffer[2] = this.data[this.index++];
    uint8Buffer[3] = this.data[this.index++];
    return uint32[0];
  }

  readUint16(): number {
    //#ifdef ASSERTIONS
    if (this.index + 2 > this.data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    // TODO: see if DataView is faster
    uint8Buffer[0] = this.data[this.index++];
    uint8Buffer[1] = this.data[this.index++];
    return uint16[0];
  }

  // This is no longer var uint because the use-case changed and I haven't had time to update all the references
  // This is a uint32 for performance reasons. var uint is very cheap in Go/native languages but very expensive in JavaScript
  // So we opt for the easy route.
  readVarUint(): number {
    return this.readUint32();
    // let value = 0;
    // let shift = 0;
    // do {
    //   var byte = this.readByte();
    //   value |= (byte & 127) << shift;
    //   shift += 7;
    // } while (byte & 128 && shift < 35);
    // return value >>> 0;
  }

  readInt32(): number {
    //#ifdef ASSERTIONS
    if (this.index + 4 > this.data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    // TODO: see if DataView is faster
    uint8Buffer[0] = this.data[this.index++];
    uint8Buffer[1] = this.data[this.index++];
    uint8Buffer[2] = this.data[this.index++];
    uint8Buffer[3] = this.data[this.index++];
    return int32[0];
  }

  readInt16(): number {
    //#ifdef ASSERTIONS
    if (this.index + 2 > this.data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    // TODO: see if DataView is faster
    uint8Buffer[0] = this.data[this.index++];
    uint8Buffer[1] = this.data[this.index++];
    return int16[0];
  }

  readInt8(): number {
    //#ifdef ASSERTIONS
    if (this.index + 1 > this.data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    // TODO: see if DataView is faster
    uint8Buffer[0] = this.data[this.index++];
    return int8Buffer[0];
  }

  readVarInt(): number {
    return this.readInt32();
  }

  // This is not a null-terminated string.
  readString(): string {
    const length = this.readVarUint();
    let start = this.index;
    this.index += length;
    if (!textDecoder) {
      textDecoder = new TextDecoder("utf8");
    }

    return textDecoder.decode(this.data.subarray(start, this.index));
  }

  static WIGGLE_ROOM = 1;

  private _growBy(amount: number): void {
    if (this.length + amount > this.data.length) {
      let data = new Uint8Array(
        Math.imul(this.length + amount, ByteBuffer.WIGGLE_ROOM) << 1
      );
      data.set(this.data);
      this.data = data;
    }
    this.length += amount;
  }

  writeByte(value: number): void {
    let index = this.length;
    this._growBy(1);
    this.data[index] = value;
  }

  writeByteArray(value: Uint8Array): void {
    this.writeVarUint(value.length);
    let index = this.length;
    this._growBy(value.length);
    this.data.set(value, index);
  }

  writeUint16ByteArray(value: Uint16Array): void {
    this.writeByteArray(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    );
  }

  writeUint32ByteArray(value: Uint32Array): void {
    this.writeByteArray(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    );
  }

  writeInt8ByteArray(value: Int8Array): void {
    this.writeByteArray(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    );
  }

  writeInt16ByteArray(value: Int16Array): void {
    this.writeByteArray(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    );
  }

  writeInt32ByteArray(value: Int32Array): void {
    this.writeByteArray(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    );
  }

  writeFloat32Array(value: Float32Array): void {
    this.writeByteArray(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    );
  }

  writeVarFloat(value: number): void {
    let index = this.length;

    // Reinterpret as an integer
    float32[0] = value;
    let bits = int32[0];

    // Move the exponent to the first 8 bits
    bits = (bits >>> 23) | (bits << 9);

    // Optimization: use a single byte to store zero and denormals (check for an exponent of 0)
    if ((bits & 255) === 0) {
      this.writeByte(0);
      return;
    }

    // Endian-independent 32-bit write
    this._growBy(4);
    let data = this.data;
    data[index] = bits;
    data[index + 1] = bits >> 8;
    data[index + 2] = bits >> 16;
    data[index + 3] = bits >> 24;
  }

  writeFloat32(value: number): void {
    let index = this.length;
    this._growBy(4);
    float32[0] = value;
    // TODO: see if DataView is faster
    this.data.set(uint8Buffer, index);
  }

  writeVarUint(value: number): void {
    this.writeUint32(value);
    // do {
    //   let byte = value & 127;
    //   value >>>= 7;
    //   this.writeByte(value ? byte | 128 : byte);
    // } while (value);
  }

  writeUint16(value: number): void {
    let index = this.length;
    this._growBy(2);
    // TODO: see if DataView is faster
    uint16[0] = value;
    this.data[index++] = uint8Buffer[0];
    this.data[index++] = uint8Buffer[1];
  }

  writeUint32(value: number): void {
    let index = this.length;
    this._growBy(4);
    uint32[0] = value;
    this.data.set(uint8Buffer, index);
  }

  writeVarInt(value: number): void {
    this.writeInt32(value);
    // this.writeVarUint((value << 1) ^ (value >> 31));
  }

  writeInt8(value: number): void {
    let index = this.length;
    this._growBy(1);
    // TODO: see if DataView is faster
    int8Buffer[0] = value;
    this.data[index++] = uint8Buffer[0];
  }

  writeInt16(value: number): void {
    let index = this.length;
    this._growBy(2);
    // TODO: see if DataView is faster
    int16[0] = value;
    this.data[index++] = uint8Buffer[0];
    this.data[index++] = uint8Buffer[1];
  }

  writeInt32(value: number): void {
    let index = this.length;
    this._growBy(4);
    int32[0] = value;
    this.data.set(uint8Buffer, index);
  }

  static LOW_PRECISION_VALUE = 10 ** 3;

  writeLowPrecisionFloat(value: number) {
    this.writeVarInt(Math.round(ByteBuffer.LOW_PRECISION_VALUE * value));
  }

  readLowPrecisionFloat() {
    return this.readVarInt() / ByteBuffer.LOW_PRECISION_VALUE;
  }

  writeString(value: string): void {
    // length in bytes, not codepoints!
    // the reason for that is to minimize allocations
    var initial_offset = this.length;
    this.writeVarUint(value.length);

    if (!textEncoder) {
      textEncoder = new TextEncoder();
    }

    const offset = this.length;
    // https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/encodeInto#buffer_sizing
    this._growBy(value.length * 2 + 5);

    const result = textEncoder.encodeInto(value, this.data.subarray(offset));
    this.length = offset + result.written;

    // If our guess was incorrect, let's go back and fix it.
    if (result.written !== value.length) {
      uint32[0] = result.written;
      this.data[initial_offset++] = uint8Buffer[0];
      this.data[initial_offset++] = uint8Buffer[1];
      this.data[initial_offset++] = uint8Buffer[2];
      this.data[initial_offset++] = uint8Buffer[3];
    }
  }
}
