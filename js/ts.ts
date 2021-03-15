import { Schema } from "./schema";
import { error, quote } from "./util";

const KIWI_IMPORT_PATH = "peechy";

export function compileSchemaTypeScript(schema: Schema): string {
  var indent = "";
  var lines = [`import type {ByteBuffer} from "${KIWI_IMPORT_PATH}";\n`];

  if (schema.package !== null) {
    lines.push("export namespace " + schema.package + " {");
    indent += "  ";
  }

  lines.push(`type byte = number;`);
  lines.push(`type float = number;`);
  lines.push(`type int = number;`);
  lines.push(`type alphanumeric = string;`);
  lines.push(`type uint = number;`);
  lines.push(`type int8 = number;`);
  lines.push(`type lowp = number;`);
  lines.push(`type int16 = number;`);
  lines.push(`type int32 = number;`);
  lines.push(`type float32 = number;`);
  lines.push(`type uint16 = number;`);
  lines.push(`type uint32 = number;`);

  var unionsByName: { [key: string]: number } = {};
  var discriminatedTypes: {
    [key: string]: {
      [name: string]: string;
    };
  } = {};

  for (var i = 0; i < schema.definitions.length; i++) {
    var definition = schema.definitions[i];

    if (definition.kind === "UNION") {
      unionsByName[definition.name] = i;

      lines.push(indent + "export enum " + definition.name + "Type {");

      const descriminator = definition.fields[0];
      for (var j = 0; j < definition.fields.length; ) {
        const field = definition.fields[j];

        if (descriminator.type === "discriminator") {
          if (j === 0) {
            j++;
            continue;
          }
          if (!discriminatedTypes[field.name!]) {
            discriminatedTypes[field.type!] = {
              [descriminator.name]: definition.name + "Type" + "." + field.name,
            };
          } else {
            discriminatedTypes[field.type!][descriminator.name] =
              definition.name + "Type." + field.name;
          }
        }

        lines.push(
          indent +
            indent +
            "" +
            field.name +
            " = " +
            field.value +
            (j < definition.fields.length - 1 ? "," : "")
        );
        j++;
      }

      lines.push(indent + "}");

      lines.push(indent + "export const " + definition.name + "Keys = {");
      for (var j = 0; j < definition.fields.length; ) {
        const field = definition.fields[j];

        if (descriminator.type === "discriminator") {
          if (j === 0) {
            j++;
            continue;
          }
        }

        lines.push(
          indent + indent + "" + field.value + ': "' + field.name + '",',

          indent +
            indent +
            "" +
            field.name +
            ': "' +
            field.name +
            '"' +
            (j < definition.fields.length - 1 ? "," : "")
        );
        j++;
      }

      lines.push(indent + "}");
    } else if (definition.kind === "ENUM" || definition.kind === "SMOL") {
      if (!definition.fields.length) {
        lines.push(indent + "export type " + definition.name + " = any;");
      } else {
        lines.push(indent + "export enum " + definition.name + " {");

        for (var j = 0; j < definition.fields.length; j++) {
          lines.push(
            indent +
              indent +
              "" +
              definition.fields[j].name +
              " = " +
              definition.fields[j].value +
              (j < definition.fields.length - 1 ? "," : "")
          );
        }

        lines.push(indent + "}");

        lines.push(indent + "export const " + definition.name + "Keys = {");

        for (var j = 0; j < definition.fields.length; j++) {
          lines.push(
            indent +
              indent +
              "" +
              definition.fields[j].value +
              ": " +
              `"${definition.fields[j].name}",`,
            indent +
              indent +
              "" +
              definition.fields[j].name +
              ": " +
              `"${definition.fields[j].name}"` +
              (j < definition.fields.length - 1 ? "," : "")
          );
        }

        lines.push(indent + "}");
      }
    } else if (definition.kind === "ALIAS") {
      lines.push(
        indent +
          "export type " +
          definition.name +
          " = " +
          definition.fields[0].name +
          ";"
      );
    }
  }
  for (var i = 0; i < schema.definitions.length; i++) {
    var definition = schema.definitions[i];
    if (definition.kind === "ALIAS") continue;

    const unionFields: { [property: string]: number } = {};
    let unionFieldsCount = 0;
    for (var j = 0; j < definition.fields.length; j++) {
      var field = definition.fields[j];

      if (
        field.type &&
        unionsByName[field.type] &&
        (!discriminatedTypes[definition.name] ||
          !discriminatedTypes[definition.name][field.name])
      ) {
        unionFields[field.type] = j;
        unionFieldsCount++;
      }
    }

    if (
      definition.kind === "STRUCT" ||
      definition.kind === "MESSAGE" ||
      definition.kind === "UNION"
    ) {
      let line: string;
      if (definition.kind === "UNION") {
        line = indent + "export type " + definition.name;
      } else if (unionFieldsCount) {
        line = indent + "interface Abstract" + definition.name;
      } else {
        line = indent + "export interface " + definition.name;
      }

      const discriminators = discriminatedTypes[definition.name];
      if (discriminators) {
        let index = 0;
        const discriminatorNames = [];
        for (let discriminator in discriminators) {
          discriminatorNames.push(
            "U" +
              index++ +
              ` extends (${discriminators[discriminator]} | undefined) = undefined`
          );
        }
        line += "<" + discriminatorNames.join(" , ") + ">";
        if (definition.kind === "UNION") {
          line += " =";
        }
        line += " {";
        lines.push(line);
        index = 0;
        for (let discriminator in discriminators) {
          lines.push(indent + indent + `${discriminator}: U${index++};`);
        }
        if (definition.kind === "UNION") {
          lines.push("  }");
        }
      } else if (definition.kind !== "UNION") {
        line += " {";
        lines.push(line);
      } else {
        line += " = ";
        lines.push(line);
      }
      let isFirstNewField = true;
      for (var j = 0; j < definition.fields.length; j++) {
        var field = definition.fields[j];
        var type;

        if (field.isDeprecated) {
          continue;
        }

        switch (field.type) {
          case "bool":
            type = "boolean";
            break;
          case "byte":
          case "float":
          case "int":
          case "uint":
          case "int8":
          case "int16":
          case "int32":
          case "float32":
          case "uint16":
          case "uint32":
            type = field.type;
            break;
          case "string": {
            type = "string";
            break;
          }
          default:
            type = field.type;
            break;
        }

        if (field.type === "byte" && field.isArray) type = "Uint8Array";
        else if (field.type === "int8" && field.isArray) type = "Int8Array";
        else if (field.type === "int16" && field.isArray) type = "Int16Array";
        else if (field.type === "int32" && field.isArray) type = "Int32Array";
        else if (field.type === "float32" && field.isArray)
          type = "Float32Array";
        else if (field.type === "uint16" && field.isArray) type = "Uint16Array";
        else if (field.type === "uint32" && field.isArray) type = "Uint32Array";
        else if (field.isArray) type += "[]";

        if (definition.kind === "UNION") {
          if (discriminators && isFirstNewField) {
            lines.push(" & (");
          }
          if (field.type !== "discriminator") {
            if (discriminatedTypes[field.type!]) {
              lines.push(
                indent +
                  indent +
                  "|" +
                  indent +
                  field.name +
                  "<" +
                  definition.name +
                  "Type" +
                  "." +
                  field.name +
                  "> "
              );
            } else {
              lines.push(indent + indent + "|" + indent + field.name);
            }
          }
        } else {
          lines.push(
            indent +
              "  " +
              field.name +
              (definition.kind === "MESSAGE" && !field.isRequired ? "?" : "") +
              ": " +
              type +
              ";"
          );
        }

        isFirstNewField = false;
      }

      if (definition.kind === "UNION" && !discriminatedTypes[definition.name]) {
        lines[lines.length - 1] =
          lines[lines.length - 1].substring(0, lines[lines.length - 1].length) +
          ";";
      } else if (definition.kind === "UNION") {
        lines[lines.length - 1] += ");";
      } else {
        lines.push(indent + "}");
        lines.push("");
      }

      if (unionFieldsCount) {
        const unionTypeNames = [];
        for (let type in unionFields) {
          const fieldId = unionFields[type];
          const field = definition.fields[fieldId];
          const union =
            field.type && schema.definitions[unionsByName[field.type]];
          if (union) {
            const group = [];
            for (let value of union.fields) {
              if (value.type === "discriminator") break;

              const unionTypeName = `${definition.name}${value.name}Discriminator`;
              group.push(unionTypeName);
              if (value.type) {
                const discriminator = `${union.name}Type.${value.type}`;
                lines.push(
                  `type ${unionTypeName} = { ${field.name}Type${
                    field.isRequired ? "" : "?"
                  }: ${discriminator}; ${field.name}${
                    field.isRequired ? "" : "?"
                  }: ${value.type}; }`
                );
              }
            }

            if (group.length) unionTypeNames.push(group);
          }
        }
        const unionTypeString = unionTypeNames
          .map((group) =>
            group.length > 0 ? "( " + group.join(" | ") + " )" : ""
          )
          .filter((a) => a.trim().length > 0)
          .join(" & ");

        if (unionTypeString.length) {
          let types = "";
          let typeNames = "";
          if (discriminators) {
            let index = 0;
            const discriminatorNames = [];
            const typeNameList = [];
            for (let discriminator in discriminators) {
              const typeName = "U" + index++;
              typeNameList.push(typeName);
              discriminatorNames.push(
                typeName +
                  ` extends (${discriminators[discriminator]} | undefined) = undefined`
              );
            }
            types = "<" + discriminatorNames.join(" , ") + ">";
            typeNames = "<" + typeNameList.join(" , ") + ">";
          }

          lines.push(
            `export type ${definition.name}${types} = Abstract${definition.name}${typeNames} & ${unionTypeString};`
          );
        } else if (discriminators) {
          let types = "";
          let typeNames = "";

          if (discriminators) {
            let index = 0;
            const discriminatorNames = [];
            const typeNameList = [];
            for (let discriminator in discriminators) {
              const typeName = "U" + index++;
              typeNameList.push(typeName);
              discriminatorNames.push(
                typeName +
                  ` extends (${discriminators[discriminator]} | undefined) = undefined`
              );
            }
            types = "<" + discriminatorNames.join(" , ") + ">";
            typeNames = "<" + typeNameList.join(" , ") + ">";
          }
          lines.push(`
            export interface ${definition.name}${types} extends Abstract${definition.name}${typeNames} {}
          `);
        } else if (definition.kind !== "UNION") {
          lines.push(
            `export interface ${definition.name} extends Abstract${definition.name} {};`
          );
        }
      }
    } else if (definition.kind !== "ENUM" && definition.kind !== "SMOL") {
      error(
        "Invalid definition kind " + quote(definition.kind),
        definition.line,
        definition.column
      );
    }
  }

  for (var i = 0; i < schema.definitions.length; i++) {
    var definition = schema.definitions[i];
    if (definition.kind === "ENUM") {
      // lines.push(indent + "  " + definition.name + `: ${definition.name};`);
    } else if (
      definition.kind === "STRUCT" ||
      definition.kind === "MESSAGE" ||
      definition.kind === "UNION"
    ) {
      if (definition.kind === "UNION") {
        // lines.push(
        //   indent + "  " + definition.name + `: ${definition.name}Type;`
        // );

        if (definition.fields[0].type !== "discriminator") {
          lines.push(
            indent +
              "export declare function  encode" +
              definition.name +
              "(message: " +
              definition.name +
              `, bb: ByteBuffer, type: ${definition.name}Type): void;`
          );
        } else {
          lines.push(
            indent +
              "export declare function  encode" +
              definition.name +
              "(message: " +
              definition.name +
              ", bb: ByteBuffer): void;"
          );
        }
      } else {
        lines.push(
          indent +
            "export declare function  encode" +
            definition.name +
            "(message: " +
            definition.name +
            ", bb: ByteBuffer): void;"
        );
      }

      lines.push(
        indent +
          "export declare function decode" +
          definition.name +
          "(buffer: ByteBuffer): " +
          definition.name +
          ";"
      );
    }
  }

  // lines.push(indent + indent + "ByteBuffer: ByteBuffer;");

  // lines.push(indent + "}");

  if (schema.package !== null) {
    lines.push("}");
  }

  lines.push("");
  return lines.join("\n");
}
