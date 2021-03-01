import { Schema } from "./schema";

export function prettyPrintSchema(schema: Schema): string {
  let definitions = schema.definitions;
  let text = "";
  let discriminatorIndex = -1;

  if (schema.package !== null) {
    text += "package " + schema.package + ";\n";
  }

  for (let i = 0; i < definitions.length; i++) {
    let definition = definitions[i];
    if (i > 0 || schema.package !== null) text += "\n";

    if (definition.kind === "UNION") {
      discriminatorIndex = -1;

      text += definition.kind.toLowerCase() + " " + definition.name + " = ";
      for (let j = 0; j < definition.fields.length; j++) {
        let field = definition.fields[j];
        if (field.value === 0) {
          discriminatorIndex = j;
          continue;
        }

        text += field.name;

        if (j < definition.fields.length - 1) {
          text += " | ";
        }
      }
      if (discriminatorIndex > -1) {
        text += " {\n";
        text += "  " + definition.fields[discriminatorIndex].name + ";\n";
        text += "}\n";
      } else {
        text += ";\n";
      }
    } else if (definition.kind === "ALIAS") {
      text += definition.kind.toLowerCase() + " " + definition.name + " = ";
      text += definition.fields[0].name;
      text += ";\n";
    } else {
      text += definition.kind.toLowerCase() + " " + definition.name + " {\n";
      for (let j = 0; j < definition.fields.length; j++) {
        let field = definition.fields[j];
        text += "  ";
        if (definition.kind !== "ENUM") {
          text += field.type;
          if (field.isArray) {
            text += "[]";
          }
          text += " ";
        }
        text += field.name;
        if (definition.kind !== "STRUCT") {
          text += " = " + field.value;
        }
        if (field.isDeprecated) {
          text += " [deprecated]";
        }
        text += ";\n";
      }

      text += "}\n";
    }
  }

  return text;
}
