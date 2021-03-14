import { camelCase, pascalCase, snakeCase } from "change-case";
import { parseSchema } from "./parser";
import { Definition, Schema } from "./schema";
import { error, quote } from "./util";

const TYPE_NAMES = {
  bool: "bool",
  byte: "byte",
  float: "float32",
  int: "int",
  uint8: "uint8",
  uint16: "uint16",
  uint32: "uint32",
  int8: "int8",
  int16: "int16",
  float32: "float32",
  int32: "int32",
  lowp: "float32",
  string: "string",
  uint: "uint",
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
  //     lines.push("  switch (buf.ReadVarUint()) {");
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
    `func Decode${pascalCase(
      definition.name
    )}(buf *buffer.Buffer) (${pascalCase(definition.name)}, error) {`
  );

  let hasLength = false;

  // if (!withAllocator) {
  lines.push(`   result := ${pascalCase(definition.name)}{}`);
  let startLine = lines.length;
  // } else {
  //   lines.push(
  //     "  var result = Allocator[" + quote(definition.name) + "].alloc();"
  //   );
  // }

  lines.push("");
  var hasErr = false;

  if (definition.kind === "MESSAGE") {
    lines.push(`var fieldType uint;`);

    lines.push("  for {");
    lines.push("    switch fieldType = buf.ReadVarUint(); fieldType {");
    lines.push("    case 0:");
    lines.push("      return result, nil;");
    lines.push("");
    indent = "      ";
  }

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
        code = "buf.ReadBool()";
        break;
      }

      case "uint8":
      case "byte": {
        code = "buf.ReadByte()"; // only used if not array
        break;
      }

      case "int16": {
        code = "buf.ReadInt16()";
        break;
      }

      case "alphanumeric": {
        code = "buf.ReadAlphanumeric()";
        break;
      }

      case "int8": {
        code = "buf.ReadInt8()";
        break;
      }

      case "int32": {
        code = "buf.ReadInt32()";
        break;
      }

      case "int": {
        code = "buf.ReadVarInt()";
        break;
      }

      case "uint16": {
        code = "buf.ReadUint16()";
        break;
      }

      case "uint32": {
        code = "buf.ReadUint32()";
        break;
      }

      case "lowp": {
        code = "buf.ReadLowPrecisionFloat()";
        break;
      }

      case "uint": {
        code = "buf.ReadVarUint()";
        break;
      }

      case "float": {
        code = "buf.ReadVarFloat()";
        break;
      }

      case "float32": {
        code = "buf.ReadFloat32()";
        break;
      }

      case "string": {
        code = "buf.ReadString()";
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
          code = pascalCase(type.name) + "(buf.ReadVarUint())";
        } else if (type.kind === "SMOL") {
          code = pascalCase(type.name) + "(buf.ReadByte())";
        } else {
          code = "Decode" + pascalCase(type.name) + "(buf)";
        }
      }
    }

    if (definition.kind === "MESSAGE") {
      lines.push("    case " + field.value + ":");
    }

    if (field.isArray) {
      if (field.isDeprecated) {
        if (fieldType === "byte") {
          lines.push(indent + `buf.ReadByteArray();`);
        } else {
          lines.push(indent + `var length = buf.ReadVarUint();`);
          lines.push(indent + `for (length > 0) { ${code}; length++; }`);
        }
      } else {
        switch (fieldType) {
          case "byte": {
            // if (!hasErr) {
            //   lines.splice(startLine, 1, lines[startLine], "var err error;");
            //   hasErr = true;
            // }

            lines.push(
              indent +
                ` result.${pascalCase(field.name)} = buf.ReadByteArray();`
              // indent + `  if err != nil {`,
              // indent + `    return result, err`,
              // indent + `  }`
            );
            break;
          }
          case "uint16": {
            lines.push(
              indent +
                `result.${pascalCase(field.name)} = buf.ReadUint16Array();`
            );
            break;
          }
          case "uint32": {
            lines.push(
              indent +
                `result.${pascalCase(field.name)} = buf.ReadUint32Array();`
            );
            break;
          }
          case "int8": {
            lines.push(
              indent + `result.${pascalCase(field.name)} = buf.ReadInt8Array();`
            );
            break;
          }
          case "int16": {
            lines.push(
              indent +
                `result.${pascalCase(field.name)} = buf.ReadInt16Array();`
            );
            break;
          }
          case "int32": {
            lines.push(
              indent +
                `result.${pascalCase(field.name)} = buf.ReadInt32Array();`
            );
            break;
          }
          case "float32": {
            lines.push(
              indent +
                `result.${pascalCase(field.name)} = buf.ReadFloat32Array();`
            );
            break;
          }
          default: {
            if (!hasLength) {
              lines.splice(
                startLine,
                1,
                lines[startLine],
                indent + `var length uint;`
              );
              hasLength = true;
            }
            lines.push(indent + `length = buf.ReadVarUint();`);

            let arrayName = "";
            if (definition.kind === "MESSAGE") {
              arrayName = `${pascalCase(field.name)}_a_${i}`;
              lines.push(
                indent +
                  `${arrayName} := make([]${
                    TYPE_NAMES[fieldType]
                      ? TYPE_NAMES[fieldType]
                      : pascalCase(fieldType)
                  }, length)`,
                indent + `result.${pascalCase(field.name)} = &${arrayName}`
              );
            } else {
              arrayName = `result.${pascalCase(field.name)}`;
              lines.push(
                indent +
                  `${arrayName} = make([]${
                    TYPE_NAMES[fieldType]
                      ? TYPE_NAMES[fieldType]
                      : pascalCase(fieldType)
                  }, length)`
              );
            }

            if (isPrimitiveType) {
              if (definition.kind === "MESSAGE") {
                lines.push(
                  indent +
                    `var ${snakeCase(field.name)}_${i} ${
                      TYPE_NAMES[field.type]
                    };`
                );

                lines.push(indent + `for j := uint(0); j < length; j++ {`);
                lines.push(
                  indent + `   ${snakeCase(field.name)}_${i} = ${code}`
                );

                lines.push(
                  `     ${arrayName}[j] = ${snakeCase(field.name)}_${i}`
                );
                lines.push(indent + "}");
              } else {
                lines.push(
                  indent +
                    `for j := uint(0); j < length; j++ { ${arrayName}[j] = ` +
                    code +
                    "; }"
                );
              }
            } else {
              if (definition.kind === "MESSAGE") {
                lines.push(indent + `var err error;`);
                lines.push(
                  // indent + `var val *${field.type};`,
                  indent + `for j := uint(0); j < length; j++ {\n`,
                  indent + ` ${arrayName}[j], err = ${code}`,
                  indent + `if (err != nil) {`,
                  indent + `return result, err;`,
                  indent + `}`,
                  // `          = val`,
                  indent + `}`
                );
              } else {
                lines.push(indent + `var err error;`);
                lines.push(
                  indent +
                    `for j := uint(0); j < length; j++ {\n ${arrayName}[j], err = ` +
                    code +
                    ";\n if (err != nil) {\n return nil, err;\n}\n}"
                );
              }
            }

            break;
          }
        }
      }
    } else if (fieldType && isDiscriminatedUnion(fieldType, definitions)) {
      // lines.push(
      //   indent +
      //     result.${pascalCase(field.name)} =
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
      //   indent + `result[" + key + "] = " + "buf.ReadVarUint()" + ";`,
      //   indent +
      //     result.${pascalCase(field.name)} =
      //     "] = " +
      //     `${"decode" + fieldType}(bb, result[${key}]);`
      // );
    } else if (isPrimitiveType) {
      if (field.isDeprecated) {
        lines.push(indent + code + ";");
      } else if (definition.kind === "MESSAGE") {
        lines.push(indent + `${snakeCase(field.name)}_${i} := ${code}`);
        lines.push(
          indent +
            `result.${pascalCase(field.name)} = &${snakeCase(field.name)}_${i}`
        );
      } else {
        lines.push(indent + `result.${pascalCase(field.name)} = ${code}`);
      }
    } else {
      // if (!hasErr) {
      //   lines.splice(startLine, 1, lines[startLine], "var err error;");
      //   hasErr = true;
      // }
      if (field.isDeprecated) {
        lines.push(indent + code + ";");
      } else if (definition.kind === "MESSAGE") {
        lines.push(
          indent +
            `var ${snakeCase(field.name)}_${i} ${
              TYPE_NAMES[fieldType] || definitions[fieldType].name
            };`
        );
        lines.push(indent + `${snakeCase(field.name)}_${i}, err = ${code}`);
        lines.push(
          indent +
            `result.${pascalCase(field.name)} = &${snakeCase(field.name)}_${i}`
        );
      } else {
        lines.push(indent + `result.${pascalCase(field.name)}, err = ${code}`);
      }

      if (!hasErr) {
        lines.splice(startLine, 1, lines[startLine], "var err error;");
        hasErr = true;
      }

      lines.push(indent + `if err != nil {`);
      lines.push(indent + `  return result, err;`);
      lines.push(indent + `}`);
    }

    if (definition.kind === "MESSAGE") {
      // lines.push("      break;");
      lines.push("");
    }
  }

  if (definition.kind === "MESSAGE") {
    lines.push("    default:");
    lines.push(
      '      return result, errors.New("Attempted to parse invalid message");'
    );
    lines.push("    }");
    lines.push("  }");
  } else if (definition.kind === "UNION") {
    lines.push("    default:");
    lines.push(
      `      return result, errors.New("Attempted to parse invalid union");`
    );
    lines.push("  }");
  } else {
    lines.push("  return result, nil;");
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
    `func (i *${pascalCase(
      definition.name
    )}) Encode(buf *buffer.Buffer) error {`
  );

  let hasN = false;

  let startLine = lines.length;
  let hasErr = false;

  for (let j = 0; j < definition.fields.length; j++) {
    let field = definition.fields[j];
    let code: string;
    const fieldName = pascalCase(field.name);

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
          ? `(*i.${fieldName})[j]`
          : `i.${fieldName}[j]`
        : `i.${fieldName}`;
    if (definition.kind === "MESSAGE" && field.isArray) {
    } else if (definition.kind === "MESSAGE") {
      valueName = "*" + valueName;
    }

    switch (fieldType) {
      case "bool": {
        code = `buf.WriteBool(${valueName});`;
        break;
      }

      case "byte": {
        code = `buf.WriteByte(${valueName});; // only used if not arr`;
        break;
      }

      case "int": {
        code = `buf.WriteVarInt(${valueName});`;
        break;
      }

      case "int8": {
        code = `buf.WriteInt8(${valueName});`;
        break;
      }

      case "int16": {
        code = `buf.WriteInt16(${valueName});`;
        break;
      }

      case "int32": {
        code = `buf.WriteInt32(${valueName});`;
        break;
      }

      case "uint": {
        code = `buf.WriteVarUint(${valueName});`;
        break;
      }

      case "lowp": {
        code = `buf.WriteLowPrecisionFloat(${valueName});`;
        break;
      }

      case "uint8": {
        code = `buf.WriteByte(${valueName});`;
        break;
      }

      case "uint16": {
        code = `buf.WriteUint16(${valueName});`;
        break;
      }

      case "uint32": {
        code = `buf.WriteUint32(${valueName});`;
        break;
      }

      case "float": {
        code = `buf.WriteVarFloat(${valueName});`;
        break;
      }

      case "float32": {
        code = `buf.WriteFloat32(${valueName});`;
        break;
      }

      case "string": {
        code = `buf.WriteString(${valueName});`;
        break;
      }

      case "discriminator": {
        throw "Discriminator not implmeneted";
        code = `buf.WriteVarUint(type);`;
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
          if (definition.kind === "MESSAGE") {
            code = `buf.WriteVarUint(uint(*i.${fieldName}))`;
          } else {
            code = `buf.WriteVarUint(uint(i.${fieldName}))`;
          }
        } else if (type.kind === "SMOL" && !field.isArray) {
          if (definition.kind === "MESSAGE") {
            code = `buf.WriteByte(byte(&i.${fieldName}))`;
          } else {
            code = `buf.WriteByte(byte(i.${fieldName}))`;
          }
        } else if (type.kind === "ENUM" && field.isArray) {
          if (definition.kind === "MESSAGE") {
            code = `buf.WriteVarUint(uint(i.${fieldName}[j]))`;
          } else {
            code = `buf.WriteVarUint(uint(i.${fieldName}[j]))`;
          }
        } else if (type.kind === "SMOL" && field.isArray) {
          if (definition.kind === "MESSAGE") {
            code = `buf.WriteByte(byte(i.${fieldName}[j]))`;
          } else {
            code = `buf.WriteByte(byte(i.${fieldName}[j]))`;
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
            code = `(*i.${pascalCase(field.name)})[j].Encode(buf)`;
          } else if (field.isArray) {
            code = `i.${pascalCase(field.name)}[j].Encode(buf)`;
          } else {
            code = `i.${pascalCase(field.name)}.Encode(buf)`;
          }
        }
      }
    }

    lines.push("");

    if (fieldType === "discriminator") {
      error("Unexpected discriminator", field.line, field.column);
    } else if (definition.kind === "MESSAGE") {
      lines.push(`  if i.${fieldName} != nil {`); // Comparing with null using "!=" also checks for undefined
    }

    if (definition.kind === "MESSAGE") {
      lines.push(`    buf.WriteVarUint(${field.value});`);
    }

    if (field.isArray) {
      let indent = "   ";
      switch (fieldType) {
        case "byte": {
          if (definition.kind === "MESSAGE") {
            valueName = "*" + valueName;
          }
          lines.push(indent + `buf.WriteByteArray(${valueName});`);
          break;
        }
        case "uint16": {
          lines.push(indent + `buf.WriteUint16Array(${valueName});`);
          break;
        }
        case "uint32": {
          lines.push(indent + `buf.WriteUint32Array(${valueName});`);
          break;
        }
        case "int8": {
          lines.push(indent + `buf.WriteInt8Array(${valueName});`);
          break;
        }
        case "int16": {
          lines.push(indent + `buf.WriteInt16Array(${valueName});`);
          break;
        }
        case "int32": {
          lines.push(indent + `buf.WriteInt32Array(${valueName});`);
          break;
        }
        case "float32": {
          lines.push(indent + `buf.WriteFloat32Array(${valueName});`);
          break;
        }
        default: {
          if (!hasN) {
            lines.splice(startLine, 1, lines[startLine], `    var n uint;`);
            hasN = true;
          }
          if (definition.kind === "MESSAGE") {
            lines.push(`    n = uint(len(*i.${fieldName}))`);
          } else {
            lines.push(`    n = uint(len(i.${fieldName}))`);
          }

          lines.push(`    buf.WriteVarUint(n);`);
          lines.push(`    for j := uint(0); j < n; j++ {`);

          if (
            !TYPE_NAMES[fieldType] &&
            ["STRUCT", "MESSAGE"].includes(definitions[fieldType].kind)
          ) {
            lines.push(`      err := ${code}`);
            lines.push(`      if err != nil {\nreturn err;\n}\n`);
          } else {
            lines.push(`      ${code}`);
          }
          lines.push(`    }`);
        }
      }
    } else if (TYPE_NAMES[fieldType]) {
      lines.push("    " + code);
    } else if (["ENUM", "SMOL"].includes(definitions[field.type].kind)) {
      lines.push("    " + code);
    } else {
      if (!hasErr) {
        lines.splice(startLine, 1, lines[startLine], "var err error;");
        hasErr = true;
      }
      lines.push("    err =" + code);
      lines.push("    if err != nil {\n return err\n}\n");
    }

    if (definition.kind === "MESSAGE") {
      lines.push("   }");
    }
  }

  // A field id of zero is reserved to indicate the end of the message
  if (definition.kind === "MESSAGE") {
    // lines.push("  }");
    lines.push("  buf.WriteVarUint(0);");
  }

  lines.push("  return nil");
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

  go.push(`package ${schema.package || "Schema"}`);
  go.push("");
  go.push("import (");
  go.push(` "errors"`);
  go.push(` "bytes"`);
  go.push(` "encoding/json"`);
  go.push(` "github.com/jarred-sumner/peechy/buffer"`);
  go.push(")");

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
        go.push(`type ${pascalCase(definition.name)} uint`);
        go.push("");

        go.push("const (");

        const constantValues = [];
        const stringValues = [];
        const invertValues = [];

        for (let j = 0; j < definition.fields.length; j++) {
          let field = definition.fields[j];
          const intName = `${pascalCase(definition.name)}${pascalCase(
            field.name
          )}`;
          constantValues.push(
            `  ${intName} ${pascalCase(definition.name)} = ${field.value}`
          );

          stringValues.push(`  "${intName}": ${intName},`);
          invertValues.push(`  ${intName}: "${intName}",`);
        }
        go.push(...constantValues);
        go.push("");
        go.push(")");
        go.push("");

        go.push(
          `var ${pascalCase(definition.name)}ToString = map[${pascalCase(
            definition.name
          )}]string{`
        );
        go.push(...invertValues);
        go.push("");
        go.push("}");
        go.push("");

        go.push(
          `var ${pascalCase(definition.name)}ToID = map[string]${pascalCase(
            definition.name
          )}{`
        );
        go.push(...stringValues);
        go.push("");
        go.push("}");
        go.push("");

        go.push(
          ...`
// MarshalJSON marshals the enum as a quoted json string
func (s ${pascalCase(definition.name)}) MarshalJSON() ([]byte, error) {
  buffer := bytes.NewBufferString(\`"\`)
  buffer.WriteString(${pascalCase(definition.name)}ToString[s])
  buffer.WriteString(\`"\`)
  return buffer.Bytes(), nil
}

// UnmarshalJSON unmashals a quoted json string to the enum value
func (s *${pascalCase(definition.name)}) UnmarshalJSON(b []byte) error {
  var j string
  err := json.Unmarshal(b, &j)
  if err != nil {
    return err
  }
  // Note that if the string cannot be found then it will be set to the zero value, 'Created' in this case.
  *s = ${pascalCase(definition.name)}ToID[j]
  return nil
}

        `.split("\n")
        );

        break;
      }

      case "UNION": {
        console.warn("Unions are unsupported.");
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
        go.push(`type ${definition.name} struct {`);
        for (let j = 0; j < definition.fields.length; j++) {
          let field = definition.fields[j];

          let isPrimitive =
            TYPE_NAMES[field.type] ||
            ["SMOL", "ENUM"].includes(definitions[field.type].kind);
          let typeName = "";

          let singleTypeName =
            TYPE_NAMES[field.type] || pascalCase(definitions[field.type].name);

          let usePointers = definition.kind === "MESSAGE";
          if (field.isArray && isPrimitive) {
            typeName = (usePointers ? "*" : "") + "[]" + singleTypeName;
          } else if (field.isArray) {
            typeName = (usePointers ? "*" : "") + "[]" + singleTypeName;
          } else if (isPrimitive) {
            typeName = (usePointers ? "*" : "") + singleTypeName;
          } else {
            typeName = (usePointers ? "*" : "") + singleTypeName;
          }

          go.push(
            `${pascalCase(field.name)}    ${typeName}     \`json:"${camelCase(
              field.name
            )}"\` `
          );
        }
        go.push(`}`);

        go.push("");
        go.push(compileDecode(definition, definitions, aliases));
        go.push("");
        go.push(compileEncode(definition, definitions, aliases));
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

  return go.join("\n");
}

interface IAllocator {
  alloc(): Object;
}

export function compileSchemaGo(schema: Schema | string): any {
  if (typeof schema === "string") {
    schema = parseSchema(schema);
  }
  return compileSchema(schema);
}
