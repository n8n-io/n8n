import { observeHookedMethods, olderThan } from './catalogue';

describe('HOOKED_METHODS', () => {
	it('leaves engine methods out of the install check, which runs without engine v2', () => {
		expect(observeHookedMethods('latest').some((h) => h.file.startsWith('@n8n/engine/'))).toBe(
			false,
		);
	});
});

describe('olderThan', () => {
	it('compares release tags by number, not as text', () => {
		expect(olderThan('2.9.0', '2.39.0')).toBe(true);
	});
});
