export type FormField = {
	fieldLabel: string;
	fieldType: string;
	requiredField: boolean;
	fieldOptions?: { values: Array<{ option: string }> };
	multiselect?: boolean;
	multipleFiles?: boolean;
	acceptFileTypes?: string;
	formatDate?: string;
	placeholder?: string;
};

export type FormTriggerInput = {
	isSelect?: boolean;
	isMultiSelect?: boolean;
	isTextarea?: boolean;
	isFileInput?: boolean;
	isInput?: boolean;
	label: string;
	defaultValue?: string;
	id: string;
	errorId: string;
	type?: 'text' | 'number' | 'date';
	inputRequired: 'form-required' | '';
	selectOptions?: string[];
	multiSelectOptions?: Array<{ id: string; label: string }>;
	acceptFileTypes?: string;
	multipleFiles?: 'multiple' | '';
	placeholder?: string;
};

export type FormTriggerData = {
	testRun: boolean;
	validForm: boolean;
	formTitle: string;
	formDescription?: string;
	formSubmittedText?: string;
	redirectUrl?: string;
	n8nWebsiteLink: string;
	formFields: FormTriggerInput[];
	useResponseData?: boolean;
	appendAttribution?: boolean;
};

export const FORM_TRIGGER_AUTHENTICATION_PROPERTY = 'authentication';
