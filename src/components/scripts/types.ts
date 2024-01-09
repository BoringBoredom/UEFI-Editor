export interface Data {
  menu: Menu;
  varStores: VarStores;
  forms: Forms;
  suppressions: Suppression[];
  version: string;
  hashes: {
    setupTxt: string;
    setupSct: string;
    amitseSct: string;
    setupdataBin: string;
    offsetChecksum: string;
  };
}

export interface Suppression {
  offset: string;
  active: boolean;
  start: string;
  end: string;
}

export type Menu = {
  name: string;
  formId: string;
  offset: string;
}[];

export type Forms = Form[];

export interface Form {
  name: string;
  type: "Form";
  formId: string;
  referencedIn: (string | null)[];
  children: FormChildren[];
}

export interface Offsets {
  accessLevel: string;
  failsafe: string;
  optimal: string;
  pageId?: string;
}

export interface FormChild {
  name: string;
  description: string;
  questionId: string;
  varStoreId: string;
  varStoreName: string;
  accessLevel: string | null;
  failsafe: string | null;
  optimal: string | null;
  offsets: Offsets | null;
  suppressIf?: string[];
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
  pageId: string | null;
}

export interface NumericPrompt extends FormChild {
  type: "Numeric";
  varOffset: string;
  size: string;
  min: string;
  max: string;
  step: string;
  defaults?: Default[];
}

export interface CheckBoxPrompt extends FormChild {
  type: "CheckBox";
  varOffset: string;
  flags: string;
  defaults?: Default[];
}

export interface OneOfPrompt extends FormChild {
  type: "OneOf";
  varOffset: string;
  size: string;
  options: { option: string; value: string }[];
  defaults?: Default[];
}

export interface StringPrompt extends FormChild {
  type: "String";
}

export type VarStores = {
  varStoreId: string;
  size: string;
  name: string;
}[];

export interface Default {
  defaultId: string;
  value: string;
}

export type Scopes = {
  type: "Form" | "Numeric" | "CheckBox" | "OneOf" | "String" | "SuppressIf";
  indentations: number;
  offset?: string;
}[];
