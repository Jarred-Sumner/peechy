export interface Schema {
  package: string | null;
  definitions: Definition[];
}

export type DefinitionKind =
  | "ENUM"
  | "STRUCT"
  | "MESSAGE"
  | "ENTITY"
  | "UNION"
  | "SMOL"
  | "PICK";

export interface Definition {
  name: string;
  line: number;
  column: number;
  kind: DefinitionKind;
  fields: Field[];
}

export interface Field {
  name: string;
  line: number;
  column: number;
  type: string | null;
  isRequired: boolean;
  isArray: boolean;
  isDeprecated: boolean;
  value: number;
}
