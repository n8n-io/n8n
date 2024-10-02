import { DateTime } from 'luxon';

import { ExpressionExtensionError } from '../errors/expression-extension.error';

// Utility functions and type guards for expression extensions

export const convertToDateTime = (value: string | Date | DateTime): DateTime | undefined => {
	let converted: DateTime | undefined;

	if (typeof value === 'string') {
		converted = DateTime.fromJSDate(new Date(value));
		if (converted.invalidReason !== null) {
			return;
		}
	} else if (value instanceof Date) {
		converted = DateTime.fromJSDate(value);
	} else if (DateTime.isDateTime(value)) {
		converted = value;
	}
	return converted;
};

export function checkIfValueDefinedOrThrow<T>(value: T, functionName: string): void {
	if (value === undefined || value === null) {
		throw new ExpressionExtensionError(`${functionName} can't be used on ${String(value)} value`, {
			description: `To ignore this error, add a ? to the variable before this function, e.g. my_var?.${functionName}`,
		});
	}
}
