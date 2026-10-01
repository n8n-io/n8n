import { describe, expect, it } from 'vitest';

import { UnusedWorkspaceDepsRule } from './unused-workspace-deps.rule.js';

describe('UnusedWorkspaceDepsRule', () => {
	it('exposes the rule id the CLI and baseline key on', () => {
		const rule = new UnusedWorkspaceDepsRule();

		expect(rule.id).toBe('unused-workspace-deps');
		expect(rule.severity).toBe('warning');
	});

	it('reports nothing while detection is not implemented', () => {
		const rule = new UnusedWorkspaceDepsRule();

		expect(rule.analyze({ rootDir: '/does/not/exist' })).toEqual([]);
	});
});
