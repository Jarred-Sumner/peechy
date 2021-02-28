import { Schema } from "./schema";
import { error, quote } from "./util";

export function compileSchemaTypeScript(schema: Schema): string {
  var indent = "";
  var lines = [];

  if (schema.package !== null) {
    lines.push("export namespace " + schema.package + " {");
    indent += "  ";
  }

  lines.push(`type byte = number;`);
  lines.push(`type float = number;`);
  lines.push(`type int = number;`);
  lines.push(`type uint = number;`);
  lines.push(`type int8 = number;`);
  lines.push(`type int16 = number;`);
  lines.push(`type int32 = number;`);
  lines.push(`type float32 = number;`);
  lines.push(`type uint16 = number;`);
  lines.push(`type uint32 = number;`);

  var unionsByName: { [key: string]: number } = {};

  for (var i = 0; i < schema.definitions.length; i++) {
    var definition = schema.definitions[i];

    if (definition.kind === "UNION") {
      unionsByName[definition.name] = i;

      lines.push(indent + "export enum " + definition.name + "Type {");

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
    }

    if (definition.kind === "ENUM") {
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
      }
    }
  }

  for (var i = 0; i < schema.definitions.length; i++) {
    var definition = schema.definitions[i];

    const unionFields: { [property: string]: number } = {};
    let hasUnionFields = false;
    for (var j = 0; j < definition.fields.length; j++) {
      var field = definition.fields[j];

      if (field.type && unionsByName[field.type]) {
        unionFields[field.type] = j;
        hasUnionFields = true;
      }
    }

    if (
      definition.kind === "STRUCT" ||
      definition.kind === "MESSAGE" ||
      definition.kind === "UNION"
    ) {
      if (definition.kind === "UNION") {
        lines.push(indent + "export type " + definition.name + " =");
      } else if (hasUnionFields) {
        lines.push(indent + "interface Abstract" + definition.name + " {");
      } else {
        lines.push(indent + "export interface " + definition.name + " {");
      }

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
          lines.push(indent + field.name + "|");
        } else if (field.type && typeof unionFields[field.type] === "number") {
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
      }

      if (definition.kind === "UNION") {
        lines[lines.length - 1] =
          lines[lines.length - 1].substring(
            0,
            lines[lines.length - 1].length - 1
          ) + ";";
      } else {
        lines.push(indent + "}");
        lines.push("");
      }

      if (hasUnionFields) {
        for (let type in unionFields) {
          const fieldId = unionFields[type];
          const field = definition.fields[fieldId];
        }
      }
    } else if (definition.kind !== "ENUM") {
      error(
        "Invalid definition kind " + quote(definition.kind),
        definition.line,
        definition.column
      );
    }
  }

  lines.push(indent + "export interface Schema {");

  for (var i = 0; i < schema.definitions.length; i++) {
    var definition = schema.definitions[i];

    if (definition.kind === "ENUM") {
      lines.push(indent + "  " + definition.name + ": any;");
    } else if (
      definition.kind === "STRUCT" ||
      definition.kind === "MESSAGE" ||
      definition.kind === "UNION"
    ) {
      lines.push(
        indent +
          "  encode" +
          definition.name +
          "(message: " +
          definition.name +
          "): Uint8Array;"
      );
      lines.push(
        indent +
          "  decode" +
          definition.name +
          "(buffer: Uint8Array): " +
          definition.name +
          ";"
      );
    }
  }

  lines.push(indent + "}");

  if (schema.package !== null) {
    lines.push("}");
  }

  lines.push("");
  return lines.join("\n");
}
