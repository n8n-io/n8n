import { describe, expect, test } from 'vitest';

import { shouldSkipContainerRequirement } from './capabilities';

describe('shouldSkipContainerRequirement', () => {
	test('skips a named service-backed capability in local mode', () => {
		expect(shouldSkipContainerRequirement('proxy', true)).toBe(true);
	});

	test('skips an object service-backed capability in local mode', () => {
		expect(shouldSkipContainerRequirement({ services: ['proxy'] }, true)).toBe(true);
	});

	test('keeps a capability without services in local mode', () => {
		expect(shouldSkipContainerRequirement({ env: { TEST_SETTING: 'true' } }, true)).toBe(false);
	});

	test('keeps service-backed capabilities in container mode', () => {
		expect(shouldSkipContainerRequirement('proxy', false)).toBe(false);
	});
});
