import type { NodeExecutionHint } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

/**
 * Nodes that take a list of field names report one hint per field they couldn't
 * find. Use the same group key so the UI can collapse them under one summary.
 */
export const fieldNotFoundHint = (field: string): NodeExecutionHint => ({
	message: `The field '${field}' wasn't found in any input item`,
	location: 'outputPane',
	group: {
		key: 'fieldNotFound',
		summary: "{count} fields weren't found in your input items",
		label: field,
	},
});

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
	throw new UserError(
		`The \'${fieldName}\' parameter must be a string of fields separated by commas or an array of strings.`,
		{ level: 'warning' },
	);
};
