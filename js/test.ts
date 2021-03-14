import type {ByteBuffer} from "peechy";

export namespace test {
type byte = number;
type float = number;
type int = number;
type uint = number;
type int8 = number;
type lowp = number;
type int16 = number;
type int32 = number;
type float32 = number;
type uint16 = number;
type uint32 = number;
  export enum Enum {
    A = 100,
    B = 200
  }
  export const EnumKeys = {
    100: "A",
    A: "A",
    200: "B",
    B: "B"
  }
  export enum TestUnionType {
    SortedStruct = 1,
    DeprecatedMessage = 2
  }
  export const TestUnionKeys = {
    1: "SortedStruct",
    SortedStruct: "SortedStruct",
    2: "DeprecatedMessage",
    DeprecatedMessage: "DeprecatedMessage"
  }
  export enum TestUnion2Type {
    Float32ArrayMessage = 1,
    Int16ArrayMessage = 2
  }
  export const TestUnion2Keys = {
    1: "Float32ArrayMessage",
    Float32ArrayMessage: "Float32ArrayMessage",
    2: "Int16ArrayMessage",
    Int16ArrayMessage: "Int16ArrayMessage"
  }
  export enum NestedUnionType {
    TestUnion = 1,
    TestUnion2 = 2
  }
  export const NestedUnionKeys = {
    1: "TestUnion",
    TestUnion: "TestUnion",
    2: "TestUnion2",
    TestUnion2: "TestUnion2"
  }
  export enum PlayerUpdateType {
    PositionUpdate = 1,
    DirectionUpdate = 2,
    NameChange = 3
  }
  export const PlayerUpdateKeys = {
    1: "PositionUpdate",
    PositionUpdate: "PositionUpdate",
    2: "DirectionUpdate",
    DirectionUpdate: "DirectionUpdate",
    3: "NameChange",
    NameChange: "NameChange"
  }
  export type ID = string;
  export interface EnumStruct {
    x: Enum;
    y: Enum[];
  }

  export interface BoolStruct {
    x: boolean;
  }

  export interface ByteStruct {
    x: byte;
  }

  export interface IntStruct {
    x: int;
  }

  export interface UintStruct {
    x: uint;
  }

  export interface FloatStruct {
    x: float;
  }

  export interface StringStruct {
    x: string;
  }

  export interface CompoundStruct {
    x: uint;
    y: uint;
  }

  export interface NestedStruct {
    a: uint;
    b: CompoundStruct;
    c: uint;
  }

  export interface BoolMessage {
    x?: boolean;
  }

  export interface ByteMessage {
    x?: byte;
  }

  export interface IntMessage {
    x?: int;
  }

  export interface UintMessage {
    x?: uint;
  }

  export interface FloatMessage {
    x?: float;
  }

  export interface CompoundMessage {
    x?: uint;
    y?: uint;
  }

  export interface NestedMessage {
    a?: uint;
    b?: CompoundMessage;
    c?: uint;
  }

  export interface NestedMessageWithRequiredFields {
    a?: uint;
    b: CompoundMessage;
    c?: uint;
  }

  export interface Int8Message {
    x?: int8;
  }

  export interface Int16Message {
    x?: int16;
  }

  export interface Int32Message {
    x?: int32;
  }

  export interface Uint16Message {
    x?: uint16;
  }

  export interface Uint32Message {
    x?: uint32;
  }

  export interface Float32Message {
    x?: float32;
  }

  export interface StringMessage {
    x?: string;
  }

  export interface Int8ArrayMessage {
    x?: Int8Array;
  }

  export interface Int16ArrayMessage {
    x?: Int16Array;
  }

  export interface Int32ArrayMessage {
    x?: Int32Array;
  }

  export interface Uint16ArrayMessage {
    x?: Uint16Array;
  }

  export interface Uint32ArrayMessage {
    x?: Uint32Array;
  }

  export interface Float32ArrayMessage {
    x?: Float32Array;
  }

  export interface Int8Struct {
    x: int8;
  }

  export interface Int16Struct {
    x: int16;
  }

  export interface Int32Struct {
    x: int32;
  }

  export interface Uint16Struct {
    x: uint16;
  }

  export interface Uint32Struct {
    x: uint32;
  }

  export interface Float32Struct {
    x: float32;
  }

  export interface Int8ArrayStruct {
    x: Int8Array;
  }

  export interface Int16ArrayStruct {
    x: Int16Array;
  }

  export interface Int32ArrayStruct {
    x: Int32Array;
  }

  export interface Uint16ArrayStruct {
    x: Uint16Array;
  }

  export interface Uint32ArrayStruct {
    x: Uint32Array;
  }

  export interface Float32ArrayStruct {
    x: Float32Array;
  }

  export interface BoolArrayStruct {
    x: boolean[];
  }

  export interface ByteArrayStruct {
    x: Uint8Array;
  }

  export interface IntArrayStruct {
    x: int[];
  }

  export interface UintArrayStruct {
    x: uint[];
  }

  export interface FloatArrayStruct {
    x: float[];
  }

  export interface StringArrayStruct {
    x: string[];
  }

  export interface CompoundArrayStruct {
    x: uint[];
    y: uint[];
  }

  export interface BoolArrayMessage {
    x?: boolean[];
  }

  export interface ByteArrayMessage {
    x?: Uint8Array;
  }

  export interface IntArrayMessage {
    x?: int[];
  }

  export interface UintArrayMessage {
    x?: uint[];
  }

  export interface FloatArrayMessage {
    x?: float[];
  }

  export interface StringArrayMessage {
    x?: string[];
  }

  export interface CompoundArrayMessage {
    x?: uint[];
    y?: uint[];
  }

  export interface RecursiveMessage {
    x?: RecursiveMessage;
  }

  export interface NonDeprecatedMessage {
    a?: uint;
    b?: uint;
    c?: uint[];
    d?: uint[];
    e?: ByteStruct;
    f?: ByteStruct;
    g?: uint;
  }

  export interface DeprecatedMessage<U0 extends (TestUnionType.DeprecatedMessage | undefined) = undefined> {
    type: U0;
    a?: uint;
    c?: uint[];
    e?: ByteStruct;
    g?: uint;
  }

  export interface SortedStruct<U0 extends (TestUnionType.SortedStruct | undefined) = undefined> {
    type: U0;
    a1: boolean;
    b1: byte;
    c1: int;
    d1: uint;
    e1: float;
    f1: string;
    a2: boolean;
    b2: byte;
    c2: int;
    d2: uint;
    e2: float;
    f2: string;
    a3: boolean[];
    b3: Uint8Array;
    c3: int[];
    d3: uint[];
    e3: float[];
    f3: string[];
  }

  export type TestUnion = 
    |  SortedStruct<TestUnionType.SortedStruct> 
    |  DeprecatedMessage<TestUnionType.DeprecatedMessage> ;
  export type TestUnion2 = 
    |  Float32ArrayMessage
    |  Int16ArrayMessage;
  export type NestedUnion = 
    |  TestUnion
    |  TestUnion2;
type NestedUnionFloat32ArrayMessageDiscriminator = { TestUnion2Type: TestUnion2Type.Float32ArrayMessage; TestUnion2: Float32ArrayMessage; }
type NestedUnionInt16ArrayMessageDiscriminator = { TestUnion2Type: TestUnion2Type.Int16ArrayMessage; TestUnion2: Int16ArrayMessage; }
export type NestedUnion = AbstractNestedUnion & ( NestedUnionFloat32ArrayMessageDiscriminator | NestedUnionInt16ArrayMessageDiscriminator );
  interface AbstractMultiUnion {
    test0: TestUnion;
    test1: TestUnion2;
    test2: NestedUnion;
  }

type MultiUnionFloat32ArrayMessageDiscriminator = { test1Type: TestUnion2Type.Float32ArrayMessage; test1: Float32ArrayMessage; }
type MultiUnionInt16ArrayMessageDiscriminator = { test1Type: TestUnion2Type.Int16ArrayMessage; test1: Int16ArrayMessage; }
type MultiUnionTestUnionDiscriminator = { test2Type: NestedUnionType.TestUnion; test2: TestUnion; }
type MultiUnionTestUnion2Discriminator = { test2Type: NestedUnionType.TestUnion2; test2: TestUnion2; }
export type MultiUnion = AbstractMultiUnion & ( MultiUnionFloat32ArrayMessageDiscriminator | MultiUnionInt16ArrayMessageDiscriminator ) & ( MultiUnionTestUnionDiscriminator | MultiUnionTestUnion2Discriminator );
  interface AbstractStructWithUnion {
    ping: TestUnion;
  }

export interface StructWithUnion extends AbstractStructWithUnion {};
  interface AbstractStructWithMultipleUnions {
    ping: TestUnion;
    array: TestUnion2;
  }

type StructWithMultipleUnionsFloat32ArrayMessageDiscriminator = { arrayType: TestUnion2Type.Float32ArrayMessage; array: Float32ArrayMessage; }
type StructWithMultipleUnionsInt16ArrayMessageDiscriminator = { arrayType: TestUnion2Type.Int16ArrayMessage; array: Int16ArrayMessage; }
export type StructWithMultipleUnions = AbstractStructWithMultipleUnions & ( StructWithMultipleUnionsFloat32ArrayMessageDiscriminator | StructWithMultipleUnionsInt16ArrayMessageDiscriminator );
  interface AbstractStructUnionArray {
    ping: TestUnion[];
  }

export interface StructUnionArray extends AbstractStructUnionArray {};
  export interface Vector3 {
    x: float;
    y: float;
    z: float;
  }

  export interface Player {
    x: float;
    y: float;
    z: float;
    magnitude: float;
    directionX: float;
    directionY: float;
    directionZ: float;
    onGround: boolean;
    username: string;
  }

  export type PlayerUpdate = 
    |  PositionUpdate
    |  DirectionUpdate
    |  NameChange;
  export interface Position {
    id: ID;
  }

  export interface FakeImportStruct {
    x: float;
    y: float;
    z: float;
  }

  export interface Rotation {
    heading: float;
    pitch: float;
    imported: FakeImportStruct;
  }

  export interface PositionPlusRotation {
    heading: float;
    pitch: float;
    imported: FakeImportStruct;
    id: ID;
  }

  export interface LowpValue {
    x: lowp;
    y: lowp;
    z: lowp;
  }

  export interface Vector2 {
    x: float;
    y: float;
  }

  export interface PositionUpdate {
    x: float;
    y: float;
    z: float;
    onGround: boolean;
  }

  export interface DirectionUpdate {
    directionX: float;
    directionY: float;
    directionZ: float;
    magnitude: float;
  }

  export interface NameChange {
    username: string;
  }

  export declare function  encodeEnumStruct(message: EnumStruct, bb: ByteBuffer): void;
  export declare function decodeEnumStruct(buffer: ByteBuffer): EnumStruct;
  export declare function  encodeBoolStruct(message: BoolStruct, bb: ByteBuffer): void;
  export declare function decodeBoolStruct(buffer: ByteBuffer): BoolStruct;
  export declare function  encodeByteStruct(message: ByteStruct, bb: ByteBuffer): void;
  export declare function decodeByteStruct(buffer: ByteBuffer): ByteStruct;
  export declare function  encodeIntStruct(message: IntStruct, bb: ByteBuffer): void;
  export declare function decodeIntStruct(buffer: ByteBuffer): IntStruct;
  export declare function  encodeUintStruct(message: UintStruct, bb: ByteBuffer): void;
  export declare function decodeUintStruct(buffer: ByteBuffer): UintStruct;
  export declare function  encodeFloatStruct(message: FloatStruct, bb: ByteBuffer): void;
  export declare function decodeFloatStruct(buffer: ByteBuffer): FloatStruct;
  export declare function  encodeStringStruct(message: StringStruct, bb: ByteBuffer): void;
  export declare function decodeStringStruct(buffer: ByteBuffer): StringStruct;
  export declare function  encodeCompoundStruct(message: CompoundStruct, bb: ByteBuffer): void;
  export declare function decodeCompoundStruct(buffer: ByteBuffer): CompoundStruct;
  export declare function  encodeNestedStruct(message: NestedStruct, bb: ByteBuffer): void;
  export declare function decodeNestedStruct(buffer: ByteBuffer): NestedStruct;
  export declare function  encodeBoolMessage(message: BoolMessage, bb: ByteBuffer): void;
  export declare function decodeBoolMessage(buffer: ByteBuffer): BoolMessage;
  export declare function  encodeByteMessage(message: ByteMessage, bb: ByteBuffer): void;
  export declare function decodeByteMessage(buffer: ByteBuffer): ByteMessage;
  export declare function  encodeIntMessage(message: IntMessage, bb: ByteBuffer): void;
  export declare function decodeIntMessage(buffer: ByteBuffer): IntMessage;
  export declare function  encodeUintMessage(message: UintMessage, bb: ByteBuffer): void;
  export declare function decodeUintMessage(buffer: ByteBuffer): UintMessage;
  export declare function  encodeFloatMessage(message: FloatMessage, bb: ByteBuffer): void;
  export declare function decodeFloatMessage(buffer: ByteBuffer): FloatMessage;
  export declare function  encodeCompoundMessage(message: CompoundMessage, bb: ByteBuffer): void;
  export declare function decodeCompoundMessage(buffer: ByteBuffer): CompoundMessage;
  export declare function  encodeNestedMessage(message: NestedMessage, bb: ByteBuffer): void;
  export declare function decodeNestedMessage(buffer: ByteBuffer): NestedMessage;
  export declare function  encodeNestedMessageWithRequiredFields(message: NestedMessageWithRequiredFields, bb: ByteBuffer): void;
  export declare function decodeNestedMessageWithRequiredFields(buffer: ByteBuffer): NestedMessageWithRequiredFields;
  export declare function  encodeInt8Message(message: Int8Message, bb: ByteBuffer): void;
  export declare function decodeInt8Message(buffer: ByteBuffer): Int8Message;
  export declare function  encodeInt16Message(message: Int16Message, bb: ByteBuffer): void;
  export declare function decodeInt16Message(buffer: ByteBuffer): Int16Message;
  export declare function  encodeInt32Message(message: Int32Message, bb: ByteBuffer): void;
  export declare function decodeInt32Message(buffer: ByteBuffer): Int32Message;
  export declare function  encodeUint16Message(message: Uint16Message, bb: ByteBuffer): void;
  export declare function decodeUint16Message(buffer: ByteBuffer): Uint16Message;
  export declare function  encodeUint32Message(message: Uint32Message, bb: ByteBuffer): void;
  export declare function decodeUint32Message(buffer: ByteBuffer): Uint32Message;
  export declare function  encodeFloat32Message(message: Float32Message, bb: ByteBuffer): void;
  export declare function decodeFloat32Message(buffer: ByteBuffer): Float32Message;
  export declare function  encodeStringMessage(message: StringMessage, bb: ByteBuffer): void;
  export declare function decodeStringMessage(buffer: ByteBuffer): StringMessage;
  export declare function  encodeInt8ArrayMessage(message: Int8ArrayMessage, bb: ByteBuffer): void;
  export declare function decodeInt8ArrayMessage(buffer: ByteBuffer): Int8ArrayMessage;
  export declare function  encodeInt16ArrayMessage(message: Int16ArrayMessage, bb: ByteBuffer): void;
  export declare function decodeInt16ArrayMessage(buffer: ByteBuffer): Int16ArrayMessage;
  export declare function  encodeInt32ArrayMessage(message: Int32ArrayMessage, bb: ByteBuffer): void;
  export declare function decodeInt32ArrayMessage(buffer: ByteBuffer): Int32ArrayMessage;
  export declare function  encodeUint16ArrayMessage(message: Uint16ArrayMessage, bb: ByteBuffer): void;
  export declare function decodeUint16ArrayMessage(buffer: ByteBuffer): Uint16ArrayMessage;
  export declare function  encodeUint32ArrayMessage(message: Uint32ArrayMessage, bb: ByteBuffer): void;
  export declare function decodeUint32ArrayMessage(buffer: ByteBuffer): Uint32ArrayMessage;
  export declare function  encodeFloat32ArrayMessage(message: Float32ArrayMessage, bb: ByteBuffer): void;
  export declare function decodeFloat32ArrayMessage(buffer: ByteBuffer): Float32ArrayMessage;
  export declare function  encodeInt8Struct(message: Int8Struct, bb: ByteBuffer): void;
  export declare function decodeInt8Struct(buffer: ByteBuffer): Int8Struct;
  export declare function  encodeInt16Struct(message: Int16Struct, bb: ByteBuffer): void;
  export declare function decodeInt16Struct(buffer: ByteBuffer): Int16Struct;
  export declare function  encodeInt32Struct(message: Int32Struct, bb: ByteBuffer): void;
  export declare function decodeInt32Struct(buffer: ByteBuffer): Int32Struct;
  export declare function  encodeUint16Struct(message: Uint16Struct, bb: ByteBuffer): void;
  export declare function decodeUint16Struct(buffer: ByteBuffer): Uint16Struct;
  export declare function  encodeUint32Struct(message: Uint32Struct, bb: ByteBuffer): void;
  export declare function decodeUint32Struct(buffer: ByteBuffer): Uint32Struct;
  export declare function  encodeFloat32Struct(message: Float32Struct, bb: ByteBuffer): void;
  export declare function decodeFloat32Struct(buffer: ByteBuffer): Float32Struct;
  export declare function  encodeInt8ArrayStruct(message: Int8ArrayStruct, bb: ByteBuffer): void;
  export declare function decodeInt8ArrayStruct(buffer: ByteBuffer): Int8ArrayStruct;
  export declare function  encodeInt16ArrayStruct(message: Int16ArrayStruct, bb: ByteBuffer): void;
  export declare function decodeInt16ArrayStruct(buffer: ByteBuffer): Int16ArrayStruct;
  export declare function  encodeInt32ArrayStruct(message: Int32ArrayStruct, bb: ByteBuffer): void;
  export declare function decodeInt32ArrayStruct(buffer: ByteBuffer): Int32ArrayStruct;
  export declare function  encodeUint16ArrayStruct(message: Uint16ArrayStruct, bb: ByteBuffer): void;
  export declare function decodeUint16ArrayStruct(buffer: ByteBuffer): Uint16ArrayStruct;
  export declare function  encodeUint32ArrayStruct(message: Uint32ArrayStruct, bb: ByteBuffer): void;
  export declare function decodeUint32ArrayStruct(buffer: ByteBuffer): Uint32ArrayStruct;
  export declare function  encodeFloat32ArrayStruct(message: Float32ArrayStruct, bb: ByteBuffer): void;
  export declare function decodeFloat32ArrayStruct(buffer: ByteBuffer): Float32ArrayStruct;
  export declare function  encodeBoolArrayStruct(message: BoolArrayStruct, bb: ByteBuffer): void;
  export declare function decodeBoolArrayStruct(buffer: ByteBuffer): BoolArrayStruct;
  export declare function  encodeByteArrayStruct(message: ByteArrayStruct, bb: ByteBuffer): void;
  export declare function decodeByteArrayStruct(buffer: ByteBuffer): ByteArrayStruct;
  export declare function  encodeIntArrayStruct(message: IntArrayStruct, bb: ByteBuffer): void;
  export declare function decodeIntArrayStruct(buffer: ByteBuffer): IntArrayStruct;
  export declare function  encodeUintArrayStruct(message: UintArrayStruct, bb: ByteBuffer): void;
  export declare function decodeUintArrayStruct(buffer: ByteBuffer): UintArrayStruct;
  export declare function  encodeFloatArrayStruct(message: FloatArrayStruct, bb: ByteBuffer): void;
  export declare function decodeFloatArrayStruct(buffer: ByteBuffer): FloatArrayStruct;
  export declare function  encodeStringArrayStruct(message: StringArrayStruct, bb: ByteBuffer): void;
  export declare function decodeStringArrayStruct(buffer: ByteBuffer): StringArrayStruct;
  export declare function  encodeCompoundArrayStruct(message: CompoundArrayStruct, bb: ByteBuffer): void;
  export declare function decodeCompoundArrayStruct(buffer: ByteBuffer): CompoundArrayStruct;
  export declare function  encodeBoolArrayMessage(message: BoolArrayMessage, bb: ByteBuffer): void;
  export declare function decodeBoolArrayMessage(buffer: ByteBuffer): BoolArrayMessage;
  export declare function  encodeByteArrayMessage(message: ByteArrayMessage, bb: ByteBuffer): void;
  export declare function decodeByteArrayMessage(buffer: ByteBuffer): ByteArrayMessage;
  export declare function  encodeIntArrayMessage(message: IntArrayMessage, bb: ByteBuffer): void;
  export declare function decodeIntArrayMessage(buffer: ByteBuffer): IntArrayMessage;
  export declare function  encodeUintArrayMessage(message: UintArrayMessage, bb: ByteBuffer): void;
  export declare function decodeUintArrayMessage(buffer: ByteBuffer): UintArrayMessage;
  export declare function  encodeFloatArrayMessage(message: FloatArrayMessage, bb: ByteBuffer): void;
  export declare function decodeFloatArrayMessage(buffer: ByteBuffer): FloatArrayMessage;
  export declare function  encodeStringArrayMessage(message: StringArrayMessage, bb: ByteBuffer): void;
  export declare function decodeStringArrayMessage(buffer: ByteBuffer): StringArrayMessage;
  export declare function  encodeCompoundArrayMessage(message: CompoundArrayMessage, bb: ByteBuffer): void;
  export declare function decodeCompoundArrayMessage(buffer: ByteBuffer): CompoundArrayMessage;
  export declare function  encodeRecursiveMessage(message: RecursiveMessage, bb: ByteBuffer): void;
  export declare function decodeRecursiveMessage(buffer: ByteBuffer): RecursiveMessage;
  export declare function  encodeNonDeprecatedMessage(message: NonDeprecatedMessage, bb: ByteBuffer): void;
  export declare function decodeNonDeprecatedMessage(buffer: ByteBuffer): NonDeprecatedMessage;
  export declare function  encodeDeprecatedMessage(message: DeprecatedMessage, bb: ByteBuffer): void;
  export declare function decodeDeprecatedMessage(buffer: ByteBuffer): DeprecatedMessage;
  export declare function  encodeSortedStruct(message: SortedStruct, bb: ByteBuffer): void;
  export declare function decodeSortedStruct(buffer: ByteBuffer): SortedStruct;
  export declare function  encodeTestUnion(message: TestUnion, bb: ByteBuffer): void;
  export declare function decodeTestUnion(buffer: ByteBuffer): TestUnion;
  export declare function  encodeTestUnion2(message: TestUnion2, bb: ByteBuffer, type: TestUnion2Type): void;
  export declare function decodeTestUnion2(buffer: ByteBuffer): TestUnion2;
  export declare function  encodeNestedUnion(message: NestedUnion, bb: ByteBuffer, type: NestedUnionType): void;
  export declare function decodeNestedUnion(buffer: ByteBuffer): NestedUnion;
  export declare function  encodeMultiUnion(message: MultiUnion, bb: ByteBuffer): void;
  export declare function decodeMultiUnion(buffer: ByteBuffer): MultiUnion;
  export declare function  encodeStructWithUnion(message: StructWithUnion, bb: ByteBuffer): void;
  export declare function decodeStructWithUnion(buffer: ByteBuffer): StructWithUnion;
  export declare function  encodeStructWithMultipleUnions(message: StructWithMultipleUnions, bb: ByteBuffer): void;
  export declare function decodeStructWithMultipleUnions(buffer: ByteBuffer): StructWithMultipleUnions;
  export declare function  encodeStructUnionArray(message: StructUnionArray, bb: ByteBuffer): void;
  export declare function decodeStructUnionArray(buffer: ByteBuffer): StructUnionArray;
  export declare function  encodeVector3(message: Vector3, bb: ByteBuffer): void;
  export declare function decodeVector3(buffer: ByteBuffer): Vector3;
  export declare function  encodePlayer(message: Player, bb: ByteBuffer): void;
  export declare function decodePlayer(buffer: ByteBuffer): Player;
  export declare function  encodePlayerUpdate(message: PlayerUpdate, bb: ByteBuffer, type: PlayerUpdateType): void;
  export declare function decodePlayerUpdate(buffer: ByteBuffer): PlayerUpdate;
  export declare function  encodePosition(message: Position, bb: ByteBuffer): void;
  export declare function decodePosition(buffer: ByteBuffer): Position;
  export declare function  encodeFakeImportStruct(message: FakeImportStruct, bb: ByteBuffer): void;
  export declare function decodeFakeImportStruct(buffer: ByteBuffer): FakeImportStruct;
  export declare function  encodeRotation(message: Rotation, bb: ByteBuffer): void;
  export declare function decodeRotation(buffer: ByteBuffer): Rotation;
  export declare function  encodePositionPlusRotation(message: PositionPlusRotation, bb: ByteBuffer): void;
  export declare function decodePositionPlusRotation(buffer: ByteBuffer): PositionPlusRotation;
  export declare function  encodeLowpValue(message: LowpValue, bb: ByteBuffer): void;
  export declare function decodeLowpValue(buffer: ByteBuffer): LowpValue;
  export declare function  encodeVector2(message: Vector2, bb: ByteBuffer): void;
  export declare function decodeVector2(buffer: ByteBuffer): Vector2;
  export declare function  encodePositionUpdate(message: PositionUpdate, bb: ByteBuffer): void;
  export declare function decodePositionUpdate(buffer: ByteBuffer): PositionUpdate;
  export declare function  encodeDirectionUpdate(message: DirectionUpdate, bb: ByteBuffer): void;
  export declare function decodeDirectionUpdate(buffer: ByteBuffer): DirectionUpdate;
  export declare function  encodeNameChange(message: NameChange, bb: ByteBuffer): void;
  export declare function decodeNameChange(buffer: ByteBuffer): NameChange;
}
