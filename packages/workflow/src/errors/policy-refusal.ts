/**
 * Whether an error carries the own `isPolicyRefusal` marker that a policy refusal sets.
 * Lets packages that cannot import the refusal class recognise one, also after serialization.
 */
export function hasPolicyRefusalMarker(error: unknown): boolean {
	// `hasOwn`, not `in` alone: an inherited marker must not count.
	return (
		typeof error === 'object' &&
		error !== null &&
		Object.hasOwn(error, 'isPolicyRefusal') &&
		'isPolicyRefusal' in error &&
		error.isPolicyRefusal === true
	);
}
