import set from 'lodash/set';

// Guards the lodash@4.18.1 patch (patches/lodash@4.18.1.patch): while walking a
// dot-notation path, `baseSet` reuses the value already present at a segment only
// when it is an own property, otherwise it creates a fresh object. A segment that
// matches an inherited member is therefore stored as plain own data instead of
// being followed onto an object shared through the prototype chain. These tests
// fail if the patch is ever dropped (e.g. on a lodash bump).
describe('lodash/set patch', () => {
	const originalToStringCall = Object.prototype.toString.call;
	afterEach(() => {
		Object.prototype.toString.call = originalToStringCall;
	});

	it('writes a top-level built-in-named segment as own data', () => {
		const obj: Record<string, unknown> = {};
		set(obj, 'toString.call', 'x');

		// Read the global into a local and restore it before any expect(), since
		// expect()/toEqual themselves use Object.prototype.toString.call.
		const callType = typeof Object.prototype.toString.call;
		Object.prototype.toString.call = originalToStringCall;

		expect(callType).toBe('function');
		expect(obj).toEqual({ toString: { call: 'x' } });
	});

	it('writes a nested built-in-named segment as own data', () => {
		const obj: Record<string, unknown> = {};
		set(obj, 'a.toString.call', 'x');

		const callType = typeof Object.prototype.toString.call;
		Object.prototype.toString.call = originalToStringCall;

		expect(callType).toBe('function');
		expect(obj).toEqual({ a: { toString: { call: 'x' } } });
	});

	it('preserves normal and array paths', () => {
		const obj: Record<string, unknown> = {};
		set(obj, 'a.b.c', 1);
		set(obj, 'list[0].name', 'n');

		expect(obj).toEqual({ a: { b: { c: 1 } }, list: [{ name: 'n' }] });
	});
});
