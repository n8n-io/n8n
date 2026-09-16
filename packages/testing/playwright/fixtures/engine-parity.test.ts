import { describe, expect, test } from 'vitest';

import {
	ENGINE_TAG_PREFIX,
	ENGINE_TAGS,
	engineParityDisposition,
	workflowSettingsFor,
} from './engine-parity';

describe('ENGINE_TAGS', () => {
	test('every tag starts with the prefix the engine project greps for', () => {
		for (const tag of Object.values(ENGINE_TAGS)) {
			expect(tag.startsWith(ENGINE_TAG_PREFIX)).toBe(true);
		}
	});
});

describe('workflowSettingsFor', () => {
	test('returns no defaults for a stack without engine 2.0', () => {
		expect(workflowSettingsFor({ postgres: true })).toBeUndefined();
	});

	test('opts every workflow into engine 2.0 when the stack runs it', () => {
		expect(workflowSettingsFor({ postgres: true, engine: 'in-process' })).toEqual({
			engineType: 'v2',
		});
	});
});

describe('engineParityDisposition', () => {
	test('runs every test as-is on the legacy engine, whatever its tag', () => {
		for (const tag of Object.values(ENGINE_TAGS)) {
			expect(engineParityDisposition([tag], undefined)).toEqual({ action: 'run' });
		}
	});

	test('runs an untagged test on engine 2.0', () => {
		expect(engineParityDisposition(['@auth:owner'], 'in-process')).toEqual({ action: 'run' });
	});

	test('runs a test tagged as supported on engine 2.0', () => {
		expect(engineParityDisposition([ENGINE_TAGS.supported], 'in-process')).toEqual({
			action: 'run',
		});
	});

	test('skips a test that engine 2.0 will never support', () => {
		expect(engineParityDisposition([ENGINE_TAGS.unsupported], 'in-process')).toMatchObject({
			action: 'skip',
			reason: expect.stringContaining('never'),
		});
	});

	test('expects a test that engine 2.0 does not support yet to fail', () => {
		expect(engineParityDisposition([ENGINE_TAGS.pending], 'in-process')).toMatchObject({
			action: 'expect-fail',
			reason: expect.stringContaining('yet'),
		});
	});

	test('rejects a misspelled engine tag instead of treating it as supported', () => {
		expect(() => engineParityDisposition(['@engine:v2-pendign'], 'in-process')).toThrow(
			/@engine:v2-pendign/,
		);
	});

	test('rejects a misspelled engine tag on the legacy engine too', () => {
		expect(() => engineParityDisposition(['@engine:v1only'], undefined)).toThrow(/@engine:v1only/);
	});
});
