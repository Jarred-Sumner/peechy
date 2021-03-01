import { Schema, Definition } from "./schema";
import { ByteBuffer } from "./bb";
import { error, quote } from "./util";
import { parseSchema } from "./parser";

function isDiscriminatedUnion(
  name: string,
  definitions: { [name: string]: Definition }
) {
  if (!definitions[name]) return false;
  if (!definitions[name].fields.length) return false;
  return definitions[name].fields[0].type === "discriminator";
}

function compileDecode(
  definition: Definition,
  definitions: { [name: string]: Definition },
  withAllocator: boolean = false
): string {
  let lines: string[] = [];
  let indent = "  ";

  if (definition.kind === "UNION") {
    const hasDiscriminator = isDiscriminatedUnion(definition.name, definitions);
    if (hasDiscriminator) {
      lines.push("function(bb) {");
    } else {
      lines.push("function(bb, type = 0) {");
    }

    lines.push("");

    if (hasDiscriminator) {
      lines.push("  switch (bb.readVarUint()) {");
      indent = "      ";
      for (let i = 1; i < definition.fields.length; i++) {
        let field = definition.fields[i];
        lines.push(
          `    case ${field.value}:`,
          indent +
            "var result = this[" +
            quote("decode" + field.name) +
            "](bb);",
          indent +
            `result[${quote(definition.fields[0].name)}] = ${field.value};`,
          indent + `return result;`
        );
      }
    } else {
      lines.push("  switch (type) {");
      indent = "      ";
      for (let i = 0; i < definition.fields.length; i++) {
        let field = definition.fields[i];
        lines.push(
          `    case ${field.value}:`,
          indent + "return this[" + quote("decode" + field.name) + "](bb);"
        );
      }
    }
  } else {
    if (!withAllocator) {
      lines.push("function(bb) {");
      lines.push("  var result = {};");
    } else {
      lines.push("function(bb) {");
      lines.push(
        "  var result = this.Allocator[" + quote(definition.name) + "].alloc();"
      );
    }

    lines.push("");

    if (definition.kind === "MESSAGE") {
      lines.push("  while (true) {");
      lines.push("    switch (bb.readVarUint()) {");
      lines.push("    case 0:");
      lines.push("      return result;");
      lines.push("");
      indent = "      ";
    }

    for (let i = 0; i < definition.fields.length; i++) {
      let field = definition.fields[i];
      let code: string;

      switch (field.type) {
        case "bool": {
          code = "!!bb.readByte()";
          break;
        }

        case "uint8":
        case "byte": {
          code = "bb.readByte()"; // only used if not array
          break;
        }

        case "int16": {
          code = "bb.readInt16()";
          break;
        }

        case "int8": {
          code = "bb.readInt8()";
          break;
        }

        case "int32": {
          code = "bb.readInt32()";
          break;
        }

        case "int": {
          code = "bb.readVarInt()";
          break;
        }

        case "uint16": {
          code = "bb.readUint16()";
          break;
        }

        case "uint32": {
          code = "bb.readUint32()";
          break;
        }

        case "uint": {
          code = "bb.readVarUint()";
          break;
        }

        case "float": {
          code = "bb.readVarFloat()";
          break;
        }

        case "float32": {
          code = "bb.readFloat32()";
          break;
        }

        case "string": {
          code = "bb.readString()";
          break;
        }

        default: {
          let type = definitions[field.type!];
          if (!type) {
            error(
              "Invalid type " +
                quote(field.type!) +
                " for field " +
                quote(field.name),
              field.line,
              field.column
            );
          } else if (type.kind === "ENUM") {
            code = "this[" + quote(type.name) + "][bb.readVarUint()]";
          } else if (type.kind === "SMOL") {
            code = "this[" + quote(type.name) + "][bb.readByte()]";
          } else {
            code = "this[" + quote("decode" + type.name) + "](bb)";
          }
        }
      }

      if (definition.kind === "MESSAGE") {
        lines.push("    case " + field.value + ":");
      }

      if (field.isArray) {
        if (field.isDeprecated) {
          if (field.type === "byte") {
            lines.push(indent + "bb.readByteArray();");
          } else {
            lines.push(indent + "var length = bb.readVarUint();");
            lines.push(indent + "while (length-- > 0) " + code + ";");
          }
        } else {
          switch (field.type) {
            case "byte": {
              lines.push(
                indent +
                  "result[" +
                  quote(field.name) +
                  "] = bb.readByteArray();"
              );
              break;
            }
            case "uint16": {
              lines.push(
                indent +
                  "result[" +
                  quote(field.name) +
                  "] = bb.readUint16ByteArray();"
              );
              break;
            }
            case "uint32": {
              lines.push(
                indent +
                  "result[" +
                  quote(field.name) +
                  "] = bb.readUint32ByteArray();"
              );
              break;
            }
            case "int8": {
              lines.push(
                indent +
                  "result[" +
                  quote(field.name) +
                  "] = bb.readInt8ByteArray();"
              );
              break;
            }
            case "int16": {
              lines.push(
                indent +
                  "result[" +
                  quote(field.name) +
                  "] = bb.readInt16ByteArray();"
              );
              break;
            }
            case "int32": {
              lines.push(
                indent +
                  "result[" +
                  quote(field.name) +
                  "] = bb.readInt32ByteArray();"
              );
              break;
            }
            case "float32": {
              lines.push(
                indent +
                  "result[" +
                  quote(field.name) +
                  "] = bb.readFloat32ByteArray();"
              );
              break;
            }
            default: {
              lines.push(indent + "var length = bb.readVarUint();");
              lines.push(
                indent +
                  "var values = result[" +
                  quote(field.name) +
                  "] = Array(length);"
              );
              lines.push(
                indent +
                  "for (var i = 0; i < length; i++) values[i] = " +
                  code +
                  ";"
              );
              break;
            }
          }
        }
      } else if (field.type && isDiscriminatedUnion(field.type, definitions)) {
        lines.push(
          indent +
            "result[" +
            quote(field.name) +
            "] = " +
            `this[${quote("decode" + field.type)}](bb);`
        );
      } else if (
        field.type &&
        definitions[field.type] &&
        definitions[field.type].kind === "UNION"
      ) {
        const key = quote(field.name + "Type");
        lines.push(
          indent + "result[" + key + "] = " + "bb.readVarUint()" + ";",
          indent +
            "result[" +
            quote(field.name) +
            "] = " +
            `this[${quote("decode" + field.type)}](bb, result[${key}]);`
        );
      } else {
        if (field.isDeprecated) {
          lines.push(indent + code + ";");
        } else {
          lines.push(
            indent + "result[" + quote(field.name) + "] = " + code + ";"
          );
        }
      }

      if (definition.kind === "MESSAGE") {
        lines.push("      break;");
        lines.push("");
      }
    }
  }

  if (definition.kind === "MESSAGE") {
    lines.push("    default:");
    lines.push('      throw new Error("Attempted to parse invalid message");');
    lines.push("    }");
    lines.push("  }");
  } else if (definition.kind === "UNION") {
    lines.push("    default:");
    lines.push(`      throw new Error("Attempted to parse invalid union");`);
    lines.push("  }");
  } else {
    lines.push("  return result;");
  }

  lines.push("}");

  return lines.join("\n");
}

function compileEncode(
  definition: Definition,
  definitions: { [name: string]: Definition }
): string {
  let lines: string[] = [];

  if (definition.kind === "UNION") {
    const discriminator = definition.fields[0];
    const hasDiscriminator = discriminator.type === "discriminator";

    lines.push("function(message, bb, type = 0) {");
    if (hasDiscriminator) {
      lines.push(
        `  type = type ? type : this[${quote(definition.name)}][message[${quote(
          discriminator.name
        )}]];`
      );
      lines.push(
        `  if (!type) throw new Error('Expected message[${quote(
          discriminator.name
        )}] to be one of ' + JSON.stringify(this[${quote(
          definition.name
        )}]) + ' ');`
      );
    } else {
      lines.push(
        `  if (!type) throw new Error('Expected type to be one of ' + JSON.stringify(this[${quote(
          definition.name
        )}], null, 2) + ' ');`
      );
    }

    lines.push("");

    lines.push(`  bb.writeVarUint(type);`);

    lines.push("");

    lines.push(`  switch (type) {`);

    for (let j = hasDiscriminator ? 1 : 0; j < definition.fields.length; j++) {
      let field = definition.fields[j];
      let code: string;

      if (field.isDeprecated) {
        continue;
      }

      lines.push(`    case ${field.value}: {`);
      lines.push(`      this[${quote("encode" + field.name)}](message, bb)`);
      lines.push(`      break;`);
      lines.push(`    }`);
    }
    lines.push(`    default: {`);
    lines.push(
      `      throw new Error('Expected message[${quote(
        discriminator.name
      )}] to be one of ' + JSON.stringify(this[${quote(
        definition.name
      )}]) + ' ');`
    );
    lines.push(`    }`);

    lines.push(`  }`);
    lines.push("");
    lines.push("}");
    return lines.join("\n");
  } else {
    lines.push("function(message, bb) {");
  }

  for (let j = 0; j < definition.fields.length; j++) {
    let field = definition.fields[j];
    let code: string;

    if (field.isDeprecated) {
      continue;
    }

    switch (field.type) {
      case "bool": {
        code = "bb.writeByte(value);";
        break;
      }

      case "byte": {
        code = "bb.writeByte(value);"; // only used if not array
        break;
      }

      case "int": {
        code = "bb.writeVarInt(value);";
        break;
      }

      case "int8": {
        code = "bb.writeInt8(value);";
        break;
      }

      case "int16": {
        code = "bb.writeInt16(value);";
        break;
      }

      case "int32": {
        code = "bb.writeInt32(value);";
        break;
      }

      case "uint": {
        code = "bb.writeVarUint(value);";
        break;
      }

      case "uint8": {
        code = "bb.writeByte(value);";
        break;
      }

      case "uint16": {
        code = "bb.writeUint16(value);";
        break;
      }

      case "uint32": {
        code = "bb.writeUint32(value);";
        break;
      }

      case "float": {
        code = "bb.writeVarFloat(value);";
        break;
      }

      case "float32": {
        code = "bb.writeFloat32(value);";
        break;
      }

      case "string": {
        code = "bb.writeString(value);";
        break;
      }

      case "discriminator": {
        code = `bb.writeVarUint(type);`;
        break;
      }

      default: {
        let type = definitions[field.type!];
        if (!type) {
          throw new Error(
            "Invalid type " +
              quote(field.type!) +
              " for field " +
              quote(field.name)
          );
        } else if (type.kind === "ENUM") {
          code =
            "var encoded = this[" +
            quote(type.name) +
            "][value];\n" +
            'if (encoded === void 0) throw new Error("Invalid value " + JSON.stringify(value) + ' +
            quote(" for enum " + quote(type.name)) +
            ");\n" +
            "bb.writeVarUint(encoded);";
        } else if (type.kind === "SMOL") {
          code =
            "var encoded = this[" +
            quote(type.name) +
            "][value];\n" +
            'if (encoded === void 0) throw new Error("Invalid value " + JSON.stringify(value) + ' +
            quote(" for enum " + quote(type.name)) +
            ");\n" +
            "bb.writeByte(encoded);";
        } else if (
          type.kind === "UNION" &&
          isDiscriminatedUnion(type.name, definitions)
        ) {
          code = "this[" + quote("encode" + type.name) + "](value, bb);";
        } else if (type.kind === "UNION") {
          code =
            "var encoded = this[" +
            quote(type.name) +
            `][${quote(field.name + "Type")}];\n` +
            `    if (encoded === void 0) throw new Error('Expected ${quote(
              field.name + "Type"
            )} to be one of ' + JSON.stringify(value) + ' for enum ${quote(
              type.name
            )}');
              bb.writeVarUint(encoded);`;
          code += "this[" + quote("encode" + type.name) + "](value, bb);";
        } else {
          code = "this[" + quote("encode" + type.name) + "](value, bb);";
        }
      }
    }

    lines.push("");

    if (field.type === "discriminator") {
      error("Unexpected discriminator", field.line, field.column);
    } else {
      lines.push("  var value = message[" + quote(field.name) + "];");
      lines.push("  if (value != null) {"); // Comparing with null using "!=" also checks for undefined
    }

    if (definition.kind === "MESSAGE") {
      lines.push("    bb.writeVarUint(" + field.value + ");");
    }

    if (field.isArray) {
      let indent = "   ";
      switch (field.type) {
        case "byte": {
          lines.push(indent + "bb.writeByteArray(value);");
          break;
        }
        case "uint16": {
          lines.push(indent + "bb.writeUint16ByteArray(value);");
          break;
        }
        case "uint32": {
          lines.push(indent + "bb.writeUint32ByteArray(value);");
          break;
        }
        case "int8": {
          lines.push(indent + "bb.writeInt8ByteArray(value);");
          break;
        }
        case "int16": {
          lines.push(indent + "bb.writeInt16ByteArray(value);");
          break;
        }
        case "int32": {
          lines.push(indent + "bb.writeInt32ByteArray(value);");
          break;
        }
        case "float32": {
          lines.push(indent + "bb.writeFloat32ByteArray(value);");
          break;
        }
        default: {
          lines.push("    var values = value, n = values.length;");
          lines.push("    bb.writeVarUint(n);");
          lines.push("    for (var i = 0; i < n; i++) {");
          lines.push("      value = values[i];");
          lines.push("      " + code);
          lines.push("    }");
        }
      }
    } else {
      lines.push("    " + code);
    }

    if (definition.kind === "STRUCT") {
      lines.push("  } else {");
      lines.push(
        "    throw new Error(" +
          quote("Missing required field " + quote(field.name)) +
          ");"
      );
    }

    lines.push("  }");
  }

  // A field id of zero is reserved to indicate the end of the message
  if (definition.kind === "MESSAGE") {
    lines.push("  bb.writeVarUint(0);");
  }

  lines.push("");
  lines.push("}");

  return lines.join("\n");
}

export function compileSchemaJS(schema: Schema, withAllocator = false): string {
  let definitions: { [name: string]: Definition } = {};
  let name = schema.package;
  let js: string[] = [];

  if (name !== null) {
    js.push("var " + name + " = exports || " + name + " || {}, exports;");
  } else {
    js.push("var exports = exports || {};");
    name = "exports";
  }

  js.push(
    name +
      ".ByteBuffer = " +
      name +
      '.ByteBuffer || require("peechy").ByteBuffer;'
  );

  for (let i = 0; i < schema.definitions.length; i++) {
    let definition = schema.definitions[i];
    definitions[definition.name] = definition;
  }

  for (let i = 0; i < schema.definitions.length; i++) {
    let definition = schema.definitions[i];

    switch (definition.kind) {
      case "SMOL":
      case "ENUM": {
        let value: any = {};
        for (let j = 0; j < definition.fields.length; j++) {
          let field = definition.fields[j];
          value[field.name] = field.value;
          value[field.value] = field.value;
        }
        js.push(
          name +
            "[" +
            quote(definition.name) +
            "] = " +
            JSON.stringify(value, null, 2) +
            ";"
        );
        break;
      }

      case "UNION": {
        let value: any = {};
        const encoders = new Array(definition.fields.length);
        encoders.fill("() => null");
        for (let j = 0; j < definition.fields.length; j++) {
          let field = definition.fields[j];
          if (field.value > 0) {
            value[field.name] = field.value;
            value[field.value] = field.value;

            encoders[field.value] =
              name + "[" + quote("encode" + field.type) + "]";
          }
        }
        js.push(
          name +
            "[" +
            quote(definition.name) +
            "] = " +
            JSON.stringify(value, null, 2) +
            ";"
        );
        const encoderName = encoders.join(" , ");
        js.push(
          name +
            "[" +
            quote("encode" + definition.name + "ByType") +
            "]" +
            " = (function() { return " +
            "[" +
            encoderName +
            "]; })()"
        );
      }
      case "STRUCT":
      case "MESSAGE": {
        js.push("");
        js.push(
          name +
            "[" +
            quote("decode" + definition.name) +
            "] = " +
            compileDecode(definition, definitions, withAllocator) +
            ";"
        );
        js.push("");
        js.push(
          name +
            "[" +
            quote("encode" + definition.name) +
            "] = " +
            compileEncode(definition, definitions) +
            ";"
        );
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

  js.push("");
  return js.join("\n");
}

interface IAllocator {
  alloc(): Object;
}

export function compileSchema(
  schema: Schema | string,
  Allocator?: { [key: string]: IAllocator }
): any {
  let result = Allocator
    ? {
        Allocator,
        ByteBuffer: ByteBuffer,
      }
    : { ByteBuffer };
  if (typeof schema === "string") {
    schema = parseSchema(schema);
  }
  const out = compileSchemaJS(schema, !!Allocator);
  new Function("exports", out)(result);
  return result;
}
