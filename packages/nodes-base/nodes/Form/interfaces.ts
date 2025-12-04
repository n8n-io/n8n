import type { GenericValue } from 'n8n-workflow';

export const FEATURES = {
	requireAuth: 'requireAuth',
	defaultUseWorkflowTimezone: 'defaultUseWorkflowTimezone',
	allowRespondToWebhook: 'allowRespondToWebhook',
	useFieldName: 'useFieldName',
	useFieldLabel: 'useFieldLabel',
	useWebhookPath: 'useWebhookPath',
	useWebhookPathInOptions: 'useWebhookPathInOptions',
	useResponseNodeOption: 'useResponseNodeOption',
	useWorkflowTimezone: 'useWorkflowTimezone',
	useLegacyMultiselect: 'useLegacyMultiselect',
} as const;

export type FormField = {
	id: string;
	errorId: string;
	label: string;
	placeholder?: string;
	inputRequired: 'form-required' | '';
	type?: 'text' | 'number' | 'date' | 'email';
	defaultValue: GenericValue;

	isInput?: boolean;
	isTextarea?: boolean;

	isSelect?: boolean;
	selectOptions?: string[];

	isMultiSelect?: boolean;
	radioSelect?: 'radio';
	exactSelectedOptions?: number;
	minSelectedOptions?: number;
	maxSelectedOptions?: number;
	multiSelectOptions?: Array<{ id: string; label: string }>;

	isFileInput?: boolean;
	acceptFileTypes?: string;
	multipleFiles?: 'multiple' | '';

	isHtml?: boolean;
	html?: string;

	isHidden?: boolean;
	hiddenName?: string;
	hiddenValue?: GenericValue;
};

export type FormTriggerData = {
	testRun: boolean;
	formTitle: string;
	formDescription?: string;
	formDescriptionMetadata?: string;
	formSubmittedHeader?: string;
	formSubmittedText?: string;
	redirectUrl?: string;
	n8nWebsiteLink: string;
	formFields: FormField[];
	useResponseData?: boolean;
	appendAttribution?: boolean;
	buttonLabel?: string;
	dangerousCustomCss?: string;
};

export const FORM_TRIGGER_AUTHENTICATION_PROPERTY = 'authentication';
