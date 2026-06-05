import { augmentArray, augmentObject } from '../src/augment-object';
import type { IDataObject } from '../src/interfaces';
import { deepCopy } from '../src/utils';

describe('AugmentObject', () => {
	describe('augmentArray', () => {
		test('should work with arrays', () => {
			const originalObject = [1, 2, 3, 4, null];
			const copyOriginal = deepCopy(originalObject);

			const augmentedObject = augmentArray(originalObject);

			expect(augmentedObject.constructor.name).toEqual('Array');

			expect(augmentedObject.push(5)).toEqual(6);
			expect(augmentedObject).toEqual([1, 2, 3, 4, null, 5]);
			expect(originalObject).toEqual(copyOriginal);

			expect(augmentedObject.pop()).toEqual(5);
			expect(augmentedObject).toEqual([1, 2, 3, 4, null]);
			expect(originalObject).toEqual(copyOriginal);

			expect(augmentedObject.shift()).toEqual(1);
			expect(augmentedObject).toEqual([2, 3, 4, null]);
			expect(originalObject).toEqual(copyOriginal);

			expect(augmentedObject.unshift(1)).toEqual(5);
			expect(augmentedObject).toEqual([1, 2, 3, 4, null]);
			expect(originalObject).toEqual(copyOriginal);

			expect(augmentedObject.splice(1, 1)).toEqual([2]);
			expect(augmentedObject).toEqual([1, 3, 4, null]);
			expect(originalObject).toEqual(copyOriginal);

			expect(augmentedObject.slice(1)).toEqual([3, 4, null]);
			expect(originalObject).toEqual(copyOriginal);

			expect(augmentedObject.reverse()).toEqual([null, 4, 3, 1]);
			expect(originalObject).toEqual(copyOriginal);
		});

		test('should work with arrays on any level', () => {
			const originalObject = {
				a: {
					b: {
						c: [
							{
								a3: {
									b3: {
										c3: '03' as string | null,
									},
								},
								aa3: '01',
							},
							{
								a3: {
									b3: {
										c3: '13',
									},
								},
								aa3: '11',
							},
						],
					},
				},
				aa: [
					{
						a3: {
							b3: '2',
						},
						aa3: '1',
					},
				],
			};
			const copyOriginal = deepCopy(originalObject);

			const augmentedObject = augmentObject(originalObject);

			// On first level
			augmentedObject.aa[0].a3.b3 = '22';
			expect(augmentedObject.aa[0].a3.b3).toEqual('22');
			expect(originalObject.aa[0].a3.b3).toEqual('2');

			// Make sure that also array operations as push and length work as expected
			// On lower levels
			augmentedObject.a.b.c[0].a3.b3.c3 = '033';
			expect(augmentedObject.a.b.c[0].a3.b3.c3).toEqual('033');
			expect(originalObject.a.b.c[0].a3.b3.c3).toEqual('03');

			augmentedObject.a.b.c[1].a3.b3.c3 = '133';
			expect(augmentedObject.a.b.c[1].a3.b3.c3).toEqual('133');
			expect(originalObject.a.b.c[1].a3.b3.c3).toEqual('13');

			augmentedObject.a.b.c.push({
				a3: {
					b3: {
						c3: '23',
					},
				},
				aa3: '21',
			});
			augmentedObject.a.b.c[2].a3.b3.c3 = '233';
			expect(augmentedObject.a.b.c[2].a3.b3.c3).toEqual('233');

			augmentedObject.a.b.c[2].a3.b3.c3 = '2333';
			expect(augmentedObject.a.b.c[2].a3.b3.c3).toEqual('2333');

			augmentedObject.a.b.c[2].a3.b3.c3 = null;
			expect(augmentedObject.a.b.c[2].a3.b3.c3).toEqual(null);

			expect(originalObject).toEqual(copyOriginal);

			expect(augmentedObject.a.b.c.length).toEqual(3);

			expect(augmentedObject.aa).toEqual([
				{
					a3: {
						b3: '22',
					},
					aa3: '1',
				},
			]);

			expect(augmentedObject.a.b.c).toEqual([
				{
					a3: {
						b3: {
							c3: '033',
						},
					},
					aa3: '01',
				},
				{
					a3: {
						b3: {
							c3: '133',
						},
					},
					aa3: '11',
				},
				{
					a3: {
						b3: {
							c3: null,
						},
					},
					aa3: '21',
				},
			]);

			expect(augmentedObject).toEqual({
				a: {
					b: {
						c: [
							{
								a3: {
									b3: {
										c3: '033',
									},
								},
								aa3: '01',
							},
							{
								a3: {
									b3: {
										c3: '133',
									},
								},
								aa3: '11',
							},
							{
								a3: {
									b3: {
										c3: null,
									},
								},
								aa3: '21',
							},
						],
					},
				},
				aa: [
					{
						a3: {
							b3: '22',
						},
						aa3: '1',
					},
				],
			});

			expect(originalObject).toEqual(copyOriginal);
		});
	});

	describe('augmentObject', () => {
		test('should work with simple values on first level', () => {
			const date = new Date(1680089084200);
			const regexp = new RegExp('^test$', 'ig');
			const originalObject: IDataObject = {
				1: 11,
				2: '22',
				a: 111,
				b: '222',
				d: date,
				r: regexp,
			};
			const copyOriginal = deepCopy(originalObject);

			const augmentedObject = augmentObject(originalObject);

			expect(augmentedObject.constructor.name).toEqual('Object');

			augmentedObject[1] = 911;
			expect(originalObject[1]).toEqual(11);
			expect(augmentedObject[1]).toEqual(911);

			augmentedObject[2] = '922';
			expect(originalObject[2]).toEqual('22');
			expect(augmentedObject[2]).toEqual('922');

			augmentedObject.a = 9111;
			expect(originalObject.a).toEqual(111);
			expect(augmentedObject.a).toEqual(9111);

			augmentedObject.b = '9222';
			expect(originalObject.b).toEqual('222');
			expect(augmentedObject.b).toEqual('9222');

			augmentedObject.c = 3;

			expect({ ...originalObject, d: date.toJSON(), r: {} }).toEqual(copyOriginal);

			expect(augmentedObject).toEqual({
				1: 911,
				2: '922',
				a: 9111,
				b: '9222',
				c: 3,
				d: date.toJSON(),
				r: regexp.toString(),
			});
		});

		test('should work with simple values on sub-level', () => {
			const originalObject = {
				a: {
					b: {
						cc: '3',
					},
					bb: '2',
				},
				aa: '1',
			};
			const copyOriginal = deepCopy(originalObject);

			const augmentedObject = augmentObject(originalObject);

			augmentedObject.a.bb = '92';
			expect(originalObject.a.bb).toEqual('2');
			expect(augmentedObject.a.bb).toEqual('92');

			augmentedObject.a.b.cc = '93';
			expect(originalObject.a.b.cc).toEqual('3');
			expect(augmentedObject.a.b.cc).toEqual('93');

			// @ts-ignore
			augmentedObject.a.b.ccc = {
				d: '4',
			};

			// @ts-ignore
			expect(augmentedObject.a.b.ccc).toEqual({ d: '4' });

			// @ts-ignore
			augmentedObject.a.b.ccc.d = '94';
			// @ts-ignore
			expect(augmentedObject.a.b.ccc.d).toEqual('94');

			expect(originalObject).toEqual(copyOriginal);

			expect(augmentedObject).toEqual({
				a: {
					b: {
						cc: '93',
						ccc: {
							d: '94',
						},
					},
					bb: '92',
				},
				aa: '1',
			});
		});

		test('should work with complex values on first level', () => {
			const originalObject: any = {
				a: {
					b: {
						cc: '3',
						c2: null,
					},
					bb: '2',
				},
				aa: '1',
			};
			const copyOriginal = deepCopy(originalObject);

			const augmentedObject = augmentObject(originalObject);

			augmentedObject.a = { new: 'NEW' };
			expect(originalObject.a).toEqual({
				b: {
					c2: null,
					cc: '3',
				},
				bb: '2',
			});
			expect(augmentedObject.a).toEqual({ new: 'NEW' });

			augmentedObject.aa = '11';
			expect(originalObject.aa).toEqual('1');
			expect(augmentedObject.aa).toEqual('11');

			augmentedObject.aaa = {
				bbb: {
					ccc: '333',
				},
			};

			expect(originalObject).toEqual(copyOriginal);
			expect(augmentedObject).toEqual({
				a: {
					new: 'NEW',
				},
				aa: '11',
				aaa: {
					bbb: {
						ccc: '333',
					},
				},
			});
		});

		test('should work with delete and reset', () => {
			const originalObject = {
				a: {
					b: {
						c: {
							d: '4' as string | undefined,
						} as { d?: string; dd?: string } | undefined,
						cc: '3' as string | undefined,
					},
					bb: '2' as string | undefined,
				},
				aa: '1' as string | undefined,
			};
			const copyOriginal = deepCopy(originalObject);

			const augmentedObject = augmentObject(originalObject);

			// Remove multiple values
			delete augmentedObject.a.b.c!.d;
			expect(augmentedObject.a.b.c!.d).toEqual(undefined);
			expect(originalObject.a.b.c!.d).toEqual('4');

			expect(augmentedObject).toEqual({
				a: {
					b: {
						c: {},
						cc: '3',
					},
					bb: '2',
				},
				aa: '1',
			});
			expect(originalObject).toEqual(copyOriginal);

			delete augmentedObject.a.b.c;
			expect(augmentedObject.a.b.c).toEqual(undefined);
			expect(originalObject.a.b.c).toEqual({ d: '4' });

			expect(augmentedObject).toEqual({
				a: {
					b: {
						cc: '3',
					},
					bb: '2',
				},
				aa: '1',
			});
			expect(originalObject).toEqual(copyOriginal);

			// Set deleted values again
			augmentedObject.a.b.c = { dd: '444' };
			expect(augmentedObject.a.b.c).toEqual({ dd: '444' });
			expect(originalObject).toEqual(copyOriginal);

			augmentedObject.a.b.c.d = '44';
			expect(augmentedObject).toEqual({
				a: {
					b: {
						c: {
							d: '44',
							dd: '444',
						},
						cc: '3',
					},
					bb: '2',
				},
				aa: '1',
			});
			expect(originalObject).toEqual(copyOriginal);
		});

		// Is almost identical to above test
		test('should work with setting to undefined and reset', () => {
			const originalObject = {
				a: {
					b: {
						c: {
							d: '4' as string | undefined,
						} as { d?: string; dd?: string } | undefined,
						cc: '3' as string | undefined,
					},
					bb: '2' as string | undefined,
				},
				aa: '1' as string | undefined,
			};
			const copyOriginal = deepCopy(originalObject);

			const augmentedObject = augmentObject(originalObject);

			// Remove multiple values
			augmentedObject.a.b.c!.d = undefined;
			expect(augmentedObject.a.b.c!.d).toEqual(undefined);
			expect(originalObject.a.b.c!.d).toEqual('4');

			expect(augmentedObject).toEqual({
				a: {
					b: {
						c: {},
						cc: '3',
					},
					bb: '2',
				},
				aa: '1',
			});
			expect(originalObject).toEqual(copyOriginal);

			augmentedObject.a.b.c = undefined;
			expect(augmentedObject.a.b.c).toEqual(undefined);
			expect(originalObject.a.b.c).toEqual({ d: '4' });

			expect(augmentedObject).toEqual({
				a: {
					b: {
						cc: '3',
					},
					bb: '2',
				},
				aa: '1',
			});
			expect(originalObject).toEqual(copyOriginal);

			// Set deleted values again
			augmentedObject.a.b.c = { dd: '444' };
			expect(augmentedObject.a.b.c).toEqual({ dd: '444' });
			expect(originalObject).toEqual(copyOriginal);

			augmentedObject.a.b.c.d = '44';
			expect(augmentedObject).toEqual({
				a: {
					b: {
						c: {
							d: '44',
							dd: '444',
						},
						cc: '3',
					},
					bb: '2',
				},
				aa: '1',
			});
			expect(originalObject).toEqual(copyOriginal);
		});

		test('should ignore non-enumerable keys', () => {
			const originalObject = { a: 1, b: 2 };
			Object.defineProperty(originalObject, '__hiddenProp', { enumerable: false });

			const augmentedObject = augmentObject(originalObject);
			expect(Object.keys(augmentedObject)).toEqual(['a', 'b']);
		});

		test('should return property descriptors', () => {
			const originalObject: any = {
				x: {
					y: {},
					z: {},
				},
			};
			const augmentedObject = augmentObject(originalObject);

			expect(Object.getOwnPropertyDescriptor(augmentedObject.x, 'y')).toEqual({
				configurable: true,
				enumerable: true,
				value: {},
				writable: true,
			});

			delete augmentedObject.x.y;
			expect(augmentedObject.x.hasOwnProperty('y')).toEqual(false);

			augmentedObject.x.y = 42;
			expect(augmentedObject.x.hasOwnProperty('y')).toEqual(true);
			expect(Object.getOwnPropertyDescriptor(augmentedObject.x, 'y')).toEqual({
				configurable: true,
				enumerable: true,
				value: 42,
				writable: true,
			});
		});

		test('should return valid values on `has` calls', () => {
			const originalObject: any = {
				x: {
					y: {},
				},
			};
			const augmentedObject = augmentObject(originalObject);
			expect('y' in augmentedObject.x).toBe(true);
			expect('z' in augmentedObject.x).toBe(false);

			augmentedObject.x.z = 5;
			expect('z' in augmentedObject.x).toBe(true);
			expect('y' in augmentedObject.x).toBe(true);
		});

		test('should ignore non-enumerable keys', () => {
			const originalObject: { toString?: string } = { toString: '123' };
			const augmentedObject = augmentObject(originalObject);
			expect('toString' in augmentedObject).toBe(true);
			expect(Object.keys(augmentedObject)).toEqual(['toString']);
			expect(Object.getOwnPropertyDescriptor(augmentedObject, 'toString')?.value).toEqual(
				originalObject.toString,
			);
			expect(augmentedObject.toString).toEqual(originalObject.toString);

			augmentedObject.toString = '456';
			expect(augmentedObject.toString).toBe('456');

			delete augmentedObject.toString;
			expect(augmentedObject.toString).toBeUndefined();
		});

		test('should handle constructor property correctly', () => {
			const originalObject: any = {
				a: {
					b: {
						c: {
							d: '4',
						},
					},
				},
			};
			const augmentedObject = augmentObject(originalObject);

			expect(augmentedObject.constructor.name).toEqual('Object');
			expect(augmentedObject.a.constructor.name).toEqual('Object');
			expect(augmentedObject.a.b.constructor.name).toEqual('Object');
			expect(augmentedObject.a.b.c.constructor.name).toEqual('Object');

			augmentedObject.constructor = {};
			expect(augmentedObject.constructor.name).toEqual('Object');

			delete augmentedObject.constructor;
			expect(augmentedObject.constructor.name).toEqual('Object');
		});
	});

	// Invariants targeting specific behavioural seams of the proxy traps.
	// Each test pins down a property that no example-based test currently asserts.
	describe('invariants', () => {
		describe('augment (shared dispatch)', () => {
			test('clones Date values inside arrays so mutations do not bleed into the original', () => {
				const original = new Date(1700000000000);
				const wrapped = augmentArray([original]);
				const fetched = wrapped[0] as Date;

				expect(fetched).not.toBe(original);
				expect(fetched).toBeInstanceOf(Date);
				expect(fetched.valueOf()).toBe(original.valueOf());

				fetched.setFullYear(1990);
				expect(original.getFullYear()).not.toBe(1990);
			});

			test('clones Uint8Array values inside arrays', () => {
				const original = new Uint8Array([1, 2, 3]);
				const wrapped = augmentArray([original]);
				const fetched = wrapped[0] as Uint8Array;

				expect(fetched).not.toBe(original);
				expect(fetched).toBeInstanceOf(Uint8Array);
				expect(Array.from(fetched)).toEqual([1, 2, 3]);

				fetched[0] = 99;
				expect(original[0]).toBe(1);
			});

			test('returns RegExp instances unchanged when nested in arrays', () => {
				const original = /abc/gi;
				const wrapped = augmentArray([original]);
				expect(wrapped[0]).toBe(original);
			});

			test.each([
				['number primitive', 42],
				['string primitive', 'hello'],
				['boolean primitive', true],
				['null', null],
				['undefined', undefined],
			])('returns %s primitives untouched through array proxy', (_label, value) => {
				const wrapped = augmentArray([value]);
				expect(wrapped[0]).toBe(value);
			});
		});

		describe('augmentArray re-entry guard', () => {
			test('returns the same proxy when called twice on an already augmented array', () => {
				const first = augmentArray([1, 2, 3]);
				const second = augmentArray(first);
				expect(second).toBe(first);
			});

			test('returns the same proxy when called on a nested augmented array', () => {
				const wrapped = augmentObject({ list: [1, 2, 3] });
				const list = wrapped.list;
				expect(augmentArray(list)).toBe(list);
			});
		});

		describe('augmentArray constructor short-circuit', () => {
			test('returns Array even when the underlying newData has a custom constructor key', () => {
				const wrapped = augmentArray<unknown>([10, 20]);
				// Force materialisation of newData with a poisoned constructor.
				(wrapped as unknown as { constructor: unknown }).constructor = function Fake() {};
				expect(wrapped.constructor).toBe(Array);
				expect(wrapped.constructor.name).toBe('Array');
			});
		});

		describe('augmentArray getOwnPropertyDescriptor', () => {
			test('delegates to the original target before any mutation has occurred', () => {
				const wrapped = augmentArray([10, 20, 30]);
				const descriptor = Object.getOwnPropertyDescriptor(wrapped, 0);
				expect(descriptor).toEqual({
					value: 10,
					writable: true,
					enumerable: true,
					configurable: true,
				});
				const lengthDescriptor = Object.getOwnPropertyDescriptor(wrapped, 'length');
				expect(lengthDescriptor?.value).toBe(3);
			});

			test('reports the augmented length after push, leaving original intact', () => {
				const original = [1, 2];
				const wrapped = augmentArray(original);
				wrapped.push(3);
				expect(Object.getOwnPropertyDescriptor(wrapped, 'length')?.value).toBe(3);
				expect(Object.getOwnPropertyDescriptor(original, 'length')?.value).toBe(2);
			});

			test('returns the default descriptor shape for indices that exist only on the augmented array', () => {
				const wrapped = augmentArray<number>([1, 2]);
				wrapped.push(3);
				// Index 2 does not exist on the original, so the trap falls through
				// to the frozen default descriptor (enumerable + configurable). The
				// proxy machinery normalizes that into a full descriptor.
				const descriptor = Object.getOwnPropertyDescriptor(wrapped, 2);
				expect(descriptor?.enumerable).toBe(true);
				expect(descriptor?.configurable).toBe(true);
				expect(descriptor?.writable).toBe(false);
				// The descriptor is NOT the index-2 value from the augmented array —
				// proxy normalization sets `value` to undefined when the underlying
				// descriptor lacks one. This is the observable difference between
				// the length-branch and the default-branch.
				expect(descriptor?.value).toBeUndefined();
			});

			test('returns the original descriptor for in-place indices after mutation', () => {
				const wrapped = augmentArray<number>([7, 8]);
				wrapped.push(9);
				const descriptor = Object.getOwnPropertyDescriptor(wrapped, 0);
				expect(descriptor).toEqual({
					value: 7,
					writable: true,
					enumerable: true,
					configurable: true,
				});
			});
		});

		describe('augmentArray mutation traps', () => {
			test('delete removes a slot in the augmented copy without touching the original', () => {
				const original = [1, 2, 3];
				const wrapped = augmentArray(original);
				delete wrapped[1];
				expect(wrapped[1]).toBeUndefined();
				expect(1 in wrapped).toBe(false);
				expect(original).toEqual([1, 2, 3]);
				expect(1 in original).toBe(true);
			});

			test('has reflects mutated state, not the original', () => {
				const wrapped = augmentArray<number>([1, 2]);
				wrapped.push(3);
				expect(2 in wrapped).toBe(true);
				delete wrapped[0];
				expect(0 in wrapped).toBe(false);
			});

			test('ownKeys reflects mutated state, not the original', () => {
				const wrapped = augmentArray<number>([1, 2]);
				wrapped.push(3);
				const keys = Object.keys(wrapped);
				expect(keys).toEqual(['0', '1', '2']);
			});

			test('set augments nested objects so writes do not leak to the original element', () => {
				const inner = { a: 1 };
				const wrapped = augmentArray<{ a: number }>([]);
				wrapped.push(inner);
				const fetched = wrapped[0];
				fetched.a = 999;
				expect(inner.a).toBe(1);
				expect(wrapped[0].a).toBe(999);
			});
		});

		describe('augmentObject re-entry guard', () => {
			test('returns the same proxy when called twice on an already augmented object', () => {
				const first = augmentObject({ a: 1 });
				const second = augmentObject(first);
				expect(second).toBe(first);
			});

			test('returns the same proxy when called on a nested augmented object', () => {
				const wrapped = augmentObject({ inner: { a: 1 } });
				const inner = wrapped.inner;
				expect(augmentObject(inner)).toBe(inner);
			});
		});

		describe('augmentObject get trap', () => {
			test('returns null for null-valued properties without touching the RegExp / toJSON branch', () => {
				const wrapped = augmentObject<{ a: null }>({ a: null });
				expect(wrapped.a).toBeNull();
			});

			test.each([
				['number', 1],
				['string', 'x'],
				['boolean', false],
				['undefined', undefined],
			])('returns %s primitives at the top level directly', (_label, value) => {
				const wrapped = augmentObject<Record<string, unknown>>({ a: value });
				expect(wrapped.a).toBe(value);
			});

			test('serializes nested RegExp values via toString()', () => {
				const wrapped = augmentObject({ nested: { pattern: /abc/gi } });
				expect(wrapped.nested.pattern).toBe('/abc/gi');
			});

			test('returns the result of toJSON for nested objects that define one', () => {
				const wrapped = augmentObject({
					nested: {
						value: 42,
						toJSON() {
							return { serialised: true } as const;
						},
					},
				});
				expect(wrapped.nested).toEqual({ serialised: true });
			});

			test('does not call toJSON when the property is not a function', () => {
				const wrapped = augmentObject<{ nested: Record<string, unknown> }>({
					nested: { toJSON: 'not-a-function' },
				});
				const fetched = wrapped.nested;
				expect(fetched.toJSON).toBe('not-a-function');
			});

			test('augments objects without a toJSON property normally', () => {
				const wrapped = augmentObject<{ nested: { value: number } }>({
					nested: { value: 1 },
				});
				wrapped.nested.value = 2;
				expect(wrapped.nested.value).toBe(2);
			});

			test('caches the augmented child so repeated reads return the same proxy', () => {
				const wrapped = augmentObject({ nested: { value: 1 } });
				const first = wrapped.nested;
				const second = wrapped.nested;
				expect(first).toBe(second);
			});
		});

		describe('augmentObject set/delete/has invariants', () => {
			test('after delete, has returns false and ownKeys excludes the key', () => {
				const wrapped = augmentObject<{ a?: number; b: number }>({ a: 1, b: 2 });
				delete wrapped.a;
				expect('a' in wrapped).toBe(false);
				expect(Object.keys(wrapped)).toEqual(['b']);
			});

			test('after set to undefined, has returns false (originals tracked as deleted)', () => {
				const wrapped = augmentObject<{ a: number | undefined }>({ a: 1 });
				wrapped.a = undefined;
				expect('a' in wrapped).toBe(false);
				expect(Object.keys(wrapped)).toEqual([]);
			});

			test('setting after delete restores the key in has and ownKeys', () => {
				const wrapped = augmentObject<{ a?: number }>({ a: 1 });
				delete wrapped.a;
				wrapped.a = 9;
				expect('a' in wrapped).toBe(true);
				expect(wrapped.a).toBe(9);
				expect(Object.keys(wrapped)).toContain('a');
			});

			test('setting after set-to-undefined restores the key', () => {
				const wrapped = augmentObject<{ a: number | undefined }>({ a: 1 });
				wrapped.a = undefined;
				expect('a' in wrapped).toBe(false);
				wrapped.a = 7;
				expect('a' in wrapped).toBe(true);
				expect(wrapped.a).toBe(7);
			});

			test('delete on a never-set key still marks has() as false and leaves original untouched', () => {
				const original: { a: number; b?: number } = { a: 1 };
				const wrapped = augmentObject(original);
				wrapped.b = 2;
				delete wrapped.b;
				expect('b' in wrapped).toBe(false);
				expect('b' in original).toBe(false);
				expect(wrapped.b).toBeUndefined();
			});

			test('setting a brand new key reports it in has, ownKeys and getOwnPropertyDescriptor', () => {
				const wrapped = augmentObject<Record<string, number>>({});
				wrapped.fresh = 5;
				expect('fresh' in wrapped).toBe(true);
				expect(Object.keys(wrapped)).toEqual(['fresh']);
				expect(Object.getOwnPropertyDescriptor(wrapped, 'fresh')?.value).toBe(5);
			});

			test('after delete, getOwnPropertyDescriptor returns undefined for the deleted key', () => {
				const wrapped = augmentObject<{ a?: number }>({ a: 1 });
				delete wrapped.a;
				expect(Object.getOwnPropertyDescriptor(wrapped, 'a')).toBeUndefined();
			});

			test('ownKeys merges original and newly added keys without duplicates', () => {
				const wrapped = augmentObject<Record<string, number>>({ a: 1, b: 2 });
				wrapped.c = 3;
				wrapped.a = 11; // overwrite — still 'a' once
				expect(Object.keys(wrapped).sort()).toEqual(['a', 'b', 'c']);
			});

			test('originals are never mutated by any sequence of operations', () => {
				const original: { a: number; b?: { c: number } } = { a: 1, b: { c: 2 } };
				const wrapped = augmentObject(original);
				wrapped.a = 99;
				wrapped.b!.c = 88;
				delete wrapped.b;
				wrapped.b = { c: 7 };
				expect(original).toEqual({ a: 1, b: { c: 2 } });
			});

			test('setting a previously-added key to undefined clears it (newData purge)', () => {
				const wrapped = augmentObject<Record<string, number | undefined>>({});
				wrapped.foo = 5;
				wrapped.foo = undefined;
				expect(wrapped.foo).toBeUndefined();
				expect('foo' in wrapped).toBe(false);
				expect(Object.keys(wrapped)).toEqual([]);
			});

			test('Reflect.ownKeys filters out deleted original keys', () => {
				const wrapped = augmentObject<{ a?: number; b: number }>({ a: 1, b: 2 });
				delete wrapped.a;
				// Object.keys filters via getOwnPropertyDescriptor too, so it would
				// hide the deleted key even without ownKeys filtering. Reflect.ownKeys
				// surfaces the raw trap result, which is what pins down the filter.
				expect(Reflect.ownKeys(wrapped)).toEqual(['b']);
			});

			test('Reflect.ownKeys excludes original keys cleared via set-to-undefined', () => {
				const wrapped = augmentObject<{ a: number | undefined; b: number }>({
					a: 1,
					b: 2,
				});
				wrapped.a = undefined;
				expect(Reflect.ownKeys(wrapped)).toEqual(['b']);
			});
		});
	});
});
