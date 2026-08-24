import type { GenericValue } from 'n8n-workflow';

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
	authToken?: string;
	// True when this form is rendered inside the hosting-shell iframe: the submit
	// button starts disabled (the shell enables it once the submitter's required
	// credentials are connected). Enforcement is server-side on POST regardless.
	shellInner?: boolean;
	// Only a form that identifies its submitter can be refused by the submit-time
	// credential gate, so this is what decides whether the handling for that
	// rejection is rendered at all. Deliberately broader than the gate's own
	// condition, which also needs `isFormOAuth2Enabled()`: with that on the GET
	// redirects to the OAuth2 provider, which would make the client branch
	// untestable without Keycloak and a license.
	hasAuthenticatedSubmitter?: boolean;
};

export const FORM_TRIGGER_AUTHENTICATION_PROPERTY = 'authentication';
