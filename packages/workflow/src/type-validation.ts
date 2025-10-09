import isObject from 'lodash/isObject';
import { DateTime } from 'luxon';

import { ApplicationError } from './errors';
import type {
	FieldType,
	FormFieldsParameter,
	INodePropertyOptions,
	ValidationResult,
} from './interfaces';
import { jsonParse } from './utils';

export const tryToParseNumber = (value: unknown): number => {
	const isValidNumber = !isNaN(Number(value));

	if (!isValidNumber) {
		throw new ApplicationError('Failed to parse value to number', { extra: { value } });
	}
	return Number(value);
};

export const tryToParseString = (value: unknown): string => {
	if (typeof value === 'object') return JSON.stringify(value);
	if (typeof value === 'undefined') return '';
	if (
		typeof value === 'string' ||
		typeof value === 'bigint' ||
		typeof value === 'boolean' ||
		typeof value === 'number'
	) {
		return value.toString();
	}

	return String(value);
};
export const tryToParseAlphanumericString = (value: unknown): string => {
	const parsed = tryToParseString(value);
	// We do not allow special characters, only letters, numbers and underscore
	// Numbers not allowed as the first character
	const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
	if (!regex.test(parsed)) {
		throw new ApplicationError('Value is not a valid alphanumeric string', { extra: { value } });
	}
	return parsed;
};
export const tryToParseBoolean = (value: unknown): value is boolean => {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase())) {
		return value.toLowerCase() === 'true';
	}

	// If value is not a empty string, try to parse it to a number
	if (!(typeof value === 'string' && value.trim() === '')) {
		const num = Number(value);
		if (num === 0) {
			return false;
		} else if (num === 1) {
			return true;
		}
	}

	throw new ApplicationError('Failed to parse value as boolean', {
		extra: { value },
	});
};

export const tryToParseDateTime = (value: unknown, defaultZone?: string): DateTime => {
	if (DateTime.isDateTime(value) && value.isValid) {
		// Ignore the defaultZone if the value is already a DateTime
		// because DateTime objects already contain the zone information
		return value;
	}

	if (value instanceof Date) {
		const fromJSDate = DateTime.fromJSDate(value, { zone: defaultZone });
		if (fromJSDate.isValid) {
			return fromJSDate;
		}
	}

	const dateString = String(value).trim();

	// Rely on luxon to parse different date formats
	const isoDate = DateTime.fromISO(dateString, { zone: defaultZone, setZone: true });
	if (isoDate.isValid) {
		return isoDate;
	}
	const httpDate = DateTime.fromHTTP(dateString, { zone: defaultZone, setZone: true });
	if (httpDate.isValid) {
		return httpDate;
	}
	const rfc2822Date = DateTime.fromRFC2822(dateString, { zone: defaultZone, setZone: true });
	if (rfc2822Date.isValid) {
		return rfc2822Date;
	}
	const sqlDate = DateTime.fromSQL(dateString, { zone: defaultZone, setZone: true });
	if (sqlDate.isValid) {
		return sqlDate;
	}

	const parsedDateTime = DateTime.fromMillis(Date.parse(dateString), { zone: defaultZone });
	if (parsedDateTime.isValid) {
		return parsedDateTime;
	}

	throw new ApplicationError('Value is not a valid date', { extra: { dateString } });
};

export const tryToParseTime = (value: unknown): string => {
	const isTimeInput = /^\d{2}:\d{2}(:\d{2})?((\-|\+)\d{4})?((\-|\+)\d{1,2}(:\d{2})?)?$/s.test(
		String(value),
	);
	if (!isTimeInput) {
		throw new ApplicationError('Value is not a valid time', { extra: { value } });
	}
	return String(value);
};

export const tryToParseArray = (value: unknown): unknown[] => {
	try {
		if (typeof value === 'object' && Array.isArray(value)) {
			return value;
		}

		let parsed: unknown[];
		try {
			parsed = JSON.parse(String(value)) as unknown[];
		} catch (e) {
			parsed = JSON.parse(String(value).replace(/'/g, '"')) as unknown[];
		}

		if (!Array.isArray(parsed)) {
			throw new ApplicationError('Value is not a valid array', { extra: { value } });
		}
		return parsed;
	} catch (e) {
		throw new ApplicationError('Value is not a valid array', { extra: { value } });
	}
};

export const tryToParseObject = (value: unknown): object => {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value;
	}
	try {
		const o = jsonParse<object>(String(value), { acceptJSObject: true });

		if (typeof o !== 'object' || Array.isArray(o)) {
			throw new ApplicationError('Value is not a valid object', { extra: { value } });
		}
		return o;
	} catch (e) {
		throw new ApplicationError('Value is not a valid object', { extra: { value } });
	}
};

const ALLOWED_FORM_FIELDS_KEYS = [
	'fieldLabel',
	'fieldType',
	'placeholder',
	'fieldOptions',
	'multiselect',
	'multipleFiles',
	'acceptFileTypes',
	'formatDate',
	'requiredField',
	'fieldValue',
	'elementName',
	'html',
];

const ALLOWED_FIELD_TYPES = [
	'date',
	'dropdown',
	'email',
	'file',
	'number',
	'password',
	'text',
	'textarea',
	'checkbox',
	'radio',
	'html',
	'hiddenField',
];

export const tryToParseJsonToFormFields = (value: unknown): FormFieldsParameter => {
	const fields: FormFieldsParameter = [];

	try {
		const rawFields = jsonParse<Array<{ [key: string]: unknown }>>(value as string, {
			acceptJSObject: true,
		});

		for (const [index, field] of rawFields.entries()) {
			for (const key of Object.keys(field)) {
				if (!ALLOWED_FORM_FIELDS_KEYS.includes(key)) {
					throw new ApplicationError(`Key '${key}' in field ${index} is not valid for form fields`);
				}
				if (
					key !== 'fieldOptions' &&
					!['string', 'number', 'boolean'].includes(typeof field[key])
				) {
					field[key] = String(field[key]);
				} else if (typeof field[key] === 'string' && key !== 'html') {
					field[key] = field[key].replace(/</g, '&lt;').replace(/>/g, '&gt;');
				}

				if (key === 'fieldType' && !ALLOWED_FIELD_TYPES.includes(field[key] as string)) {
					throw new ApplicationError(
						`Field type '${field[key] as string}' in field ${index} is not valid for form fields`,
					);
				}

				if (key === 'fieldOptions') {
					if (Array.isArray(field[key])) {
						field[key] = { values: field[key] };
					}

					if (
						typeof field[key] !== 'object' ||
						!(field[key] as { [key: string]: unknown }).values
					) {
						throw new ApplicationError(
							`Field dropdown in field ${index} does has no 'values' property that contain an array of options`,
						);
					}

					for (const [optionIndex, option] of (
						(field[key] as { [key: string]: unknown }).values as Array<{
							[key: string]: { option: string };
						}>
					).entries()) {
						if (Object.keys(option).length !== 1 || typeof option.option !== 'string') {
							throw new ApplicationError(
								`Field dropdown in field ${index} has an invalid option ${optionIndex}`,
							);
						}
					}
				}
			}

			fields.push(field as FormFieldsParameter[number]);
		}
	} catch (error) {
		if (error instanceof ApplicationError) throw error;

		throw new ApplicationError('Value is not valid JSON');
	}
	return fields;
};

export const getValueDescription = <T>(value: T): string => {
	if (typeof value === 'object') {
		if (value === null) return "'null'";
		if (Array.isArray(value)) return 'array';
		return 'object';
	}

	return `'${String(value)}'`;
};

export const tryToParseUrl = (value: unknown): string => {
	if (typeof value === 'string' && !value.includes('://')) {
		value = `http://${value}`;
	}
	const urlPattern = /^(https?|ftp|file):\/\/\S+|www\.\S+/;
	if (!urlPattern.test(String(value))) {
		throw new ApplicationError(`The value "${String(value)}" is not a valid url.`, {
			extra: { value },
		});
	}
	return String(value);
};

export const tryToParseJwt = (value: unknown): string => {
	const error = new ApplicationError(`The value "${String(value)}" is not a valid JWT token.`, {
		extra: { value },
	});

	if (!value) throw error;

	const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/;

	if (!jwtPattern.test(String(value))) throw error;

	return String(value);
};

type ValidateFieldTypeOptions = Partial<{
	valueOptions: INodePropertyOptions[];
	strict: boolean;
	parseStrings: boolean;
}>;

// Validates field against the schema and tries to parse it to the correct type
export function validateFieldType<K extends FieldType>(
	fieldName: string,
	value: unknown,
	type: K,
	options?: ValidateFieldTypeOptions,
): ValidationResult<K>;
// eslint-disable-next-line complexity
export function validateFieldType(
	fieldName: string,
	value: unknown,
	type: FieldType,
	options: ValidateFieldTypeOptions = {},
): ValidationResult {
	if (value === null || value === undefined) return { valid: true };
	const strict = options.strict ?? false;
	const valueOptions = options.valueOptions ?? [];
	const parseStrings = options.parseStrings ?? false;

	const defaultErrorMessage = `'${fieldName}' expects a ${type} but we got ${getValueDescription(value)}`;
	switch (type.toLowerCase()) {
		case 'string': {
			if (!parseStrings) return { valid: true, newValue: value };
			try {
				if (strict && typeof value !== 'string') {
					return { valid: false, errorMessage: defaultErrorMessage };
				}
				return { valid: true, newValue: tryToParseString(value) };
			} catch (e) {
				return { valid: false, errorMessage: defaultErrorMessage };
			}
		}
		case 'string-alphanumeric': {
			try {
				return { valid: true, newValue: tryToParseAlphanumericString(value) };
			} catch (e) {
				return {
					valid: false,
					errorMessage:
						'Value is not a valid alphanumeric string, only letters, numbers and underscore allowed',
				};
			}
		}
		case 'number': {
			try {
				if (strict && typeof value !== 'number') {
					return { valid: false, errorMessage: defaultErrorMessage };
				}
				return { valid: true, newValue: tryToParseNumber(value) };
			} catch (e) {
				return { valid: false, errorMessage: defaultErrorMessage };
			}
		}
		case 'boolean': {
			try {
				if (strict && typeof value !== 'boolean') {
					return { valid: false, errorMessage: defaultErrorMessage };
				}
				return { valid: true, newValue: tryToParseBoolean(value) };
			} catch (e) {
				return { valid: false, errorMessage: defaultErrorMessage };
			}
		}
		case 'datetime': {
			try {
				return { valid: true, newValue: tryToParseDateTime(value) };
			} catch (e) {
				const luxonDocsURL =
					'https://moment.github.io/luxon/api-docs/index.html#datetimefromformat';
				const errorMessage = `${defaultErrorMessage} <br/><br/> Consider using <a href="${luxonDocsURL}" target="_blank"><code>DateTime.fromFormat</code></a> to work with custom date formats.`;
				return { valid: false, errorMessage };
			}
		}
		case 'time': {
			try {
				return { valid: true, newValue: tryToParseTime(value) };
			} catch (e) {
				return {
					valid: false,
					errorMessage: `'${fieldName}' expects time (hh:mm:(:ss)) but we got ${getValueDescription(value)}.`,
				};
			}
		}
		case 'object': {
			try {
				if (strict && !isObject(value)) {
					return { valid: false, errorMessage: defaultErrorMessage };
				}
				return { valid: true, newValue: tryToParseObject(value) };
			} catch (e) {
				return { valid: false, errorMessage: defaultErrorMessage };
			}
		}
		case 'array': {
			if (strict && !Array.isArray(value)) {
				return { valid: false, errorMessage: defaultErrorMessage };
			}
			try {
				return { valid: true, newValue: tryToParseArray(value) };
			} catch (e) {
				return { valid: false, errorMessage: defaultErrorMessage };
			}
		}
		case 'options': {
			const validOptions = valueOptions.map((option) => option.value).join(', ');
			const isValidOption = valueOptions.some((option) => option.value === value);

			if (!isValidOption) {
				return {
					valid: false,
					errorMessage: `'${fieldName}' expects one of the following values: [${validOptions}] but we got ${getValueDescription(
						value,
					)}`,
				};
			}
			return { valid: true, newValue: value };
		}
		case 'url': {
			try {
				return { valid: true, newValue: tryToParseUrl(value) };
			} catch (e) {
				return { valid: false, errorMessage: defaultErrorMessage };
			}
		}
		case 'jwt': {
			try {
				return { valid: true, newValue: tryToParseJwt(value) };
			} catch (e) {
				return {
					valid: false,
					errorMessage: 'Value is not a valid JWT token',
				};
			}
		}
		case 'form-fields': {
			try {
				return { valid: true, newValue: tryToParseJsonToFormFields(value) };
			} catch (e) {
				return {
					valid: false,
					errorMessage: (e as Error).message,
				};
			}
		}
		default: {
			return { valid: true, newValue: value };
		}
	}
}
