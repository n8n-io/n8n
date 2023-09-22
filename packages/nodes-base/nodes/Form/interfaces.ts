export type FormField = {
	fieldLabel: string;
	fieldType: string;
	requiredField: boolean;
	fieldOptions?: { values: Array<{ option: string }> };
	dateFormat?: string;
};

export const WHITE_SPACE_PLACEHOLDER = '___';
export const QUOTE_PLACEHOLDER = '_quote_';
export const DOUBLE_QUOTE_PLACEHOLDER = '_double_quote_';
