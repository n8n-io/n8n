import {
	REMOVED_EXPRESSION_GLOBALS as RUNTIME_LIST,
	removedGlobalMessage as runtimeMessage,
} from '@n8n/expression-runtime';

import {
	REMOVED_EXPRESSION_GLOBALS,
	removedGlobalMessage,
} from '../src/expressions/removed-globals';

// The VM engine's copy lives in @n8n/expression-runtime because its context is
// bundled into the isolate from there, and that package cannot depend on this
// one. editor-ui aliases the whole package to a browser stub, so the legacy
// engine keeps its own copy here. These assertions fail if the two drift.
describe('removed expression globals', () => {
	it('lists the same globals in both engines', () => {
		expect(REMOVED_EXPRESSION_GLOBALS).toEqual(RUNTIME_LIST);
	});

	it('raises the same message in both engines', () => {
		for (const name of Object.keys(REMOVED_EXPRESSION_GLOBALS) as Array<
			keyof typeof REMOVED_EXPRESSION_GLOBALS
		>) {
			expect(removedGlobalMessage(name)).toBe(runtimeMessage(name));
		}
	});
});
