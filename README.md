# Peechy Message Format

This is fork of evanw's excellent [Kiwi Message Format](https://github.com/evanw/kiwi). evanw did essentially all the work and deserves the credit. I made some incompatible changes for my own usecase.

## Installation

```
yarn add peechy
```

### Whats different with this fork?

#### Union types

```proto
message Welcome {
  string motd = 1;
}

message Kick {
  int playerId = 1;
  bool announce = 2;
}

union UpdateMessage = Welcome | Kick;
```

This will expect `updateType` to exist on `ServerUpdate`, which is an enum auto-generated from the union:

```ts
enum UpdateMessageType {
  Welcome = 1,
  Kick = 2,
}
```

However, if you're using an array or if you don't want the discriminator to be defined on the parent object, you can pass `union` a property name like this:

```
union UpdateMessage = Welcome | Kick {
  messageType;
}
```

This will expect `messageType` to be defined on `Welcome` and `Kick` when the union is encoded and will set `messageType` when the union is decoded.

#### "Pick" type

This is like `Pick<TypeName, "property", "names">` from TypeScript. Its shorthand for copy-pasting a handful of fields into a new struct from an existing struct. Unlike copy-pasting, if you change types used on the parent, it will inherit the changes.

For example:

```

struct Player {
  float x;
  float y;
  float z;
  float magnitude;
  float directionX;
  float directionY;
  float directionZ;
  bool onGround;
  string username;
}

pick PositionUpdate : Player {
  x;
  y;
  z;
  onGround;
}
```

The types are copied from the parent.

A union can contain picked elements:

```proto
pick PositionUpdate : Player {
  x;
  y;
  z;
  onGround;
}

pick DirectionUpdate : Player {
  directionX;
  directionY;
  directionZ;
  magnitude;
}

pick NameChange : Player {
  username;
}

union PlayerUpdate = PositionUpdate | DirectionUpdate | NameChange;
```

`pick` with `union` simplifies handling specific types of updates when updating groups of properties together. Nested pick is undefined behavior and probably won't work.

#### TypeScript enums

Kiwi originally compiled enums like this:

```proto

enum BagelFlavors {
  cheese = 1;
  blueberry = 2;
  onion = 3;
  strawberry = 4;
  melon = 5;
  chicken = 6;
}
```

Into a type like this:

```ts
type BagelFlavors =
  | "cheese"
  | "blueberry"
  | "onion"
  | "strawberry"
  | "melon"
  | "chicken";
```

Instead, this fork compiles enums into this:

```ts
enum BagelFlavors {
  cheese = 1,
  blueberry = 2,
  onion = 3,
  strawberry = 4,
  melon = 5,
  chicken = 6,
}
```

This also deserializes enum values as integers instead of strings. This is mostly a personal preference, but its probably also faster to store SMIs instead of strings in memory.

There are two dangers this poses:

- If you pass it `"BagelFlavors.cheese"` it will become `1`
- If you change existing enum values, it will break.

#### Fixed-length numbers

Kiwi already supports variable-length encoded numbers, but there are cases where you might want to try using fixed-length numbers instead for encode/decode performance reasons.

This fork adds:

- `int8`
- `int16`
- `int32`
- `float32`
- `uint16`
- `uint32`

In JavaScript, arrays of fixed-length numbers will encode/decode into their TypedArray equivalents via `TypedArray.prototype.set`. For larger arrays, this can be orders of magnitude faster than looping, but you could already just use a `byte[]`. This just returns the correct view.

- `int8[]` -> `Int8Array`
- `int16[]` -> `Int16Array`
- `int32[]` -> `Int32Array`
- `float32[]` -> `Float32Array`
- `uint16[]` -> `Uint16Array`
- `uint32[]` -> `Uint32Array`

#### Allocator

When you call `compileSchema`, you can pass it an `Allocator` object which is the shape:

```
type Allocator = {
  [messageOrStructName: string]: {
    alloc(): MessageOrStructType
  }
}
```

#### All encode functions require a ByteBuffer passed in

This was optional before. Its a worse developer experience this way, but typically better performance to minimize arguments of different types.

#### SharedArrayBuffer

If `SharedArrayBuffer` is available, it will use that instead of `ArrayBuffer`. This is configurable by setting `ArrayBufferType` on `ByteBuffer`.

#### ByteBuffer.WIGGLE_ROOM

If you want to reduce tne number of times the ArrayBuffer is reallocated by over-allocating, you can set a number to multiply the amount it grows by. I haven't benchmarked if this makes it faster yet but it probably would (at a cost of more memory)

#### Required flag inside messages

If you set a property of a message like this:

```
message Foo {
  bacon = 1 [!];
}
```

The generated type for that property will no longer be optional. This currently has no runtime effect. Its just so the types are easier to work with.

Note: non-JS/TS languages are unsupported but maybe that will change in the future.

# Original readme

Kiwi is a schema-based binary format for efficiently encoding trees of data.
It's inspired by Google's [Protocol Buffer](https://developers.google.com/protocol-buffers/) format but is simpler, has a more compact encoding, and has better support for optional fields.

Goals:

- **Efficient encoding of common values:** Variable-length encoding is used for numeric values where small values take up less space.
- **Efficient encoding of compound objects:** The `struct` feature supports nested objects with zero encoding overhead.
- **Presence of optional fields is detectable:** This is not possible with Protocol Buffers, especially for repeated fields.
- **Linearly serializable:** Reading and writing are both single-scan operations so they are cache-efficient and have guaranteed time complexity.
- **Backwards compatibility:** New versions of the schema can still read old data.
- **Forwards compatibility:** Old versions of the schema can optionally read new data if a copy of the new schema is bundled with the data (the new schema lets the decoder skip over unknown fields).
- **Simple implementation:** The API is very minimal and the generated C++ code only depends on a single file.

Non-goals:

- **Optimal bit-packing:** Compression can be used after encoding for more space savings if needed.

## Native Types

- **bool:** A value that stores either `true` or `false`. Will use 1 byte.
- **byte:** An unsigned 8-bit integer value. Uses 1 byte, obviously.
- **int:** A 32-bit integer value stored using a variable-length encoding optimized for storing numbers with a small magnitude. Will use at most 5 bytes.
- **uint:** A 32-bit integer value stored using a variable-length encoding optimized for storing small non-negative numbers. Will use at most 5 bytes.
- **float:** A 32-bit floating-point number. Normally uses 4 bytes but a value of zero uses 1 byte ([denormal numbers](https://en.wikipedia.org/wiki/Denormal_number) become zero when encoded).
- **string:** A UTF-8 null-terminated string. Will use at least 1 byte.
- **T[]:** Any type can be made into an array using the `[]` suffix.

## User Types

- **enum:** A `uint` with a restricted set of values that are identified by name. New fields can be added to any message while maintaining backwards compatibility.
- **struct:** A compound value with a fixed set of fields that are always required and written out in order. New fields cannot be added to a struct once that struct is in use.
- **message:** A compound value with optional fields. New fields can be added to any message while maintaining backwards compatibility.

## Example Schema

```proto
enum Type {
  FLAT = 0;
  ROUND = 1;
  POINTED = 2;
}

struct Color {
  byte red;
  byte green;
  byte blue;
  byte alpha;
}

message Example {
  uint clientID = 1;
  Type type = 2;
  Color[] colors = 3;
}
```

## Live Demo

See [http://evanw.github.io/kiwi/](http://evanw.github.io/kiwi/) for a live demo of the schema compiler.

## Usage Examples

Pick a language:

- [JavaScript](./examples/js.md)
- [C++](./examples/cpp.md)
- [Rust](./examples/rust.md)
- [Skew](./examples/skew.md)
