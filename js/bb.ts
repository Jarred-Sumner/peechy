let int32 = new Int32Array(1);
let float32 = new Float32Array(int32.buffer);
let int16 = new Int16Array(int32.buffer);
let uint16 = new Uint16Array(int32.buffer);
let uint32 = new Uint32Array(int32.buffer);
let uint8Buffer = new Uint8Array(int32.buffer);
let int8Buffer = new Int8Array(int32.buffer);

export let ArrayBufferType =
  typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;

export class ByteBuffer {
  private _data: Uint8Array;
  private _index: number;
  length: number;

  constructor(data?: Uint8Array, addViews = false) {
    if (data && !(data instanceof Uint8Array)) {
      throw new Error("Must initialize a ByteBuffer with a Uint8Array");
    }
    this._data = data || new Uint8Array(256);
    this._index = 0;
    this.length = data ? data.length : 0;
  }

  toUint8Array(): Uint8Array {
    return this._data.subarray(0, this.length);
  }

  readByte(): number {
    //#ifdef ASSERTIONS
    if (this._index + 1 > this._data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    return this._data[this._index++];
  }

  readFloat32(): number {
    //#ifdef ASSERTIONS
    if (this._index + 4 > this._data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    // TODO: see if DataView is faster
    uint8Buffer[0] = this._data[this._index++];
    uint8Buffer[1] = this._data[this._index++];
    uint8Buffer[2] = this._data[this._index++];
    uint8Buffer[3] = this._data[this._index++];
    return float32[0];
  }

  readByteArray(): Uint8Array {
    let length = this.readVarUint();
    let start = this._index;
    let end = start + length;
    //#ifdef ASSERTIONS
    if (end > this._data.length) {
      throw new Error("Read array out of bounds");
    }
    //#endif
    this._index = end;
    // Copy into a new array instead of just creating another view.
    let result = new Uint8Array(new ArrayBufferType(length));
    result.set(this._data.subarray(start, end));
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
    let index = this._index;
    let data = this._data;
    let length = data.length;

    //#ifdef ASSERTIONS
    // Optimization: use a single byte to store zero
    if (index + 1 > length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    let first = data[index];
    if (first === 0) {
      this._index = index + 1;
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
    this._index = index + 4;

    // Move the exponent back into place
    bits = (bits << 23) | (bits >>> 9);

    // Reinterpret as a floating-point number
    int32[0] = bits;
    return float32[0];
  }

  readUint32(): number {
    //#ifdef ASSERTIONS
    if (this._index + 4 > this._data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    // TODO: see if DataView is faster
    uint8Buffer[0] = this._data[this._index++];
    uint8Buffer[1] = this._data[this._index++];
    uint8Buffer[2] = this._data[this._index++];
    uint8Buffer[3] = this._data[this._index++];
    return uint32[0];
  }

  readUint16(): number {
    //#ifdef ASSERTIONS
    if (this._index + 2 > this._data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    // TODO: see if DataView is faster
    uint8Buffer[0] = this._data[this._index++];
    uint8Buffer[1] = this._data[this._index++];
    return uint16[0];
  }

  readVarUint(): number {
    let value = 0;
    let shift = 0;
    do {
      var byte = this.readByte();
      value |= (byte & 127) << shift;
      shift += 7;
    } while (byte & 128 && shift < 35);
    return value >>> 0;
  }

  readInt32(): number {
    //#ifdef ASSERTIONS
    if (this._index + 4 > this._data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    // TODO: see if DataView is faster
    uint8Buffer[0] = this._data[this._index++];
    uint8Buffer[1] = this._data[this._index++];
    uint8Buffer[2] = this._data[this._index++];
    uint8Buffer[3] = this._data[this._index++];
    return int32[0];
  }

  readInt16(): number {
    //#ifdef ASSERTIONS
    if (this._index + 2 > this._data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    // TODO: see if DataView is faster
    uint8Buffer[0] = this._data[this._index++];
    uint8Buffer[1] = this._data[this._index++];
    return int16[0];
  }

  readInt8(): number {
    //#ifdef ASSERTIONS
    if (this._index + 1 > this._data.length) {
      throw new Error("Index out of bounds");
    }
    //#endif
    // TODO: see if DataView is faster
    uint8Buffer[0] = this._data[this._index++];
    return int8Buffer[0];
  }

  readVarInt(): number {
    let value = this.readVarUint() | 0;
    return value & 1 ? ~(value >>> 1) : value >>> 1;
  }

  readString(): string {
    let result = "";

    while (true) {
      let codePoint;

      // Decode UTF-8
      let a = this.readByte();
      if (a < 0xc0) {
        codePoint = a;
      } else {
        let b = this.readByte();
        if (a < 0xe0) {
          codePoint = ((a & 0x1f) << 6) | (b & 0x3f);
        } else {
          let c = this.readByte();
          if (a < 0xf0) {
            codePoint = ((a & 0x0f) << 12) | ((b & 0x3f) << 6) | (c & 0x3f);
          } else {
            let d = this.readByte();
            codePoint =
              ((a & 0x07) << 18) |
              ((b & 0x3f) << 12) |
              ((c & 0x3f) << 6) |
              (d & 0x3f);
          }
        }
      }

      // Strings are null-terminated
      if (codePoint === 0) {
        break;
      }

      // Encode UTF-16
      if (codePoint < 0x10000) {
        result += String.fromCharCode(codePoint);
      } else {
        codePoint -= 0x10000;
        result += String.fromCharCode(
          (codePoint >> 10) + 0xd800,
          (codePoint & ((1 << 10) - 1)) + 0xdc00
        );
      }
    }

    return result;
  }

  static WIGGLE_ROOM = 1;

  private _growBy(amount: number): void {
    if (this.length + amount > this._data.length) {
      let data = new Uint8Array(
        Math.imul(this.length + amount, ByteBuffer.WIGGLE_ROOM) << 1
      );
      data.set(this._data);
      this._data = data;
    }
    this.length += amount;
  }

  writeByte(value: number): void {
    let index = this.length;
    this._growBy(1);
    this._data[index] = value;
  }

  writeByteArray(value: Uint8Array): void {
    this.writeVarUint(value.length);
    let index = this.length;
    this._growBy(value.length);
    this._data.set(value, index);
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
    let data = this._data;
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
    this._data.set(uint8Buffer, index);
  }

  writeVarUint(value: number): void {
    do {
      let byte = value & 127;
      value >>>= 7;
      this.writeByte(value ? byte | 128 : byte);
    } while (value);
  }

  writeUint16(value: number): void {
    let index = this.length;
    this._growBy(2);
    // TODO: see if DataView is faster
    uint16[0] = value;
    this._data[index++] = uint8Buffer[0];
    this._data[index++] = uint8Buffer[1];
  }

  writeUint32(value: number): void {
    let index = this.length;
    this._growBy(4);
    uint32[0] = value;
    this._data.set(uint8Buffer, index);
  }

  writeVarInt(value: number): void {
    this.writeVarUint((value << 1) ^ (value >> 31));
  }

  writeInt8(value: number): void {
    let index = this.length;
    this._growBy(1);
    // TODO: see if DataView is faster
    int8Buffer[0] = value;
    this._data[index++] = uint8Buffer[0];
  }

  writeInt16(value: number): void {
    let index = this.length;
    this._growBy(2);
    // TODO: see if DataView is faster
    int16[0] = value;
    this._data[index++] = uint8Buffer[0];
    this._data[index++] = uint8Buffer[1];
  }

  writeInt32(value: number): void {
    let index = this.length;
    this._growBy(4);
    int32[0] = value;
    this._data.set(uint8Buffer, index);
  }

  static LOW_PRECISION_VALUE = 10 ** 3;

  writeLowPrecisionFloat(value: number) {
    this.writeVarInt(Math.round(ByteBuffer.LOW_PRECISION_VALUE * value));
  }

  readLowPrecisionFloat() {
    return this.readVarInt() / ByteBuffer.LOW_PRECISION_VALUE;
  }

  writeString(value: string): void {
    let codePoint;

    for (let i = 0; i < value.length; i++) {
      // Decode UTF-16
      let a = value.charCodeAt(i);
      if (i + 1 === value.length || a < 0xd800 || a >= 0xdc00) {
        codePoint = a;
      } else {
        let b = value.charCodeAt(++i);
        codePoint = (a << 10) + b + (0x10000 - (0xd800 << 10) - 0xdc00);
      }

      // Strings are null-terminated
      if (codePoint === 0) {
        throw new Error("Cannot encode a string containing the null character");
      }

      // Encode UTF-8
      if (codePoint < 0x80) {
        this.writeByte(codePoint);
      } else {
        if (codePoint < 0x800) {
          this.writeByte(((codePoint >> 6) & 0x1f) | 0xc0);
        } else {
          if (codePoint < 0x10000) {
            this.writeByte(((codePoint >> 12) & 0x0f) | 0xe0);
          } else {
            this.writeByte(((codePoint >> 18) & 0x07) | 0xf0);
            this.writeByte(((codePoint >> 12) & 0x3f) | 0x80);
          }
          this.writeByte(((codePoint >> 6) & 0x3f) | 0x80);
        }
        this.writeByte((codePoint & 0x3f) | 0x80);
      }
    }

    // Strings are null-terminated
    this.writeByte(0);
  }
}
