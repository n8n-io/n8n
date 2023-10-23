export interface Templates {
  id: number;
  title: string;
	slug: string;
	description: string;
  prompts?: [
		{
			id: number;
			order: number;
			title: string;
			content: string;
		}
	];
}
export interface TemplatesWithPagination {
  count: number;
  next: string | null;
  previous: string | null;
  results: Templates[];
}

export interface Inputs {
	city: string,
	requirement: string
}

export type InputType = "string" | "number" | "options";

export interface IPromptInput {
  name: string;
  fullName: string;
  type: InputType;
  required: boolean;
  defaultValue?: string | number | null;
  options?: string[] | null;
  prompt?: number;
}
