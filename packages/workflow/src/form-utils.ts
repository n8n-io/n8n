import sanitize from 'sanitize-html';

import type { FormFieldsParameter, IDataObject, GenericValue } from './interfaces';
import { tryToParseUrl } from './type-validation';

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
};

export function sanitizeHtml(text: string) {
	return sanitize(text, {
		allowedTags: [
			'b',
			'div',
			'i',
			'iframe',
			'img',
			'video',
			'source',
			'em',
			'strong',
			'a',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'u',
			'sub',
			'sup',
			'code',
			'pre',
			'span',
			'br',
			'ul',
			'ol',
			'li',
			'p',
			'table',
			'thead',
			'tbody',
			'tfoot',
			'td',
			'tr',
			'th',
			'br',
		],
		allowedAttributes: {
			a: ['href', 'target', 'rel'],
			img: ['src', 'alt', 'width', 'height'],
			video: ['controls', 'autoplay', 'loop', 'muted', 'poster', 'width', 'height'],
			iframe: [
				'src',
				'width',
				'height',
				'frameborder',
				'allow',
				'allowfullscreen',
				'referrerpolicy',
			],
			source: ['src', 'type'],
			td: ['colspan', 'rowspan', 'scope', 'headers'],
			th: ['colspan', 'rowspan', 'scope', 'headers'],
		},
		allowedSchemes: ['https', 'http'],
		allowedSchemesByTag: {
			source: ['https', 'http'],
			iframe: ['https', 'http'],
		},
		allowProtocolRelative: false,
		transformTags: {
			iframe: sanitize.simpleTransform('iframe', {
				sandbox: '',
				referrerpolicy: 'strict-origin-when-cross-origin',
				allow: 'fullscreen; autoplay; encrypted-media',
			}),
		},
	});
}

/**
 * Replaces `\n` strings with actual newline characters.
 * Also replaces `\\n` strings with `\n` string.
 */
export const handleNewlines = (text: string) => {
	return text.replace(/\\n|\\\\n/g, (match) => (match === '\\\\n' ? '\\n' : '\n'));
};

export function sanitizeCustomCss(css: string | undefined): string | undefined {
	if (!css) return undefined;

	const sanitized = sanitize(css, {
		allowedTags: [],
		allowedAttributes: {},
	});

	// Restore only the entities needed for valid CSS after tag stripping.
	// &gt; → > is needed for CSS child combinator selectors (div > p).
	// &amp; → & is needed for CSS values, but NOT when followed by lt;/gt;/amp;
	// to prevent cascading decode of double-encoded entities.
	// &lt; is never decoded — < is not valid in CSS and would enable tag injection.
	return sanitized.replace(/&gt;/g, '>').replace(/&amp;(?!(?:lt|gt|amp);)/g, '&');
}

/**
 * Validates that a URL uses a safe scheme.
 * Returns the normalized URL if valid, or null if invalid.
 */
export function validateSafeRedirectUrl(url: string | undefined): string | null {
	if (!url) return null;
	const trimmed = url.trim();
	if (!trimmed) return null;

	try {
		return tryToParseUrl(trimmed);
	} catch {
		return null;
	}
}

export function createDescriptionMetadata(description: string) {
	return description === ''
		? 'n8n form'
		: description.replace(/^\s*\n+|<\/?[^>]+(>|$)/g, '').slice(0, 150);
}

/**
 * Gets the field identifier to use based on node version.
 * For v2.4+, uses fieldName as the primary identifier.
 * For earlier versions, falls back to fieldLabel.
 */
export function getFieldIdentifier(
	field: FormFieldsParameter[number],
	nodeVersion?: number,
): string {
	if (nodeVersion && nodeVersion >= 2.4 && field.fieldName) {
		return field.fieldName;
	}

	return field.fieldLabel ?? field.fieldName ?? '';
}

export const prepareFormFields = (fields: FormFieldsParameter) => {
	return fields.map((field) => {
		if (field.fieldType === 'html' && field.html) {
			field.html = sanitizeHtml(field.html);
		}
		if (field.fieldType === 'hiddenField') {
			field.fieldLabel = field.fieldName as string;
		}

		return field;
	});
};

export function prepareFormData({
	formTitle,
	formDescription,
	formSubmittedHeader,
	formSubmittedText,
	redirectUrl,
	formFields,
	testRun,
	query,
	instanceId,
	useResponseData,
	appendAttribution = true,
	buttonLabel,
	customCss,
	nodeVersion,
	authToken,
}: {
	formTitle: string;
	formDescription: string;
	formSubmittedText: string | undefined;
	redirectUrl: string | undefined;
	formFields: FormFieldsParameter;
	testRun: boolean;
	query: IDataObject;
	instanceId?: string;
	useResponseData?: boolean;
	appendAttribution?: boolean;
	buttonLabel?: string;
	formSubmittedHeader?: string;
	customCss?: string;
	nodeVersion?: number;
	authToken?: string;
}) {
	const utm_campaign = instanceId ? `&utm_campaign=${instanceId}` : '';
	const n8nWebsiteLink = `https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger${utm_campaign}`;

	if (formSubmittedText === undefined) {
		formSubmittedText = 'Your response has been recorded';
	}

	const formData: FormTriggerData = {
		testRun,
		formTitle,
		formDescription,
		formDescriptionMetadata: createDescriptionMetadata(formDescription),
		formSubmittedHeader,
		formSubmittedText,
		n8nWebsiteLink,
		formFields: [],
		useResponseData,
		appendAttribution,
		buttonLabel,
		dangerousCustomCss: sanitizeCustomCss(customCss),
		authToken,
	};

	if (redirectUrl) {
		const safeUrl = validateSafeRedirectUrl(redirectUrl);
		if (safeUrl) {
			formData.redirectUrl = safeUrl;
		}
	}

	for (const [index, field] of formFields.entries()) {
		const { fieldType, requiredField, multiselect, placeholder, defaultValue } = field;
		const queryParam = getFieldIdentifier(field, nodeVersion);

		const input: FormField = {
			id: `field-${index}`,
			errorId: `error-field-${index}`,
			label: field.fieldLabel,
			inputRequired: requiredField ? 'form-required' : '',
			defaultValue: query[queryParam] ?? defaultValue ?? '',
			placeholder,
		};

		if (multiselect || (fieldType && ['radio', 'checkbox'].includes(fieldType))) {
			input.isMultiSelect = true;
			input.multiSelectOptions =
				field.fieldOptions?.values.map((e, i) => ({
					id: `option${i}_${input.id}`,
					label: e.option,
				})) ?? [];

			if (fieldType === 'radio') {
				input.radioSelect = 'radio';
			} else if (field.limitSelection === 'exact') {
				input.exactSelectedOptions = field.numberOfSelections;
			} else if (field.limitSelection === 'range') {
				input.minSelectedOptions = field.minSelections;
				input.maxSelectedOptions = field.maxSelections;
			}
		} else if (fieldType === 'file') {
			input.isFileInput = true;
			input.acceptFileTypes = field.acceptFileTypes;
			input.multipleFiles = field.multipleFiles ? 'multiple' : '';
		} else if (fieldType === 'dropdown') {
			input.isSelect = true;
			const fieldOptions = field.fieldOptions?.values ?? [];
			input.selectOptions = fieldOptions.map((e) => e.option);
		} else if (fieldType === 'textarea') {
			input.isTextarea = true;
		} else if (fieldType === 'html') {
			input.isHtml = true;
			input.html = field.html as string;
		} else if (fieldType === 'hiddenField') {
			input.isHidden = true;
			input.hiddenName = field.fieldName as string;
			input.hiddenValue =
				input.defaultValue === '' ? (field.fieldValue as string) : input.defaultValue;
		} else {
			input.isInput = true;
			input.type = fieldType as 'text' | 'number' | 'date' | 'email';
		}

		formData.formFields.push(input);
	}

	return formData;
}
