import { camelCase, pascalCase } from "change-case";
import { parseSchema } from "./parser";
import { Definition, Schema } from "./schema";
import { error, quote } from "./util";

const TYPE_NAMES = {
  bool: "bool",
  byte: "byte",
  float: "float",
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
  //     lines.push("  switch (buffer.ReadVarUint()) {");
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
    `func Decode${pascalCase(definition.name)}(buffer *peechy.Buffer) {`
  );

  // if (!withAllocator) {
  lines.push(`   result := ${pascalCase(definition.name)}{}`);
  // } else {
  //   lines.push(
  //     "  var result = Allocator[" + quote(definition.name) + "].alloc();"
  //   );
  // }

  lines.push("");

  if (definition.kind === "MESSAGE") {
    lines.push("  for {");
    lines.push("    switch (buffer.ReadVarUint()) {");
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
        code = "buffer.ReadBool()";
        break;
      }

      case "uint8":
      case "byte": {
        code = "buffer.ReadByte()"; // only used if not array
        break;
      }

      case "int16": {
        code = "buffer.ReadInt16()";
        break;
      }

      case "alphanumeric": {
        code = "buffer.ReadAlphanumeric()";
        break;
      }

      case "int8": {
        code = "buffer.ReadInt8()";
        break;
      }

      case "int32": {
        code = "buffer.ReadInt32()";
        break;
      }

      case "int": {
        code = "buffer.ReadVarInt()";
        break;
      }

      case "uint16": {
        code = "buffer.ReadUint16()";
        break;
      }

      case "uint32": {
        code = "buffer.ReadUint32()";
        break;
      }

      case "lowp": {
        code = "buffer.ReadLowPrecisionFloat()";
        break;
      }

      case "uint": {
        code = "buffer.ReadVarUint()";
        break;
      }

      case "float": {
        code = "buffer.ReadVarFloat()";
        break;
      }

      case "float32": {
        code = "buffer.ReadFloat32()";
        break;
      }

      case "string": {
        code = "buffer.ReadString()";
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
          code = pascalCase(type.name) + "(buffer.ReadVarUint())";
        } else if (type.kind === "SMOL") {
          code = pascalCase(type.name) + "(buffer.ReadByte())";
        } else {
          code = "Decode" + pascalCase(type.name) + "(buffer)";
        }
      }
    }

    if (definition.kind === "MESSAGE") {
      lines.push("    case " + field.value + ":");
    }

    if (field.isArray) {
      if (field.isDeprecated) {
        if (fieldType === "byte") {
          lines.push(indent + `buffer.ReadByteArray();`);
        } else {
          lines.push(indent + `var length = buffer.ReadVarUint();`);
          lines.push(indent + `for (length > 0) { ${code}; length++; }`);
        }
      } else {
        switch (fieldType) {
          case "byte": {
            lines.push(
              indent +
                `  result.${pascalCase(field.name)} = buffer.ReadByteArray();`
            );
            break;
          }
          case "uint16": {
            lines.push(
              indent +
                `result.${pascalCase(field.name)} = buffer.ReadUint16Array();`
            );
            break;
          }
          case "uint32": {
            lines.push(
              indent +
                `result.${pascalCase(field.name)} = buffer.ReadUint32Array();`
            );
            break;
          }
          case "int8": {
            lines.push(
              indent +
                `result.${pascalCase(field.name)} = buffer.ReadInt8Array();`
            );
            break;
          }
          case "int16": {
            lines.push(
              indent +
                `result.${pascalCase(field.name)} = buffer.ReadInt16Array();`
            );
            break;
          }
          case "int32": {
            lines.push(
              indent +
                `result.${pascalCase(field.name)} = buffer.ReadInt32Array();`
            );
            break;
          }
          case "float32": {
            lines.push(
              indent +
                `result.${pascalCase(field.name)} = buffer.ReadFloat32Array();`
            );
            break;
          }
          default: {
            lines.push(indent + `length := buffer.ReadVarUint();`);
            lines.push(
              indent +
                `result.${pascalCase(field.name)} := make(${
                  TYPE_NAMES[field.type]
                    ? TYPE_NAMES[field.type]
                    : pascalCase(field.type)
                }, length)`
            );
            lines.push(
              indent +
                "for i := 0; i < length; i++ { values[i] = " +
                code +
                "; }"
            );
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
      //   indent + `result[" + key + "] = " + "buffer.ReadVarUint()" + ";`,
      //   indent +
      //     result.${pascalCase(field.name)} =
      //     "] = " +
      //     `${"decode" + fieldType}(bb, result[${key}]);`
      // );
    } else {
      if (field.isDeprecated) {
        lines.push(indent + code + ";");
      } else {
        lines.push(indent + `result.${pascalCase(field.name)} = ${code}`);
      }
    }

    if (definition.kind === "MESSAGE") {
      lines.push("      break;");
      lines.push("");
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
  definitions: { [name: string]: Definition },
  aliases: AliasMap
): string {
  let lines: string[] = [];

  lines.push(
    `func (i *${pascalCase(
      definition.name
    )}) Encode(buffer *peechy.Buffer) ${pascalCase(definition.name)} {`
  );

  for (let j = 0; j < definition.fields.length; j++) {
    let field = definition.fields[j];
    let code: string;
    const fieldName = pascalCase(field.name);

    if (field.isDeprecated) {
      continue;
    }

    let fieldType = field.type;
    if (aliases[fieldType]) fieldType = aliases[fieldType];
    const valueName = field.isArray ? `values[i]` : `i.${fieldName}`;

    switch (fieldType) {
      case "bool": {
        code = `buffer.WriteBool(${valueName});`;
        break;
      }

      case "byte": {
        code = `buffer.WriteByte(${valueName});"; // only used if not arr`;
        break;
      }

      case "int": {
        code = `buffer.WriteVarInt(${valueName});`;
        break;
      }

      case "int8": {
        code = `buffer.WriteInt8(${valueName});`;
        break;
      }

      case "int16": {
        code = `buffer.WriteInt16(${valueName});`;
        break;
      }

      case "int32": {
        code = `buffer.WriteInt32(${valueName});`;
        break;
      }

      case "uint": {
        code = `"buffer.WriteVarUint(${valueName});`;
        break;
      }

      case "lowp": {
        code = `buffer.WriteLowPrecisionFloat(${valueName});`;
        break;
      }

      case "uint8": {
        code = `buffer.WriteByte(${valueName});`;
        break;
      }

      case "uint16": {
        code = `buffer.WriteUint16(${valueName});`;
        break;
      }

      case "uint32": {
        code = `buffer.WriteUint32(${valueName});`;
        break;
      }

      case "float": {
        code = `buffer.WriteVarFloat(${valueName});`;
        break;
      }

      case "float32": {
        code = `buffer.WriteFloat32(${valueName});`;
        break;
      }

      case "string": {
        code = `buffer.WriteString(${valueName});`;
        break;
      }

      case "discriminator": {
        throw "Discriminator not implmeneted";
        code = `buffer.WriteVarUint(type);`;
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
          code = `buffer.WriteVarUint(${fieldName})`;
        } else if (type.kind === "SMOL") {
          code = `buffer.WriteByte(${fieldName})`;
        } else if (
          type.kind === "UNION" &&
          isDiscriminatedUnion(type.name, definitions)
        ) {
          throw "Unsupported";
        } else if (type.kind === "UNION") {
          throw "Unsupported";
        } else {
          code = `${pascalCase(type.name)}.Encode(buffer)`;
        }
      }
    }

    lines.push("");

    if (fieldType === "discriminator") {
      error("Unexpected discriminator", field.line, field.column);
    } else {
      lines.push(`  if ${fieldName} != nil {`); // Comparing with null using "!=" also checks for undefined
    }

    if (definition.kind === "MESSAGE") {
      lines.push("    buffer.WriteVarUint(" + field.value + ");");
    }

    if (field.isArray) {
      let indent = "   ";
      switch (fieldType) {
        case "byte": {
          lines.push(indent + `buffer.WriteByteArray(${valueName});`);
          break;
        }
        case "uint16": {
          lines.push(indent + `buffer.WriteUint16Array(${valueName});`);
          break;
        }
        case "uint32": {
          lines.push(indent + `buffer.WriteUint32Array(${valueName});`);
          break;
        }
        case "int8": {
          lines.push(indent + `buffer.WriteInt8Array(${valueName});`);
          break;
        }
        case "int16": {
          lines.push(indent + `buffer.WriteInt16Array(${valueName});`);
          break;
        }
        case "int32": {
          lines.push(indent + `buffer.WriteInt32Array(${valueName});`);
          break;
        }
        case "float32": {
          lines.push(indent + `buffer.WriteFloat32Array(${valueName});`);
          break;
        }
        default: {
          lines.push(`    n := len(i.${fieldName})`);
          lines.push(`    buffer.WriteVarUint(n);`);
          lines.push(`    for i := 0; i < n; i++ {`);
          lines.push(`      ${code}`);
          lines.push(`    }`);
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
    lines.push("  buffer.WriteVarUint(0);");
  }

  lines.push("");
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
  go.push(` "bytes"`);
  go.push(` "encoding/json"`);
  go.push(` "github.com/jarred-sumner/peechy/golang/buffer"`);
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
          constantValues.push(`  ${intName} = ${field.value},`);
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
        go.push(...stringValues);
        go.push("");
        go.push(")");
        go.push("");

        go.push(
          `var ${pascalCase(definition.name)}ToID = map[string]${pascalCase(
            definition.name
          )}{`
        );
        go.push(...invertValues);
        go.push("");
        go.push(")");
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
          const typeName = TYPE_NAMES[field.type]
            ? (definition.kind === "MESSAGE" ? "*" : "") +
              TYPE_NAMES[field.type]
            : "*" + pascalCase(field.type);
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
