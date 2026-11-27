import { EXTENSION_OBJECTS } from '@n8n/expression-runtime';

import { ExpressionExtensions } from '../src/extensions';

/**
 * Native evaluation takes its extension allowlist from the runtime copy of the
 * extensions and calls the copy in this package. A name in only one copy makes
 * the native result differ from the engine result.
 * This file does not evaluate expressions, so it runs in the default project.
 */
describe('expression extension name parity', () => {
	const qualifiedNames = (extensions: Array<{ typeName: string; functions: object }>) =>
		extensions
			.flatMap(({ typeName, functions }) =>
				Object.keys(functions).map((name) => `${typeName}.${name}`),
			)
			.sort();

	it('has the same extension names in the runtime copy and in this package', () => {
		expect(qualifiedNames(EXTENSION_OBJECTS)).toEqual(qualifiedNames(ExpressionExtensions));
	});
});
