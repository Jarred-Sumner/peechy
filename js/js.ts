import { Schema, Definition, Field } from "./schema";
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

type AliasMap = { [name: string]: string };

function compileDecode(
  functionName: string,
  definition: Definition,
  definitions: { [name: string]: Definition },
  withAllocator: boolean = false,
  aliases: AliasMap
): string {
  let lines: string[] = [];
  let indent = "  ";

  if (definition.kind === "UNION") {
    const hasDiscriminator = isDiscriminatedUnion(definition.name, definitions);
    if (hasDiscriminator) {
      lines.push(`function ${functionName}(bb) {`);
    } else {
      lines.push(`function ${functionName}(bb, type = 0) {`);
    }

    lines.push("");

    if (hasDiscriminator) {
      lines.push("  switch (bb.readVarUint()) {");
      indent = "      ";
      for (let i = 1; i < definition.fields.length; i++) {
        let field = definition.fields[i];
        lines.push(
          `    case ${field.value}:`,
          indent + "var result = " + ("decode" + field.name) + "(bb);",
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
          indent + `return ${"decode" + field.name}(bb)`
        );
      }
    }
  } else {
    lines.push(`function ${functionName}(bb) {`);

    if (!withAllocator) {
      lines.push("  var result = {};");
    } else {
      lines.push(
        "  var result = Allocator[" + quote(definition.name) + "].alloc();"
      );
    }

    lines.push("");

    if (definition.kind === "MESSAGE") {
      lines.push("  while (true) {");
      lines.push("    switch (bb.readByte()) {");
      lines.push("    case 0:");
      lines.push("      return result;");
      lines.push("");
      indent = "      ";
    }

    for (let i = 0; i < definition.fields.length; i++) {
      let field = definition.fields[i];
      let code: string;
      let fieldType = field.type;
      if (aliases[fieldType]) fieldType = aliases[fieldType];

      switch (fieldType) {
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

        case "alphanumeric": {
          code = "bb.readAlphanumeric()";
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

        case "lowp": {
          code = "bb.readLowPrecisionFloat()";
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
          let type = definitions[fieldType!];
          if (!type) {
            error(
              "Invalid type " +
                quote(fieldType!) +
                " for field " +
                quote(field.name),
              field.line,
              field.column
            );
          } else if (type.kind === "ENUM") {
            code = type.name + "[bb.readVarUint()]";
          } else if (type.kind === "SMOL") {
            code = type.name + "[bb.readByte()]";
          } else {
            code = "decode" + type.name + "(bb)";
          }
        }
      }

      if (definition.kind === "MESSAGE") {
        lines.push("    case " + field.value + ":");
      }

      if (field.isArray) {
        if (field.isDeprecated) {
          if (fieldType === "byte") {
            lines.push(indent + "bb.readByteArray();");
          } else {
            lines.push(indent + "var length = bb.readVarUint();");
            lines.push(indent + "while (length-- > 0) " + code + ";");
          }
        } else {
          switch (fieldType) {
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
      } else if (fieldType && isDiscriminatedUnion(fieldType, definitions)) {
        lines.push(
          indent +
            "result[" +
            quote(field.name) +
            "] = " +
            `${"decode" + fieldType}(bb);`
        );
      } else if (
        fieldType &&
        definitions[fieldType] &&
        definitions[fieldType].kind === "UNION"
      ) {
        const key = quote(field.name + "Type");
        lines.push(
          indent + "result[" + key + "] = " + "bb.readVarUint()" + ";",
          indent +
            "result[" +
            quote(field.name) +
            "] = " +
            `${"decode" + fieldType}(bb, result[${key}]);`
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
  functionName: string,
  definition: Definition,
  definitions: { [name: string]: Definition },
  aliases: AliasMap
): string {
  let lines: string[] = [];

  if (definition.kind === "UNION") {
    const discriminator = definition.fields[0];
    const hasDiscriminator = discriminator.type === "discriminator";

    lines.push(`function ${functionName}(message, bb, type = 0) {`);
    if (hasDiscriminator) {
      lines.push(
        `  type = type ? type : ${definition.name}[message[${quote(
          discriminator.name
        )}]];`
      );
      lines.push(
        `  if (!type) throw new Error('Expected message[${quote(
          discriminator.name
        )}] to be one of ' + JSON.stringify(${definition.name}) + ' ');`
      );
    } else {
      lines.push(
        `  if (!type) throw new Error('Expected type to be one of ' + JSON.stringify(${definition.name}, null, 2) + ' ');`
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
      lines.push(`      ${"encode" + field.name}(message, bb)`);
      lines.push(`      break;`);
      lines.push(`    }`);
    }
    lines.push(`    default: {`);
    lines.push(
      `      throw new Error('Expected message[${quote(
        discriminator.name
      )}] to be one of ' + JSON.stringify(${definition.name}) + ' ');`
    );
    lines.push(`    }`);

    lines.push(`  }`);
    lines.push("");
    lines.push("}");
    return lines.join("\n");
  } else {
    lines.push(`function ${functionName}(message, bb) {`);
  }

  for (let j = 0; j < definition.fields.length; j++) {
    let field = definition.fields[j];
    let code: string;

    if (field.isDeprecated) {
      continue;
    }

    let fieldType = field.type;
    if (aliases[fieldType]) fieldType = aliases[fieldType];

    switch (fieldType) {
      case "bool": {
        code = "bb.writeByte(value);";
        break;
      }

      case "byte": {
        code = "bb.writeByte(value);"; // only used if not array
        break;
      }

      case "alphanumeric": {
        code = "bb.writeAlphanumeric(value);";
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

      case "lowp": {
        code = "bb.writeLowPrecisionFloat(value);";
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
        let type = definitions[fieldType!];
        if (!type) {
          throw new Error(
            "Invalid type " +
              quote(fieldType!) +
              " for field " +
              quote(field.name)
          );
        } else if (type.kind === "ENUM") {
          code =
            "var encoded = " +
            type.name +
            "[value];\n" +
            'if (encoded === void 0) throw new Error("Invalid value " + JSON.stringify(value) + ' +
            quote(" for enum " + quote(type.name)) +
            ");\n" +
            "bb.writeVarUint(encoded);";
        } else if (type.kind === "SMOL") {
          code =
            "var encoded = " +
            type.name +
            "[value];\n" +
            'if (encoded === void 0) throw new Error("Invalid value " + JSON.stringify(value) + ' +
            quote(" for enum " + quote(type.name)) +
            ");\n" +
            "bb.writeByte(encoded);";
        } else if (
          type.kind === "UNION" &&
          isDiscriminatedUnion(type.name, definitions)
        ) {
          code = "" + ("encode" + type.name) + "(value, bb);";
        } else if (type.kind === "UNION") {
          code =
            "var encoded = " +
            type.name +
            `[message[${quote(field.name + "Type")}]];\n` +
            `    if (encoded === void 0) throw new Error('Expected ${quote(
              field.name + "Type"
            )} to be one of ' + JSON.stringify(${
              type.name
            },null,2) + ' for enum ${quote(type.name)}');`;
          code += "" + ("encode" + type.name) + "(value, bb, encoded);";
        } else {
          code = "" + ("encode" + type.name) + "(value, bb);";
        }
      }
    }

    lines.push("");

    if (fieldType === "discriminator") {
      error("Unexpected discriminator", field.line, field.column);
    } else {
      lines.push("  var value = message[" + quote(field.name) + "];");
      lines.push("  if (value != null) {"); // Comparing with null using "!=" also checks for undefined
    }

    if (definition.kind === "MESSAGE") {
      lines.push("    bb.writeByte(" + field.value + ");");
    }

    if (field.isArray) {
      let indent = "   ";
      switch (fieldType) {
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

export function compileSchemaJS(
  schema: Schema,
  isESM: boolean = false,
  withAllocator = false
): string {
  let definitions: { [name: string]: Definition } = {};
  let aliases: { [name: string]: string } = {};
  let name = schema.package;
  let js: string[] = [];
  const exportsList = [];
  const importsList = [];

  if (isESM) {
    name = "exports";
  } else {
    if (name !== null) {
      js.push("var " + name + " = exports || " + name + " || {}, exports;");
    } else {
      js.push("var exports = exports || {};");
      name = "exports";
    }
  }

  for (let i = 0; i < schema.definitions.length; i++) {
    let definition = schema.definitions[i];
    definitions[definition.name] = definition;

    if (definition.kind === "ALIAS") {
      aliases[definition.name] = definition.fields[0].name;
    }
    if (isESM && definition.serializerPath?.length) {
      importsList.push(
        `import {encode${definition.name}, decode${definition.name}} from "${definition.serializerPath}";`
      );
    }
  }

  for (let i = 0; i < schema.definitions.length; i++) {
    let definition = schema.definitions[i];
    if (definition.kind === "ALIAS") continue;

    switch (definition.kind) {
      case "SMOL":
      case "ENUM": {
        let value: any = {};
        let keys: any = {};
        for (let j = 0; j < definition.fields.length; j++) {
          let field = definition.fields[j];
          value[field.name] = field.value;
          value[field.value] = field.value;
          keys[field.name] = field.name;
          keys[field.value] = field.name;
        }
        exportsList.push(definition.name, definition.name + "Keys");
        js.push(
          "const " +
            definition.name +
            " = " +
            JSON.stringify(value, null, 2) +
            ";"
        );
        js.push(
          "const " +
            definition.name +
            "Keys = " +
            JSON.stringify(keys, null, 2) +
            ";"
        );
        break;
      }

      case "UNION": {
        let value: any = {};
        let keys: any = {};
        const encoders = new Array(definition.fields.length);
        encoders.fill("() => null");
        for (let j = 0; j < definition.fields.length; j++) {
          let field = definition.fields[j];
          let fieldType = field.type;
          if (field.value > 0) {
            if (aliases[field.name]) field.name = aliases[field.name];
            value[field.name] = field.value;
            value[field.value] = field.value;
            keys[field.name] = field.name;
            keys[field.value] = field.name;

            encoders[field.value] = "encode" + fieldType;
          }
        }
        exportsList.push(definition.name);
        js.push(
          "const " +
            definition.name +
            " = " +
            JSON.stringify(value, null, 2) +
            ";"
        );
        js.push(
          "const " +
            definition.name +
            "Keys = " +
            JSON.stringify(keys, null, 2) +
            ";"
        );

        exportsList.push(`${definition.name}Keys`);
        js.push("const " + definition.name + "Type = " + definition.name + ";");
        exportsList.push(definition.name + "Type");
        const encoderName = encoders.join(" , ");
        js.push(
          "const encode" +
            definition.name +
            "ByType" +
            " = (function() { return " +
            "[" +
            encoderName +
            "]; })()"
        );
      }
      case "STRUCT":
      case "MESSAGE": {
        exportsList.push(
          "decode" + definition.name,
          "encode" + definition.name
        );

        if (!isESM || !definition.serializerPath?.length) {
          js.push("");
          js.push(
            compileDecode(
              "decode" + definition.name,
              definition,
              definitions,
              withAllocator,
              aliases
            )
          );
          js.push("");
          js.push(
            compileEncode(
              "encode" + definition.name,
              definition,
              definitions,
              aliases
            )
          );
        }
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
  if (isESM) {
    for (let importName of importsList) {
      js.unshift(importName);
    }

    for (let exportName of exportsList) {
      js.push(`export { ${exportName} }`);
    }
  } else {
    for (let exportName of exportsList) {
      js.push(`exports[${quote(exportName)}] = ${exportName};`);
    }
  }

  return js.join("\n");
}

interface IAllocator {
  alloc(): Object;
}

export function compileSchema(
  schema: Schema | string,
  useESM: boolean = false,
  Allocator?: { [key: string]: IAllocator } | string
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
  let out = compileSchemaJS(schema, useESM, !!Allocator);
  if (useESM) {
    if (Allocator) {
      out = `import * as Allocator from "${Allocator as string}";\n\n${out}`;
    }

    return out;
  } else {
    new Function("exports", out)(result);
    return result;
  }
}
