import { ApplicationError } from '@n8n/errors';

export const prepareFieldsArray = (fields: string | string[], fieldName = 'Fields') => {
	if (typeof fields === 'string') {
		return fields
			.split(',')
			.map((entry) => entry.trim())
			.filter((entry) => entry !== '');
	}
	if (Array.isArray(fields)) {
		return fields;
	}
	throw new ApplicationError(
		`The \'${fieldName}\' parameter must be a string of fields separated by commas or an array of strings.`,
		{ level: 'warning' },
	);
};
