import { describe, expect, test } from 'vitest';

import { roleFromTags, wantsReset } from './session';

describe('roleFromTags', () => {
	test('signs in as the owner without an auth tag', () => {
		expect(roleFromTags(['@db:reset'])).toBe('owner');
	});

	test('reads each role tag in any case', () => {
		expect(roleFromTags(['@auth:admin'])).toBe('admin');
		expect(roleFromTags(['@auth:member'])).toBe('member');
		expect(roleFromTags(['@auth:chat'])).toBe('chat');
		expect(roleFromTags(['@auth:none'])).toBe('none');
		expect(roleFromTags(['@AUTH:Member'])).toBe('member');
	});

	test('rejects an unknown auth tag', () => {
		expect(() => roleFromTags(['@auth:guest'])).toThrow('Unsupported auth tag: @auth:guest');
	});
});

describe('wantsReset', () => {
	test('reads the reset tag in any case', () => {
		expect(wantsReset(['@DB:Reset'])).toBe(true);
		expect(wantsReset(['@auth:member'])).toBe(false);
	});
});
