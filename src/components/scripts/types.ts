export interface Data {
  menu: Menu;
  varStores: VarStores;
  forms: Forms;
  version: string;
  hashes: {
    setupTxt: string;
    setupSct: string;
    amitseSct: string;
    setupdataBin: string;
    offsetChecksum: string;
  };
}

export type Menu = Array<{
  name: string;
  formId: string;
  offset: string;
}>;

export type Forms = Array<Form>;

export interface Form {
  name: string;
  type: "Form";
  formId: string;
  referencedIn: Array<string | null>;
  children: Array<FormChildren>;
}

export type Offsets = [string, string, string];

export interface FormChild {
  name: string;
  description: string;
  questionId: string;
  varStoreId: string;
  accessLevel: string;
  failsafe: string;
  optimal: string;
  offsets: Offsets;
  suppressIf?: Array<string>;
}

export type FormChildren =
  | RefPrompt
  | NumericPrompt
  | CheckBoxPrompt
  | OneOfPrompt
  | StringPrompt;

export interface RefPrompt extends FormChild {
  type: "Ref";
  formId: string;
}

export interface NumericPrompt extends FormChild {
  type: "Numeric";
  varOffset: string;
  size: string;
  min: string;
  max: string;
  step: string;
  defaults?: Array<Default>;
}

export interface CheckBoxPrompt extends FormChild {
  type: "CheckBox";
  varOffset: string;
  defaults?: Array<Default>;
}

export interface OneOfPrompt extends FormChild {
  type: "OneOf";
  varOffset: string;
  size: string;
  options: Array<string>;
  defaults?: Array<Default>;
}

export interface StringPrompt extends FormChild {
  type: "String";
}

export type VarStores = Array<{
  varStoreId: string;
  size: string;
  name: string;
}>;

export interface Default {
  defaultId: string;
  value: string;
}

export type Scopes = Array<{
  type: "Form" | "Numeric" | "CheckBox" | "OneOf" | "String" | "SuppressIf";
  indentations: number;
  offset?: string;
}>;
