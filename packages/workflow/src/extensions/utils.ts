// NOTE: This file is intentionally mirrored in @n8n/expression-runtime/src/extensions/
// for use inside the isolated VM. Changes here must be reflected there and vice versa.
// TODO: Eliminate the duplication. The blocker is that @n8n/expression-runtime is
// Vite-stubbed for browser builds (to exclude isolated-vm), which prevents n8n-workflow
// from importing these extension utilities directly from the runtime package. Fix by
// splitting @n8n/expression-runtime into a browser-safe extensions subpath (not stubbed)
// and a node-only VM entry (stubbed).
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
