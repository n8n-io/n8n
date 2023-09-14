export type FormField = {
	fieldLabel: string;
	fieldType: string;
	requiredField: boolean;
	fieldOptions?: { values: Array<{ option: string }> };
};

export const WHITE_SPACE_PLACEHOLDER = '___';
