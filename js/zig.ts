import { camelCase, pascalCase, snakeCase } from "change-case";
import { parseSchema } from "./parser";
import { Definition, Schema } from "./schema";
import { error, quote } from "./util";

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
  string: "[]u8",
  uint: "u32",
  alphanumeric: "[]u8",
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
  lines.push(
    `pub fn decode(allocator: *std.mem.Allocator, reader: anytype) anyerror!${pascalCase(
      definition.name
    )} {`,
    `var obj = std.mem.zeroes(${pascalCase(definition.name)});`,
    `try update(&obj, allocator, reader);`,
    `return obj;`,
    `}`
  );
  lines.push(
    `pub fn update(result: *${pascalCase(
      definition.name
    )}, allocator: *std.mem.Allocator, reader: anytype) anyerror!void {`
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
    lines.push("    const field_type: u8 = try reader.readByte(); ");
    lines.push("    switch (field_type) {");
    lines.push("      0 => { return; },");
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

    const isPrimitiveType =
      TYPE_NAMES[fieldType] ||
      ["SMOL", "ENUM"].includes(definitions[fieldType].kind);

    switch (fieldType) {
      case "bool": {
        code = "(try reader.readByte()) == @as(u8, 1)";
        if (!field.isArray) {
          code = `result.${snakeCase(field.name)} = ${code}`;
        }
        break;
      }

      case "uint8":
      case "byte": {
        code = "try reader.readByte()"; // only used if not array
        break;
      }

      case "int16":
      case "int8":
      case "int32":
      case "int":
      case "uint16":
      case "uint32":
      case "lowp":
      case "uint":
      case "float32":
      case "float": {
        if (field.isArray) {
          code = `_ = try reader.readAll(std.mem.asBytes(&result.${snakeCase(
            field.name
          )}[j]))`;
        } else {
          code = `_ = try reader.readAll(std.mem.asBytes(&result.${snakeCase(
            field.name
          )}))`;
        }

        break;
      }

      case "alphanumeric":
      case "string": {
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
          code = `try reader.readEnum(${pascalCase(type.name)}, .Little)`;
          if (!field.isArray) {
            code = `result.${snakeCase(field.name)} = ${code}`;
          }
        } else if (type.kind === "SMOL") {
          code = `try reader.readEnum(${pascalCase(type.name)}, .Little)`;
          if (!field.isArray) {
            code = `result.${snakeCase(field.name)} = ${code}`;
          }
        } else {
          code = `try ${pascalCase(type.name)}.decode(allocator, reader)`;
        }
      }
    }

    if (definition.kind === "MESSAGE") {
      lines.push("     " + field.value + " => {");
    }

    if (
      field.isArray ||
      fieldType === "string" ||
      fieldType === "alphanumeric"
    ) {
      if (field.isDeprecated) {
        if (has_length) {
          lines.push(indent + `length = try reader.readIntNative(u32);`);
        } else {
          lines.push(indent + `var length =try  reader.readIntNative(u32);`);
        }

        lines.push(
          indent + `while (length > 0) : (i += 1) { ${code}; length++; }`
        );
      } else {
        switch (fieldType) {
          case "byte": {
            // if (!hasErr) {
            //   lines.splice(startLine, 1, lines[startLine], "var err error;");
            //   hasErr = true;
            // }
            if (!hasLength) {
              lines.splice(
                startLine,
                1,
                lines[startLine],
                indent + `var length: usize = 0;`
              );
              hasLength = true;
            }

            lines.push(
              indent +
                `length = @intCast(usize, try reader.readIntNative(u32));`
            );

            lines.push(
              indent + `if (result.${snakeCase(field.name)} != length) { `,
              indent +
                `result.${snakeCase(
                  field.name
                )} = try allocator.alloc(u8, length);`,
              indent + `}`,
              indent +
                `_ = try reader.readAll(result.${snakeCase(field.name)});`
              // indent + `  if err != nil {`,
              // indent + `    return result, err`,
              // indent + `  }`
            );
            break;
          }

          case "alphanumeric":
          case "string": {
            if (field.isArray) {
              lines.push(indent + `{`);
              lines.push(
                indent + "var array_count = try reader.readIntNative(u32);"
              );

              lines.push(
                indent +
                  `if (array_count != result.${snakeCase(field.name)}.len) {`
              );
              lines.push(
                indent +
                  `result.${snakeCase(
                    field.name
                  )} = try allocator.alloc([]u8, array_count);`
              );
              lines.push(indent + `}`);
            }

            if (!hasLength) {
              lines.splice(
                startLine,
                1,
                lines[startLine],
                indent + `var length: usize = 0;`
              );
              hasLength = true;
            }
            lines.push(indent + `length = try reader.readIntNative(u32);`);
            if (field.isArray) {
              lines.push(
                indent + `for (result.${snakeCase(field.name)}) |content, j| {`,
                indent +
                  `if (result.${snakeCase(
                    field.name
                  )}[j].len != length and length > 0) {`
              );
              lines.push(
                indent +
                  `result.${snakeCase(
                    field.name
                  )}[j] = try allocator.alloc(u8, length);`
              );
            } else {
              if (definition.kind === "MESSAGE") {
                lines.push(
                  indent +
                    `if ((result.${snakeCase(
                      field.name
                    )} orelse &([_]u8{})).len != length and length >) {`
                );
              } else {
                lines.push(
                  indent +
                    `if (result.${snakeCase(field.name)}.len != length) {`
                );
              }

              lines.push(
                indent +
                  `result.${snakeCase(
                    field.name
                  )} = try allocator.alloc(u8, length);`
              );
            }

            const maybeOptional = definition.kind === "MESSAGE" ? ".?" : "";
            lines.push(indent + `}`);
            if (field.isArray) {
              lines.push(
                indent +
                  `_ = try reader.readAll(result.${snakeCase(
                    field.name
                  )}[j]${maybeOptional});`,
                indent + `}`,
                indent + indent + `}`
              );
            } else {
              lines.push(
                indent +
                  `_ = try reader.readAll(result.${snakeCase(
                    field.name
                  )}${maybeOptional});`
              );
            }
            break;
          }

          case "uint16":
          case "uint32":
          case "int8":
          case "int16":
          case "int32":
          case "float32": {
            if (!hasLength) {
              lines.splice(
                startLine,
                1,
                lines[startLine],
                indent + `var length: usize = 0;`
              );
              hasLength = true;
            }
            lines.push(indent + `length = try reader.readIntNative(u32);`);

            lines.push(
              indent + `if (result.${snakeCase(field.name)} != length) { `,
              indent +
                `result.${snakeCase(field.name)} = try allocator.alloc(${
                  TYPE_NAMES[field.type]
                }, length);`,
              indent +
                `try result.reader.readAll(std.mem.sliceAsBytes(result.${snakeCase(
                  field.name
                )})); `,
              indent + `}`
            );
            break;
          }
          default: {
            if (!hasLength) {
              lines.splice(
                startLine,
                1,
                lines[startLine],
                indent + `var length: usize = 0;`
              );
              hasLength = true;
            }
            lines.push(indent + `length = try reader.readIntNative(u32);`);

            let arrayName = "";
            if (definition.kind === "MESSAGE") {
              arrayName = `result.${snakeCase(field.name)}`;
              lines.push(
                indent +
                  `if (result.${snakeCase(field.name)} != length) { 
                      result.${snakeCase(field.name)} = try allocator.alloc(${
                    TYPE_NAMES[fieldType]
                      ? TYPE_NAMES[fieldType]
                      : pascalCase(fieldType)
                  }, length);
                    }`
              );
            } else {
              arrayName = `result.${snakeCase(field.name)}`;
              lines.push(
                indent +
                  `${arrayName} = try allocator.alloc(${
                    TYPE_NAMES[fieldType]
                      ? TYPE_NAMES[fieldType]
                      : pascalCase(fieldType)
                  }, length);`
              );
            }

            lines.push(indent + `{`);

            if (definition.kind !== "MESSAGE" && has_j) {
              lines.push(indent + `j = 0;`);
            } else {
              lines.push(indent + `var j: usize = 0;`);
            }

            lines.push(indent + `while(j < length) : (j += 1) {`);
            if (
              isPrimitiveType &&
              definitions[fieldType]?.kind !== "ENUM" &&
              definitions[fieldType]?.kind !== "SMOL"
            ) {
              lines.push(`     ${code};`);
            } else {
              lines.push(`     ${arrayName}[j] = ${code};`);
            }

            // scope to prevent variable name collisions
            lines.push(indent + "}}");

            break;
          }
        }
      }
    } else if (fieldType && isDiscriminatedUnion(fieldType, definitions)) {
      // lines.push(
      //   indent +
      //     result.${snakeCase(field.name)} =
      //     "] = " +
      //     `${"decode" + fieldType}(bb);`
      // );
    } else if (
      fieldType &&
      definitions[fieldType] &&
      definitions[fieldType].kind === "UNION"
    ) {
      // const key = quote(field.name + "Type");
      // lines.push(
      //   indent + `result[" + key + "] = " + "reader.readVarUint()" + ";`,
      //   indent +
      //     result.${snakeCase(field.name)} =
      //     "] = " +
      //     `${"decode" + fieldType}(bb, result[${key}]);`
      // );
    } else if (isPrimitiveType) {
      if (field.isDeprecated) {
        lines.push(indent + code + ";");
      } else {
        lines.push(indent + `${code};`);
      }
    } else {
      // if (!hasErr) {
      //   lines.splice(startLine, 1, lines[startLine], "var err error;");
      //   hasErr = true;
      // }
      if (field.isDeprecated) {
        lines.push(indent + code + ";");
      } else if (definition.kind === "MESSAGE") {
        lines.push(indent + `result.${snakeCase(field.name)} = ${code};`);
      } else {
        lines.push(indent + `result.${snakeCase(field.name)} = ${code};`);
      }
    }

    if (definition.kind === "MESSAGE") {
      // lines.push("      break;");
      lines.push("},");
    }
  }

  if (definition.kind === "MESSAGE") {
    lines.push("    else => {");
    lines.push("      return error.InvalidMessage;");
    lines.push("    }");
    lines.push("  }}");
  } else if (definition.kind === "UNION") {
    lines.push("    else => {");
    lines.push(`      return error.InvalidMessage;`);
    lines.push("  }");
  } else {
    lines.push("  return;");
  }

  lines.push("}");

  return lines.join("\n");
}

function compileEncode(
  definition: Definition,
  definitions: { [name: string]: Definition },
  aliases: AliasMap
): string {
  let lines: string[] = [];

  lines.push(
    `pub fn encode(result: *const @This(), writer: anytype) anyerror!void {`
  );

  let hasN = false;

  let startLine = lines.length;
  let hasErr = false;

  for (let j = 0; j < definition.fields.length; j++) {
    let field = definition.fields[j];
    let code: string;
    var fieldName = snakeCase(field.name);

    if (field.isDeprecated) {
      continue;
    }

    let fieldType = field.type;
    if (aliases[fieldType]) fieldType = aliases[fieldType];

    const isPrimitiveType =
      TYPE_NAMES[fieldType] ||
      ["SMOL", "ENUM"].includes(definitions[fieldType].kind);

    let valueName =
      field.isArray &&
      !["int16", "uint16", "uint32", "int32", "float32", "byte"].includes(
        fieldType
      )
        ? definition.kind === "MESSAGE"
          ? `${fieldName}[j]`
          : `result.${fieldName}[j]`
        : definition.kind === "MESSAGE"
        ? fieldName
        : `result.${fieldName}`;

    switch (fieldType) {
      case "bool": {
        code = `try writer.writeByte(@boolToInt(${valueName}));`;
        break;
      }

      case "byte": {
        code = `try writer.writeByte(${valueName});`;
        break;
      }

      case "int8": {
        code = `try writer.writeIntNative(i8, ${valueName});`;
        break;
      }

      case "alphanumeric": {
        code = `try writer.writeAll(${valueName});`;
        break;
      }

      case "int16": {
        code = `try writer.writeIntNative(i16, ${valueName});`;
        break;
      }

      case "int":
      case "int32": {
        code = `try writer.writeIntNative(i32, ${valueName});`;
        break;
      }

      case "lowp": {
        code = `@compileError("Not implemented yet")`;
        break;
      }

      case "uint8": {
        code = `try writer.writeByte(${valueName});`;
        break;
      }

      case "uint16": {
        code = `try writer.writeIntNative(u16, ${valueName});`;
        break;
      }

      case "uint":
      case "uint32": {
        code = `try writer.writeIntNative(u32, ${valueName});`;
        break;
      }

      case "float": {
        code = `@compileError("Not implemented yet")`;
        break;
      }

      case "float32": {
        code = `try writer.writeIntNative(u32, ${valueName});`;
        break;
      }

      case "string": {
        code = `try writer.writeAll(std.mem.sliceAsBytes(${valueName}));`;
        break;
      }

      case "discriminator": {
        throw "Discriminator not implmeneted";
        code = `writer.writeVarUint(type);`;
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
        } else if (type.kind === "ENUM" && !field.isArray) {
          var inner = `@enumToInt(result.${fieldName})`;
          if (definition.kind === "MESSAGE") {
            inner = `@enumToInt(result.${fieldName} orelse unreachable)`;
          }

          code = `try writer.writeIntNative(@TypeOf(${inner}), ${inner});`;
        } else if (type.kind === "SMOL" && !field.isArray) {
          var inner = `@enumToInt(result.${fieldName})`;
          if (definition.kind === "MESSAGE") {
            inner = `@enumToInt(result.${fieldName} orelse unreachable)`;
          }

          code = `try writer.writeIntNative(@TypeOf(${inner}), ${inner});`;
        } else if (type.kind === "ENUM" && field.isArray) {
          if (definition.kind === "MESSAGE") {
            code = `try writer.writeByte(@enumToInt(result.${fieldName}[j] orelse unreachable))`;
          } else {
            code = `try writer.writeByte(@enumToInt(result.${fieldName}[j]))`;
          }
        } else if (type.kind === "SMOL" && field.isArray) {
          if (definition.kind === "MESSAGE") {
            code = `try writer.writeByte(@enumToInt(result.${fieldName}[j] orelse unreachable))`;
          } else {
            code = `try writer.writeByte(@enumToInt(result.${fieldName}[j]))`;
          }
        } else if (
          type.kind === "UNION" &&
          isDiscriminatedUnion(type.name, definitions)
        ) {
          throw "Unsupported";
        } else if (type.kind === "UNION") {
          throw "Unsupported";
        } else {
          if (field.isArray && definition.kind === "MESSAGE") {
            code = `try ${valueName}[j].encode(writer)`;
          } else if (definition.kind === "MESSAGE") {
            code = `try ${valueName}.encode(writer)`;
          } else if (field.isArray) {
            code = `try ${valueName}.encode(writer)`;
          } else {
            code = `try ${valueName}.encode(writer)`;
          }
        }
      }
    }

    lines.push("");

    if (fieldType === "discriminator") {
      error("Unexpected discriminator", field.line, field.column);
    } else if (definition.kind === "MESSAGE") {
      lines.push(`  if (result.${fieldName}) |${snakeCase(fieldName)}| {`); // Comparing with null using "!=" also checks for undefined
      fieldName = snakeCase(fieldName);
    }

    if (definition.kind === "MESSAGE") {
      lines.push(`    try writer.writeByte(${field.value});`);
    }

    if (field.isArray) {
      let indent = "   ";
      switch (fieldType) {
        case "byte": {
          if (definition.kind === "MESSAGE") {
            // valueName = "" + valueName;
          }
          lines.push(
            indent +
              `try writer.writeIntNative(u32, @intCast(u32, ${valueName}.len));`,
            indent + `try writer.writeAll(${valueName});`
          );
          break;
        }

        case "uint16":
        case "uint32":
        case "int8":
        case "int16":
        case "int32":
        case "float32": {
          lines.push(
            indent +
              `try writer.writeIntNative(u32, @intCast(u32, ${valueName}.len));`,
            indent + `try writer.writeAll(std.mem.sliceAsBytes(${valueName}));`
          );
          break;
        }
        default: {
          if (!hasN) {
            lines.splice(
              startLine,
              1,
              lines[startLine],
              `    var n: usize = 0;`
            );
            hasN = true;
          }

          if (definition.kind === "MESSAGE") {
            lines.push(`    n = result.${fieldName}.len;`);
          } else {
            lines.push(`    n = result.${fieldName}.len;`);
          }

          lines.push(
            `    _ = try writer.writeIntNative(u32, @intCast(u32, n));`
          );
          lines.push(
            `    {`,
            ` var j: usize = 0;`,
            `   while (j < n) : (j += 1) {`
          );

          if (
            TYPE_NAMES[fieldType] === TYPE_NAMES.string ||
            TYPE_NAMES[fieldType] === TYPE_NAMES.alphanumeric
          ) {
            lines.push(
              `     _ = try writer.writeIntNative(u32, @intCast(u32, result.${snakeCase(
                field.name
              )}[j].len));`
            );
          }
          if (!code.trim().endsWith(";")) {
            code += ";";
          }

          if (
            !TYPE_NAMES[fieldType] &&
            ["STRUCT", "MESSAGE"].includes(definitions[fieldType].kind)
          ) {
            lines.push(`      ${code}`);
            lines.push(`     `);
          } else {
            lines.push(`      ${code}`);
          }
          lines.push(`    }}`);
        }
      }
    } else if (TYPE_NAMES[fieldType]) {
      if (
        TYPE_NAMES[fieldType] === TYPE_NAMES.string ||
        TYPE_NAMES[fieldType] === TYPE_NAMES.alphanumeric
      ) {
        const name =
          definition.kind !== "MESSAGE"
            ? `result.${snakeCase(field.name)}`
            : snakeCase(field.name);
        lines.push(
          `    try writer.writeIntNative(u32, @intCast(u32, ${name}.len));`
        );
      }
      if (!code.trim().endsWith(";")) {
        code += ";";
      }
      lines.push("    " + code);
    } else if (["ENUM", "SMOL"].includes(definitions[field.type].kind)) {
      if (!code.trim().endsWith(";")) {
        code += ";";
      }
      lines.push("    " + code);
    } else {
      if (!code.trim().endsWith(";")) {
        code += ";";
      }
      lines.push("    " + code);
    }

    if (definition.kind === "MESSAGE") {
      lines.push("   }");
    }
  }

  // A field id of zero is reserved to indicate the end of the message
  if (definition.kind === "MESSAGE") {
    // lines.push("  }");
    lines.push("  try writer.writeByte(0);");
  }

  lines.push("  return;");
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
  go.push(`const std = @import("std");`);
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
        go.push(`pub const ${pascalCase(definition.name)} = struct {`);
        for (let j = 0; j < definition.fields.length; j++) {
          let field = definition.fields[j];

          let isPrimitive =
            TYPE_NAMES[field.type] ||
            ["SMOL", "ENUM"].includes(definitions[field.type].kind);
          let typeName = "";

          let singleTypeName =
            TYPE_NAMES[field.type] || pascalCase(definitions[field.type].name);

          let isOptional = definition.kind === "MESSAGE";
          if (field.isArray && isPrimitive) {
            typeName = "[]" + singleTypeName;
          } else if (field.isArray) {
            typeName = "[]" + singleTypeName;
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
