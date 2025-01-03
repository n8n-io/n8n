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
	formSubmittedHeader?: string;
	formSubmittedText?: string;
	redirectUrl?: string;
	n8nWebsiteLink: string;
	formFields: FormTriggerInput[];
	useResponseData?: boolean;
	appendAttribution?: boolean;
	buttonLabel?: string;
};

export type CompletionPageConfig = {
	pageTitle?: string;
	completionMessage?: string;
	completionTitle?: string;
	redirectUrl?: string;
};

export const FORM_TRIGGER_AUTHENTICATION_PROPERTY = 'authentication';
