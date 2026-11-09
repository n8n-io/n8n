// eslint-disable-next-line lodash/import-scope -- the bundled lodash.js is patched separately
import { omit as bundledOmit, unset as bundledUnset } from 'lodash';
import omit from 'lodash/omit';
import unset from 'lodash/unset';

// Guards the lodash@4.18.1 patch (patches/lodash@4.18.1.patch): while walking a
// dot-notation path, `baseUnset` (used by `unset` and `omit`) follows a segment
// only when it is an own property. A path that names an inherited member
// therefore deletes nothing. These tests fail if the patch is ever dropped
// (e.g. on a lodash bump).
describe.each([
	['lodash/unset', unset, omit],
	['lodash', bundledUnset, bundledOmit],
])('%s patch', (_, unsetFn, omitFn) => {
	const marker = 'n8nUnsetPatchMarker';
	const removers = [
		['unset', (obj: object, path: string) => unsetFn(obj, path)],
		['omit', (obj: object, path: string) => omitFn(obj, path)],
	] as const;

	beforeEach(() => {
		Object.defineProperty(Object.prototype, marker, {
			value: { x: 1 },
			configurable: true,
			writable: true,
		});
	});

	afterEach(() => {
		delete (Object.prototype as Record<string, unknown>)[marker];
	});

	it.each(removers)('%s does not follow an inherited top-level segment', (__, remove) => {
		remove({}, `${marker}.x`);

		expect(Object.prototype).toHaveProperty([marker, 'x'], 1);
	});

	it.each(removers)('%s follows only own segments below the root', (__, remove) => {
		const obj = JSON.parse('{"__proto__":{"x":1},"a":{"b":1}}') as object;

		remove(obj, `a.__proto__.${marker}`);

		expect(Object.prototype).toHaveProperty([marker, 'x'], 1);
	});

	it('skips inherited data in nested paths', () => {
		const obj = Object.create({ inner: { x: 1 } }) as { inner: { x: number } };

		expect(unsetFn(obj, 'inner.x')).toBe(true);
		expect(obj.inner).toEqual({ x: 1 });
	});

	it('unsets nested own properties, including an own "__proto__" key', () => {
		const obj = JSON.parse('{"__proto__":{"x":1,"y":2},"a":{"b":1,"c":2},"list":[{"n":1,"m":2}]}');

		expect(unsetFn(obj, 'a.b')).toBe(true);
		expect(unsetFn(obj, 'list[0].n')).toBe(true);
		expect(unsetFn(obj, '__proto__.x')).toBe(true);
		expect(unsetFn(obj, 'missing.path')).toBe(true);

		expect(obj.a).toEqual({ c: 2 });
		expect(obj.list).toEqual([{ m: 2 }]);
		expect(Object.getOwnPropertyDescriptor(obj, '__proto__')?.value).toEqual({ y: 2 });
	});

	it('omits nested own properties', () => {
		const obj = { a: { b: 1, c: 2 }, list: [{ n: 1, m: 2 }] };

		expect(omitFn(obj, ['a.b', 'list[0].n'])).toEqual({ a: { c: 2 }, list: [{ m: 2 }] });
	});
});
