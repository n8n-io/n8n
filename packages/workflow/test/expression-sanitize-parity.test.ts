import { __sanitize } from '@n8n/expression-runtime';

import { isSafeObjectProperty, unsafeObjectProperties } from '../src/utils';

/**
 * The expression transform checks static and literal member keys against
 * `unsafeObjectProperties` at compile time. Keys built at runtime are checked
 * later, inside the engine, by the runtime sanitizer. The two checks must
 * reject the same names or a key assembled at runtime bypasses the transform.
 * This file does not evaluate expressions, so it runs in the default project.
 */
describe('engine property denylist parity', () => {
	it('rejects every transform-denied name in the runtime sanitizer', () => {
		for (const name of unsafeObjectProperties) {
			// Control: the name really is denied at transform time.
			expect(isSafeObjectProperty(name)).toBe(false);
			expect(() => __sanitize(name)).toThrow(`Cannot access "${name}" due to security concerns`);
		}
	});
});
