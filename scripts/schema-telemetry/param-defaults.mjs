/**
 * Reads the boolean default of a simplify-style parameter from a node's
 * TypeScript sources. The plain `<operation>.json` must hold the default
 * shape, so a variant file is only safe when the default is known.
 */

/** `default:` of each `name: '<param>'` definition, within the next few lines. */
function defaultsIn(text, param) {
	const pattern = new RegExp(`name: '${param}',[\\s\\S]{0,400}?default: (true|false)`, 'g');
	return [...text.matchAll(pattern)].map((m) => m[1]);
}

/**
 * @param {{ path: string, text: string }[]} sources the node's `.ts` files
 * @param {{ param: string, operation: string }} target
 * @returns {'true' | 'false' | undefined}
 */
export function findParamDefault(sources, { param, operation }) {
	const found = sources.flatMap((s) =>
		defaultsIn(s.text, param).map((value) => ({ path: s.path, value })),
	);
	const values = new Set(found.map((f) => f.value));
	if (values.size === 1) return [...values][0];
	if (values.size === 0) return undefined;

	const inOperationFile = new Set(
		found.filter((f) => f.path.split('/').pop()?.startsWith(`${operation}.`)).map((f) => f.value),
	);
	return inOperationFile.size === 1 ? [...inOperationFile][0] : undefined;
}
