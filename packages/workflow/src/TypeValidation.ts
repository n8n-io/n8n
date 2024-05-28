import { DateTime } from 'luxon';
import type { FieldType, INodePropertyOptions, ValidationResult } from './Interfaces';
import isObject from 'lodash/isObject';
import { ApplicationError } from './errors';

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

export const tryToParseDateTime = (value: unknown): DateTime => {
	if (value instanceof DateTime && value.isValid) {
		return value;
	}

	if (value instanceof Date) {
		const fromJSDate = DateTime.fromJSDate(value);
		if (fromJSDate.isValid) {
			return fromJSDate;
		}
	}

	const dateString = String(value).trim();

	// Rely on luxon to parse different date formats
	const isoDate = DateTime.fromISO(dateString, { setZone: true });
	if (isoDate.isValid) {
		return isoDate;
	}
	const httpDate = DateTime.fromHTTP(dateString, { setZone: true });
	if (httpDate.isValid) {
		return httpDate;
	}
	const rfc2822Date = DateTime.fromRFC2822(dateString, { setZone: true });
	if (rfc2822Date.isValid) {
		return rfc2822Date;
	}
	const sqlDate = DateTime.fromSQL(dateString, { setZone: true });
	if (sqlDate.isValid) {
		return sqlDate;
	}

	const parsedDateTime = DateTime.fromMillis(Date.parse(dateString));
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
		const o = JSON.parse(String(value)) as object;
		if (typeof o !== 'object' || Array.isArray(o)) {
			throw new ApplicationError('Value is not a valid object', { extra: { value } });
		}
		return o;
	} catch (e) {
		throw new ApplicationError('Value is not a valid object', { extra: { value } });
	}
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
	const defaultErrorMessage = `'${fieldName}' expects a ${type} but we got '${String(value)}'`;
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
					errorMessage: `'${fieldName}' expects time (hh:mm:(:ss)) but we got '${String(value)}'.`,
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
					errorMessage: `'${fieldName}' expects one of the following values: [${validOptions}] but we got '${String(
						value,
					)}'`,
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
		default: {
			return { valid: true, newValue: value };
		}
	}
}
