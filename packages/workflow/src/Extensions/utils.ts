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
		throw new ExpressionExtensionError(
			`${functionName}() could not be called on "${String(value)}" type`,
			{
				description:
					'You are trying to access a field that does not exist, modify your expression or set a default value',
			},
		);
	}
}
