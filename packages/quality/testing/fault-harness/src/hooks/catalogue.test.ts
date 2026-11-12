import { HOOKED_METHODS, observeHookedMethods, olderThan } from './catalogue';
import { LEADER_HOOKS } from '../multi-main';

const refOf = (ref: { file: string; target: string; method: string }) =>
	`${ref.file} ${ref.target}.${ref.method}`;
const listed = new Set(HOOKED_METHODS.map(refOf));

describe('HOOKED_METHODS', () => {
	it('lists every method the leader hooks use', () => {
		expect(LEADER_HOOKS.map(refOf).filter((ref) => !listed.has(ref))).toEqual([]);
	});

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
