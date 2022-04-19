//@ts-ignore
import { camelCase, pascalCase, snakeCase } from "change-case";
import { parseSchema } from "./parser";
import { Definition, Schema } from "./schema";
import { error, quote } from "./util";
//@ts-ignore
import PREAMBLE from "./peechy.zig";

const TYPE_NAMES = {
  bool: "bool",
  byte: "u8",
  float: "f32",
  int: "i32",
  uint8: "u8",
  uint16: "u16",
  uint32: "u32",
  int8: "i8",
  int16: "i16",
  float32: "f32",
  int32: "i32",
  lowp: "f32",
  string: "[]const u8",
  uint: "u32",
  alphanumeric: "[]const u8",
};

const PACKABLE_TYPES = {
  bool: "bool",
  byte: "u8",
  float: "f32",
  int: "i32",
  uint8: "u8",
  uint16: "u16",
  uint32: "u32",
  int8: "i8",
  int16: "i16",
  float32: "f32",
  int32: "i32",
  lowp: "f32",
  uint: "u32",
};

function isDiscriminatedUnion(
  name: string,
  definitions: { [name: string]: Definition }
) {
  if (!definitions[name]) return false;
  if (!definitions[name].fields.length) return false;
  return definitions[name].fields[0].type === "discriminator";
}

type AliasMap = { [name: string]: string };

function compileDecode(
  definition: Definition,
  definitions: { [name: string]: Definition },
  aliases: AliasMap
): string {
  let lines: string[] = [];
  let indent = "  ";

  // if (definition.kind === "UNION") {
  //   const hasDiscriminator = isDiscriminatedUnion(definition.name, definitions);
  //   lines.push("");

  //   if (hasDiscriminator) {
  //     lines.push("  switch (reader.readVarUint()) {");
  //     indent = "      ";
  //     for (let i = 1; i < definition.fields.length; i++) {
  //       let field = definition.fields[i];
  //       lines.push(
  //         `    case ${field.value}:`,
  //         indent + `var result = " + ("decode" + field.name) + "(bb);`,
  //         indent +
  //           `result[${quote(definition.fields[0].name)}] = ${field.value};`,
  //         indent + `return result;`
  //       );
  //     }
  //   } else {
  //     lines.push("  switch (type) {");
  //     indent = "      ";
  //     for (let i = 0; i < definition.fields.length; i++) {
  //       let field = definition.fields[i];
  //       lines.push(
  //         `    case ${field.value}:`,
  //         indent + `return ${"decode" + field.name}(bb)`
  //       );
  //     }
  //   }
  // } else {
  indent = `  `;
  lines.push(
    `pub fn decode(reader: anytype) anyerror!${pascalCase(definition.name)} {`,
    `${indent}var this = std.mem.zeroes(${pascalCase(definition.name)});`
  );

  let hasLength = false;

  // if (!withAllocator) {

  let startLine = lines.length;
  // } else {
  //   lines.push(
  //     "  var result = Allocator[" + quote(definition.name) + "].alloc();"
  //   );
  // }

  lines.push("");
  var hasErr = false;

  if (definition.kind === "MESSAGE") {
    lines.push("  while(true) {");
    lines.push("    switch (try reader.readByte()) {");
    lines.push("      0 => { return this; },");
    lines.push("");
    indent = "      ";
  }
  var has_length = false;
  var has_j = false;

  for (let i = 0; i < definition.fields.length; i++) {
    let field = definition.fields[i];
    let code: string;
    let fieldType = field.type;
    if (aliases[fieldType]) fieldType = aliases[fieldType];
    const zig_name = snakeCase(field.name);
    let zig_typename = TYPE_NAMES[fieldType] || pascalCase(fieldType);
    if (definition.kind === "MESSAGE") {
      lines.push(`${indent}${i + 1} => {`);
      indent += "  ";
    }

    if (field.isArray) {
      lines.push(
        `${indent}this.${zig_name} = try reader.readArray(${zig_typename}); `
      );
    } else {
      lines.push(
        `${indent}this.${zig_name} = try reader.readValue(${zig_typename}); `
      );
    }

    if (definition.kind === "MESSAGE") {
      indent = "      ";
      lines.push(`},`);
    }
  }

  if (definition.kind === "MESSAGE") {
    lines.push(`${indent}else => {`);
    lines.push(`${indent}return error.InvalidMessage;`);
    lines.push(`${indent}},`);
    lines.push(`${indent}}`);
    lines.push(`${indent}}`);
    lines.push("unreachable;");
  } else {
    lines.push(`${indent} return this;`);
  }
  lines.push("}");
  return lines.join(`\n`);
}

function compileEncode(
  definition: Definition,
  definitions: { [name: string]: Definition },
  aliases: AliasMap
): string {
  let lines: string[] = [];

  lines.push(
    `pub fn encode(this: *const @This(), writer: anytype) anyerror!void {`
  );

  let hasN = false;

  let startLine = lines.length;
  let hasErr = false;

  const INTEGER_TYPES = {
    byte: "u8",
    float: "f32",
    int: "i32",
    uint8: "u8",
    uint16: "u16",
    uint32: "u32",
    int8: "i8",
    int16: "i16",
    float32: "f32",
    int32: "i32",
    lowp: "f32",
    uint: "u32",
  };

  for (let j = 0; j < definition.fields.length; j++) {
    let field = definition.fields[j];
    let code: string;
    var fieldName = snakeCase(field.name);

    if (field.isDeprecated) {
      continue;
    }

    let fieldType = field.type;
    if (aliases[fieldType]) fieldType = aliases[fieldType];

    var zig_name = snakeCase(field.name);
    const zig_typename = TYPE_NAMES[fieldType] || pascalCase(fieldType);

    if (definition.kind === "MESSAGE") {
      lines.push(`if (this.${zig_name}) |${zig_name}| {`);
      lines.push(`  try writer.writeFieldID(${j + 1});`);
    } else {
      zig_name = `this.${zig_name}`;
    }

    if (field.isArray) {
      lines.push(`   try writer.writeArray(${zig_typename}, ${zig_name});`);
    } else if (INTEGER_TYPES[fieldType]) {
      lines.push(`   try writer.writeInt(${zig_name});`);
    } else if (fieldType === "bool") {
      lines.push(`   try writer.writeInt(@as(u8, @boolToInt(${zig_name})));`);
    } else if (field.type === "string" || field.type === "alphanumeric") {
      lines.push(
        `   try writer.writeValue(@TypeOf(${zig_name}), ${zig_name});`
      );
    } else {
      const specific_field_type = definitions[fieldType];
      switch (specific_field_type.kind) {
        case "SMOL":
        case "ENUM": {
          lines.push(`   try writer.writeEnum(${zig_name});`);
          break;
        }
        default: {
          lines.push(
            `   try writer.writeValue(@TypeOf(${zig_name}), ${zig_name});`
          );
          break;
        }
      }
    }

    if (definition.kind === "MESSAGE") {
      lines.push(`}`);
    }
  }

  if (definition.kind === "MESSAGE") {
    lines.push(`try writer.endMessage();`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function compileSchema(schema: Schema): string {
  let definitions: { [name: string]: Definition } = {};
  let aliases: { [name: string]: string } = {};
  let name = schema.package;
  let go: string[] = [];
  const exportsList = [];
  const importsList = [];

  go.push("");
  const PREFIX = PREAMBLE.split("// --- DIVIDING LINE ----");
  go.push(PREFIX[0]);
  go.push("");
  go.push("");
  go.push(`pub const ${schema.package || "Schema"} = struct { `);
  go.push("");

  for (let i = 0; i < schema.definitions.length; i++) {
    let definition = schema.definitions[i];
    definitions[definition.name] = definition;

    if (definition.kind === "ALIAS") {
      aliases[definition.name] = definition.fields[0].name;
    }
    // if (isESM && definition.serializerPath?.length) {
    //   importsList.push(
    //     `import {encode${definition.name}, decode${definition.name}} from "${definition.serializerPath}";`
    //   );
    // }
  }

  for (let i = 0; i < schema.definitions.length; i++) {
    let definition = schema.definitions[i];
    if (definition.kind === "ALIAS") continue;

    switch (definition.kind) {
      case "SMOL":
      case "ENUM": {
        let value: any = {};
        let keys: any = {};
        go.push(
          `pub const ${pascalCase(definition.name)} = enum(${
            definition.kind === "SMOL" ? TYPE_NAMES.byte : TYPE_NAMES.uint
          }) {`
        );
        go.push("");

        go.push("_none,");

        const constantValues = [];
        const stringValues = [];
        const invertValues = [];

        for (let j = 0; j < definition.fields.length; j++) {
          let field = definition.fields[j];
          constantValues.push(`  /// ${field.name}`);
          constantValues.push(`  ${snakeCase(field.name)},`);
          constantValues.push("");
        }
        go.push(...constantValues);
        go.push("_,");

        go.push(
          ...`
                pub fn jsonStringify(self: *const @This(), opts: anytype, o: anytype) !void {
                    return try std.json.stringify(@tagName(self), opts, o);
                }

                `.split("\n")
        );

        go.push("};");
        go.push("");
        break;
      }

      case "UNION": {
        console.warn("Unions are unsupported in Zig.");
        break;
        // let value: any = {};
        // let keys: any = {};
        // const encoders = new Array(definition.fields.length);
        // encoders.fill("() => null");
        // for (let j = 0; j < definition.fields.length; j++) {
        //   let field = definition.fields[j];
        //   let fieldType = field.type;
        //   if (field.value > 0) {
        //     if (aliases[field.name]) field.name = aliases[field.name];
        //     value[field.name] = field.value;
        //     value[field.value] = field.value;
        //     keys[field.name] = field.name;
        //     keys[field.value] = field.name;

        //     encoders[field.value] = "encode" + fieldType;
        //   }
        // }
        // exportsList.push(definition.name);
        // go.push(
        //   "const " +
        //     definition.name +
        //     " = " +
        //     JSON.stringify(value, null, 2) +
        //     ";"
        // );
        // go.push(
        //   "const " +
        //     definition.name +
        //     "Keys = " +
        //     JSON.stringify(keys, null, 2) +
        //     ";"
        // );

        // exportsList.push(`${definition.name}Keys`);
        // go.push("const " + definition.name + "Type = " + definition.name + ";");
        // exportsList.push(definition.name + "Type");
        // const encoderName = encoders.join(" , ");
        // go.push(
        //   "const encode" +
        //     definition.name +
        //     "ByType" +
        //     " = (function() { return " +
        //     "[" +
        //     encoderName +
        //     "]; })()"
        // );
      }
      case "STRUCT":
      case "MESSAGE": {
        if (canBePackedStruct(schema, definition)) {
          go.push(`pub const ${pascalCase(definition.name)} = packed struct {`);
        } else {
          go.push(`pub const ${pascalCase(definition.name)} = struct {`);
        }

        for (let j = 0; j < definition.fields.length; j++) {
          let field = definition.fields[j];

          let isPrimitive =
            TYPE_NAMES[field.type] ||
            ["SMOL", "ENUM"].includes(definitions[field.type].kind);
          let typeName = "";

          let singleTypeName =
            TYPE_NAMES[field.type] || pascalCase(definitions[field.type].name);

          let isOptional = definition.kind === "MESSAGE";
          if (field.isArray) {
            typeName = "[]const " + singleTypeName;
          } else if (isPrimitive) {
            typeName = (isOptional ? "?" : "") + singleTypeName;
          } else {
            typeName = (isOptional ? "?" : "") + singleTypeName;
          }

          go.push(`/// ${field.name}`);

          if (isOptional && !field.isArray) {
            go.push(`${snakeCase(field.name)}: ${typeName} = null,`);
          } else if (
            !field.isArray &&
            field.type !== "string" &&
            field.type !== "alphanumeric" &&
            TYPE_NAMES[field.type]
          ) {
            if (field.type === "bool") {
              go.push(`${snakeCase(field.name)}: ${typeName} = false,`);
            } else {
              go.push(`${snakeCase(field.name)}: ${typeName} = 0,`);
            }
          } else {
            go.push(`${snakeCase(field.name)}: ${typeName},`);
          }

          go.push("");
        }

        go.push("");
        go.push(compileDecode(definition, definitions, aliases));
        go.push("");
        go.push(compileEncode(definition, definitions, aliases));
        go.push("");

        go.push(`};`);
        go.push("");
        break;
      }

      default: {
        error(
          "Invalid definition kind " + quote(definition.kind),
          definition.line,
          definition.column
        );
        break;
      }
    }
  }

  go.push("");

  go.push("};");

  go.push(PREFIX[1]);

  return go.join("\n");
}

interface IAllocator {
  alloc(): Object;
}

export function compileSchemaZig(schema: Schema | string): any {
  if (typeof schema === "string") {
    schema = parseSchema(schema);
  }
  return compileSchema(schema);
}

function onlyHasPrimitiveFields(
  schema: Schema,
  definition: Definition
): boolean {
  if (definition.kind === "SMOL" || definition.kind === "ENUM") {
    return true;
  }

  if (definition.kind !== "STRUCT") {
    return false;
  }

  for (let field of definition.fields) {
    if (field.isArray) {
      return false;
    }

    if (PACKABLE_TYPES[field.type]) {
      continue;
    }

    if (TYPE_NAMES[field.type]) {
      return false;
    }

    const field_definition: Definition = schema.definitions[field.type];

    if (!field_definition) {
      return false;
    }

    if (!onlyHasPrimitiveFields(schema, field_definition)) {
      return false;
    }
  }
  return true;
}

function canBePackedStruct(schema: Schema, definition: Definition): boolean {
  return (
    definition.kind === "STRUCT" && onlyHasPrimitiveFields(schema, definition)
  );
}
