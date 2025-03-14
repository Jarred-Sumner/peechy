import { Schema } from "./schema";
import { error, quote } from "./util";

const KIWI_IMPORT_PATH = "peechy";

export function compileSchemaTypeScript(schema: Schema): string {
  var indent = "";
  var lines = [`import type {ByteBuffer} from "${KIWI_IMPORT_PATH}/bb";\n`];

  if (schema.package !== null) {
    indent += "  ";
  }

  lines.push(`type byte = number;`);
  lines.push(`type float = number;`);
  lines.push(`type int = number;`);
  lines.push(`type alphanumeric = string;`);
  lines.push(`type uint = number;`);
  lines.push(`type int8 = number;`);
  lines.push(`type uint8 = number;`);
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

  // First pass: Process enums and type definitions
  for (var i = 0; i < schema.definitions.length; i++) {
    var definition = schema.definitions[i];

    if (definition.kind === "UNION") {
      unionsByName[definition.name] = i;

      // Find the discriminator field (assuming it's the first field or marked with type: "discriminator")
      const discriminatorField =
        definition.fields.find((field) => field.type === "discriminator") ||
        definition.fields[0];
      const discriminatorName = discriminatorField
        ? discriminatorField.name
        : "type";

      // Generate enum for type checking and intellisense
      lines.push(`export enum ${definition.name}Type {`);
      for (var j = 0; j < definition.fields.length; j++) {
        const field = definition.fields[j];
        // Skip discriminator field if explicitly marked
        if (field.type === "discriminator") continue;

        lines.push(`  ${field.name} = ${field.value},`);
      }
      lines.push(`}`);

      // Generate TypeScript union type for type checking
      const unionVariants = [];
      for (var j = 0; j < definition.fields.length; j++) {
        const field = definition.fields[j];
        if (field.type === "discriminator") continue;

        if (field.type && field.type !== "discriminator") {
          unionVariants.push(
            `(${field.type} & { ${discriminatorName}: ${definition.name}Type.${field.name} })`
          );
        }
      }

      // If there are valid variants, generate the type
      if (unionVariants.length > 0) {
        lines.push(
          `export type ${definition.name} = ${unionVariants.join(" | ")};`
        );
      } else {
        lines.push(
          `export type ${definition.name} = { ${discriminatorName}: ${definition.name}Type };`
        );
      }
    } else if (definition.kind === "ENUM" || definition.kind === "SMOL") {
      if (!definition.fields.length) {
        lines.push(indent + "export type " + definition.name + " = any;");
      } else {
        // Generate enum for type checking and intellisense
        lines.push(`export enum ${definition.name} {`);
        for (var j = 0; j < definition.fields.length; j++) {
          const field = definition.fields[j];
          lines.push(`  ${field.name} = ${field.value},`);
        }
        lines.push(`}`);
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

  // Second pass: Generate struct and message interfaces
  for (var i = 0; i < schema.definitions.length; i++) {
    var definition = schema.definitions[i];
    if (
      definition.kind === "ALIAS" ||
      definition.kind === "ENUM" ||
      definition.kind === "SMOL" ||
      definition.kind === "UNION"
    )
      continue;

    if (definition.kind === "STRUCT" || definition.kind === "MESSAGE") {
      // Regular struct or message
      lines.push(indent + "export interface " + definition.name + " {");

      for (var j = 0; j < definition.fields.length; j++) {
        var field = definition.fields[j];
        if (field.isDeprecated) continue;

        var type;
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
          case "string":
            type = "string";
            break;
          default:
            type = field.type;
            break;
        }

        // Handle arrays
        if (field.type === "byte" && field.isArray) type = "Uint8Array";
        else if (field.type === "int8" && field.isArray) type = "Int8Array";
        else if (field.type === "int16" && field.isArray) type = "Int16Array";
        else if (field.type === "int32" && field.isArray) type = "Int32Array";
        else if (field.type === "float32" && field.isArray)
          type = "Float32Array";
        else if (field.type === "uint16" && field.isArray) type = "Uint16Array";
        else if (field.type === "uint32" && field.isArray) type = "Uint32Array";
        else if (field.isArray) type += "[]";

        lines.push(
          indent +
            indent +
            field.name +
            (definition.kind === "MESSAGE" && !field.isRequired ? "?" : "") +
            ": " +
            type +
            ";"
        );
      }

      lines.push(indent + "}");
    }
  }

  // Add encode/decode function type declarations
  for (var i = 0; i < schema.definitions.length; i++) {
    var definition = schema.definitions[i];

    if (definition.kind === "UNION") {
      // For unions, we need a special encode function that takes the union type and optional type parameter
      lines.push(
        indent +
          "export declare function encode" +
          definition.name +
          "(message: " +
          definition.name +
          ", bb: ByteBuffer, type?: " +
          definition.name +
          "Type): void;"
      );

      lines.push(
        indent +
          "export declare function decode" +
          definition.name +
          "(buffer: ByteBuffer): " +
          definition.name +
          ";"
      );
    } else if (definition.kind === "STRUCT" || definition.kind === "MESSAGE") {
      lines.push(
        indent +
          "export declare function encode" +
          definition.name +
          "(message: " +
          definition.name +
          ", bb: ByteBuffer): void;"
      );

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

  lines.push("");
  return lines.join("\n");
}
