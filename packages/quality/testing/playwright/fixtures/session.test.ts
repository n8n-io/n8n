import { describe, expect, test } from 'vitest';

import { roleFromTags, storageStateForEditor, wantsReset, type StorageState } from './session';
import { N8N_AUTH_COOKIE } from '../config/constants';

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

describe('storageStateForEditor', () => {
	const backendUrl = 'http://127.0.0.1:5678';
	const session: StorageState = {
		cookies: [
			{
				name: N8N_AUTH_COOKIE,
				value: 'test-session',
				domain: '127.0.0.1',
				path: '/',
				expires: -1,
				httpOnly: true,
				secure: false,
				sameSite: 'Lax',
			},
		],
		origins: [],
	};

	test('keeps the session when the editor uses the backend hostname', () => {
		expect(storageStateForEditor(session, backendUrl, backendUrl)).toEqual(session);
		expect(storageStateForEditor(session, backendUrl, 'http://127.0.0.1:8080')).toEqual(session);
	});

	test('authenticates a split-host editor without changing the API session', () => {
		const editorState = storageStateForEditor(session, backendUrl, 'http://localhost:8080');

		expect(editorState.cookies).toEqual([{ ...session.cookies[0], domain: 'localhost' }]);
		expect(session.cookies[0].domain).toBe('127.0.0.1');
	});

	test('keeps unrelated cookies and origin storage on their original hosts', () => {
		const state: StorageState = {
			cookies: [
				...session.cookies,
				{ ...session.cookies[0], name: 'preference' },
				{ ...session.cookies[0], domain: 'other.example' },
			],
			origins: [{ origin: backendUrl, localStorage: [{ name: 'preference', value: 'dark' }] }],
		};

		const editorState = storageStateForEditor(state, backendUrl, 'http://localhost:8080');

		expect(editorState.cookies.slice(1)).toEqual(state.cookies.slice(1));
		expect(editorState.origins).toEqual(state.origins);
	});

	test('keeps an unauthenticated session empty for a split-host editor', () => {
		const empty: StorageState = { cookies: [], origins: [] };
		expect(storageStateForEditor(empty, backendUrl, 'http://localhost:8080')).toEqual(empty);
	});
});
