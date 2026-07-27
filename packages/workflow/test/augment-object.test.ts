import fc from 'fast-check';

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

	// Property-based invariants targeting the behavioural seams of the proxy
	// traps. fast-check generates the random inputs; the assertions pin down
	// the invariant each branch is supposed to preserve.
	describe('invariants (fast-check)', () => {
		// Primitive value generator — exercises the `typeof !== 'object' || null`
		// fast-paths in both `augment` and the object `get` trap. NaN excluded
		// because `Object.is` checks below would fail spuriously.
		const arbPrimitive = fc.oneof(
			fc.integer(),
			fc.double({ noNaN: true }),
			fc.string(),
			fc.boolean(),
			fc.constant(null),
			fc.constant(undefined),
		);

		// Object/array keys. Excludes the proxy-special keys that would short-
		// circuit the trap and reserved property names that would clobber
		// inherited slots in unrelated ways.
		const arbKey = fc
			.string({ minLength: 1, maxLength: 6 })
			.filter((k) => k !== 'constructor' && k !== '__proto__' && k !== 'toJSON');

		// Plain (toJSON-free, RegExp-free, Date-free) JSON-ish values, suitable
		// for use as set-trap inputs where we want identity to hold or where we
		// want to assert non-mutation of the original.
		const arbJsonScalar = fc.oneof(fc.integer(), fc.string(), fc.boolean(), fc.constant(null));

		describe('augment dispatch — value-type fast paths', () => {
			it('returns primitives untouched through the array proxy', () => {
				fc.assert(
					fc.property(arbPrimitive, (value) => {
						const wrapped = augmentArray([value]);
						expect(Object.is(wrapped[0], value)).toBe(true);
					}),
				);
			});

			it('returns RegExp instances by reference when nested in arrays', () => {
				fc.assert(
					fc.property(
						fc.constantFrom('abc', '[a-z]+', '\\d+', 'x.y'),
						fc.constantFrom('', 'g', 'i', 'gi', 'gim'),
						(pattern, flags) => {
							const regex = new RegExp(pattern, flags);
							const wrapped = augmentArray([regex]);
							expect(wrapped[0]).toBe(regex);
						},
					),
				);
			});

			it('clones Date values inside arrays so mutations cannot bleed into the original', () => {
				fc.assert(
					fc.property(
						// Avoid 1990 — we mutate to that year and need a strict inequality.
						fc.integer({ min: 0, max: 2_000_000_000_000 }),
						(epoch) => {
							const original = new Date(epoch);
							const originalYear = original.getFullYear();
							fc.pre(originalYear !== 1990);

							const wrapped = augmentArray([original]);
							const fetched = wrapped[0] as Date;

							expect(fetched).not.toBe(original);
							expect(fetched).toBeInstanceOf(Date);
							expect(fetched.valueOf()).toBe(original.valueOf());

							fetched.setFullYear(1990);
							expect(original.getFullYear()).toBe(originalYear);
						},
					),
				);
			});

			it('clones Uint8Array values inside arrays', () => {
				fc.assert(
					fc.property(fc.uint8Array({ minLength: 1, maxLength: 16 }), (bytes) => {
						const snapshot = Array.from(bytes);
						const wrapped = augmentArray([bytes]);
						const fetched = wrapped[0] as Uint8Array;

						expect(fetched).not.toBe(bytes);
						expect(fetched).toBeInstanceOf(Uint8Array);
						expect(Array.from(fetched)).toEqual(snapshot);

						fetched[0] = (fetched[0] + 1) & 0xff;
						expect(Array.from(bytes)).toEqual(snapshot);
					}),
				);
			});
		});

		describe('augmentArray', () => {
			it('re-entry guard — augmenting an already-augmented array returns the same proxy', () => {
				fc.assert(
					fc.property(fc.array(fc.integer(), { maxLength: 10 }), (xs) => {
						const first = augmentArray([...xs]);
						expect(augmentArray(first)).toBe(first);
					}),
				);
			});

			it('re-entry guard holds via a nested object proxy', () => {
				fc.assert(
					fc.property(fc.array(fc.integer(), { maxLength: 5 }), (xs) => {
						const wrapped = augmentObject({ list: [...xs] });
						const list = wrapped.list;
						expect(augmentArray(list)).toBe(list);
					}),
				);
			});

			it('constructor short-circuit — always returns Array even when newData has a poisoned constructor', () => {
				fc.assert(
					fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 5 }), (xs) => {
						const wrapped = augmentArray<unknown>([...xs]);
						(wrapped as unknown as { constructor: unknown }).constructor = function Fake() {};
						expect(wrapped.constructor).toBe(Array);
						expect(wrapped.constructor.name).toBe('Array');
					}),
				);
			});

			it('getOwnPropertyDescriptor pre-mutation delegates to the original target', () => {
				fc.assert(
					fc.property(
						fc.array(fc.integer(), { minLength: 1, maxLength: 8 }),
						fc.nat({ max: 7 }),
						(xs, rawIdx) => {
							fc.pre(xs.length > 0);
							const idx = rawIdx % xs.length;
							const wrapped = augmentArray([...xs]);
							expect(Object.getOwnPropertyDescriptor(wrapped, idx)).toEqual({
								value: xs[idx],
								writable: true,
								enumerable: true,
								configurable: true,
							});
							expect(Object.getOwnPropertyDescriptor(wrapped, 'length')?.value).toBe(xs.length);
						},
					),
				);
			});

			it('getOwnPropertyDescriptor post-push reports new length, leaves original intact', () => {
				fc.assert(
					fc.property(fc.array(fc.integer(), { maxLength: 8 }), fc.integer(), (xs, extra) => {
						const original = [...xs];
						const wrapped = augmentArray(original);
						wrapped.push(extra);
						expect(Object.getOwnPropertyDescriptor(wrapped, 'length')?.value).toBe(xs.length + 1);
						expect(Object.getOwnPropertyDescriptor(original, 'length')?.value).toBe(xs.length);
					}),
				);
			});

			it('getOwnPropertyDescriptor for pushed-only indices returns the default-branch shape', () => {
				fc.assert(
					fc.property(fc.array(fc.integer(), { maxLength: 5 }), fc.integer(), (xs, extra) => {
						const wrapped = augmentArray<number>([...xs]);
						wrapped.push(extra);
						const descriptor = Object.getOwnPropertyDescriptor(wrapped, xs.length);
						// Pushed-only index → default frozen descriptor (no `value`,
						// `writable: false`). Proxy machinery normalises the missing
						// value to `undefined`. This branch is observably distinct from
						// the original-index branch (writable: true) above.
						expect(descriptor?.enumerable).toBe(true);
						expect(descriptor?.configurable).toBe(true);
						expect(descriptor?.writable).toBe(false);
						expect(descriptor?.value).toBeUndefined();
					}),
				);
			});

			it('mutation traps — delete, has and ownKeys reflect the augmented state', () => {
				fc.assert(
					fc.property(
						fc.array(fc.integer(), { minLength: 1, maxLength: 6 }),
						fc.integer(),
						fc.nat({ max: 5 }),
						(xs, extra, rawIdx) => {
							const original = [...xs];
							const wrapped = augmentArray(original);
							wrapped.push(extra);

							const pushedIdx = xs.length;
							expect(pushedIdx in wrapped).toBe(true);
							expect(Object.keys(wrapped)).toContain(String(pushedIdx));

							const idx = rawIdx % xs.length;
							delete wrapped[idx];
							expect(idx in wrapped).toBe(false);
							expect(wrapped[idx]).toBeUndefined();

							// Original is left untouched by every mutation above.
							expect(original).toEqual(xs);
						},
					),
				);
			});

			it('set on nested objects augments them so writes do not leak to the original element', () => {
				fc.assert(
					fc.property(fc.integer(), fc.integer(), (initial, overwrite) => {
						const inner = { a: initial };
						const wrapped = augmentArray<{ a: number }>([]);
						wrapped.push(inner);
						const fetched = wrapped[0];
						fetched.a = overwrite;
						expect(inner.a).toBe(initial);
						expect(wrapped[0].a).toBe(overwrite);
					}),
				);
			});
		});

		describe('augmentObject', () => {
			it('re-entry guard — augmenting an already-augmented object returns the same proxy', () => {
				fc.assert(
					fc.property(fc.dictionary(arbKey, fc.integer(), { maxKeys: 5 }), (obj) => {
						const first = augmentObject({ ...obj });
						expect(augmentObject(first)).toBe(first);
					}),
				);
			});

			it('re-entry guard holds via a nested child proxy', () => {
				fc.assert(
					fc.property(fc.dictionary(arbKey, fc.integer(), { maxKeys: 5 }), (obj) => {
						const wrapped = augmentObject({ inner: { ...obj } });
						const inner = wrapped.inner;
						expect(augmentObject(inner)).toBe(inner);
					}),
				);
			});

			it('constructor short-circuit — always returns Object', () => {
				fc.assert(
					fc.property(fc.dictionary(arbKey, fc.integer(), { maxKeys: 4 }), (obj) => {
						const wrapped = augmentObject({ ...obj });
						// Poison the constructor slot via a typed cast so the next read
						// MUST hit the `key === 'constructor'` short-circuit branch.
						(wrapped as unknown as { constructor: unknown }).constructor = function Fake() {};
						expect(wrapped.constructor).toBe(Object);
						expect(wrapped.constructor.name).toBe('Object');
					}),
				);
			});

			it('returns top-level primitives untouched', () => {
				fc.assert(
					fc.property(arbKey, arbPrimitive, (key, value) => {
						const wrapped = augmentObject<Record<string, unknown>>({ [key]: value });
						expect(Object.is(wrapped[key], value)).toBe(true);
					}),
				);
			});

			it('returns null directly without falling into the RegExp / toJSON branches', () => {
				fc.assert(
					fc.property(arbKey, (key) => {
						const wrapped = augmentObject<Record<string, null>>({ [key]: null });
						expect(wrapped[key]).toBeNull();
					}),
				);
			});

			it('serializes nested RegExp values via toString()', () => {
				fc.assert(
					fc.property(
						fc.constantFrom('abc', '[a-z]+', '\\d+', 'x.y'),
						fc.constantFrom('', 'g', 'i', 'gi', 'gim'),
						(pattern, flags) => {
							const regex = new RegExp(pattern, flags);
							const wrapped = augmentObject({ nested: { pattern: regex } });
							expect(wrapped.nested.pattern).toBe(regex.toString());
						},
					),
				);
			});

			it('invokes toJSON when it is a function, returning its result', () => {
				fc.assert(
					fc.property(arbJsonScalar, (sentinel) => {
						const wrapped = augmentObject({
							nested: {
								value: 42,
								toJSON: () => sentinel,
							},
						});
						expect(wrapped.nested).toBe(sentinel);
					}),
				);
			});

			it('does not call toJSON when the property is not a function', () => {
				fc.assert(
					fc.property(
						arbJsonScalar.filter((v) => typeof v !== 'function'),
						(notFunc) => {
							const wrapped = augmentObject<{ nested: Record<string, unknown> }>({
								nested: { toJSON: notFunc },
							});
							const fetched = wrapped.nested;
							expect(fetched.toJSON).toBe(notFunc);
						},
					),
				);
			});

			it('caches the augmented child so repeated reads return the same proxy', () => {
				fc.assert(
					fc.property(fc.dictionary(arbKey, fc.integer(), { maxKeys: 4 }), (obj) => {
						const wrapped = augmentObject({ nested: { ...obj } });
						const first = wrapped.nested;
						const second = wrapped.nested;
						expect(first).toBe(second);
					}),
				);
			});

			it('round-trips a fresh primitive set: after wrapped[k] = v, get/has/ownKeys/descriptor all agree', () => {
				fc.assert(
					fc.property(
						arbKey,
						arbJsonScalar.filter((v) => v !== null),
						(key, value) => {
							const wrapped = augmentObject<Record<string, unknown>>({});
							wrapped[key] = value;
							expect(Object.is(wrapped[key], value)).toBe(true);
							expect(key in wrapped).toBe(true);
							expect(Object.keys(wrapped)).toContain(key);
							expect(Object.getOwnPropertyDescriptor(wrapped, key)?.value).toBe(value);
						},
					),
				);
			});

			it('delete makes the key invisible through every read trap', () => {
				fc.assert(
					fc.property(fc.dictionary(arbKey, fc.integer(), { minKeys: 1, maxKeys: 5 }), (obj) => {
						const keys = Object.keys(obj);
						const target = keys[0];
						const wrapped = augmentObject({ ...obj } as Record<string, number>);
						delete wrapped[target];
						expect(target in wrapped).toBe(false);
						expect(wrapped[target]).toBeUndefined();
						expect(Object.keys(wrapped)).not.toContain(target);
						expect(Reflect.ownKeys(wrapped)).not.toContain(target);
						expect(Object.getOwnPropertyDescriptor(wrapped, target)).toBeUndefined();
					}),
				);
			});

			it('set-to-undefined is observationally equivalent to delete (visibility-wise)', () => {
				fc.assert(
					fc.property(fc.dictionary(arbKey, fc.integer(), { minKeys: 1, maxKeys: 5 }), (obj) => {
						const keys = Object.keys(obj);
						const target = keys[0];
						const deleted = augmentObject({ ...obj } as Record<string, number | undefined>);
						const undef = augmentObject({ ...obj } as Record<string, number | undefined>);
						delete deleted[target];
						undef[target] = undefined;
						expect(target in deleted).toBe(target in undef);
						expect(Object.keys(deleted).sort()).toEqual(Object.keys(undef).sort());
						expect(Reflect.ownKeys(deleted).sort()).toEqual(Reflect.ownKeys(undef).sort());
					}),
				);
			});

			// The delete trap purges newData[key] when the key was previously set
			// (so the next get does not fall through to the cached value). Pin
			// that explicitly — the deletedProperties check alone would not catch
			// it, because a brand-new key never gets tracked as deleted.
			it('delete after set on a brand-new key purges the cached newData value', () => {
				fc.assert(
					fc.property(arbKey, fc.integer(), (key, value) => {
						const wrapped = augmentObject<Record<string, unknown>>({});
						wrapped[key] = value;
						delete wrapped[key];
						expect(wrapped[key]).toBeUndefined();
						expect(key in wrapped).toBe(false);
						expect(Object.keys(wrapped)).not.toContain(key);
						expect(Object.getOwnPropertyDescriptor(wrapped, key)).toBeUndefined();
					}),
				);
			});

			// Symmetric to the above for the set-to-undefined branch.
			it('set-to-undefined after set on a brand-new key purges the cached newData value', () => {
				fc.assert(
					fc.property(arbKey, fc.integer(), (key, value) => {
						const wrapped = augmentObject<Record<string, unknown>>({});
						wrapped[key] = value;
						wrapped[key] = undefined;
						expect(wrapped[key]).toBeUndefined();
						expect(key in wrapped).toBe(false);
						expect(Object.keys(wrapped)).not.toContain(key);
						expect(Object.getOwnPropertyDescriptor(wrapped, key)).toBeUndefined();
					}),
				);
			});

			it('re-setting a deleted key restores visibility through every trap', () => {
				fc.assert(
					fc.property(
						arbKey,
						fc.integer(),
						arbJsonScalar.filter((v) => v !== null && v !== undefined),
						(key, original, replacement) => {
							const wrapped = augmentObject<Record<string, unknown>>({ [key]: original });
							delete wrapped[key];
							wrapped[key] = replacement;
							expect(key in wrapped).toBe(true);
							expect(Object.is(wrapped[key], replacement)).toBe(true);
							expect(Reflect.ownKeys(wrapped)).toContain(key);
						},
					),
				);
			});

			it('re-setting a key cleared via set-to-undefined restores visibility', () => {
				fc.assert(
					fc.property(
						arbKey,
						fc.integer(),
						arbJsonScalar.filter((v) => v !== null && v !== undefined),
						(key, original, replacement) => {
							const wrapped = augmentObject<Record<string, unknown>>({ [key]: original });
							wrapped[key] = undefined;
							expect(key in wrapped).toBe(false);
							wrapped[key] = replacement;
							expect(key in wrapped).toBe(true);
							expect(Object.is(wrapped[key], replacement)).toBe(true);
						},
					),
				);
			});

			it('ownKeys never duplicates entries across original and new keys', () => {
				fc.assert(
					fc.property(
						fc.dictionary(arbKey, fc.integer(), { maxKeys: 5 }),
						fc.dictionary(arbKey, fc.integer(), { maxKeys: 5 }),
						(original, additions) => {
							const wrapped = augmentObject({ ...original } as Record<string, number>);
							for (const [k, v] of Object.entries(additions)) wrapped[k] = v;
							const keys = Reflect.ownKeys(wrapped);
							expect(new Set(keys).size).toBe(keys.length);
						},
					),
				);
			});
		});

		// Model-based stateful test: drives a random sequence of set / delete /
		// set-undefined operations and asserts the invariants every operation
		// MUST preserve, including (a) original immutability and (b) read-trap
		// consistency (has ⇔ ownKeys ⇔ getOwnPropertyDescriptor ⇔ get).
		describe('stateful invariants', () => {
			const arbOp = fc.oneof(
				fc.record({ kind: fc.constant('set' as const), key: arbKey, value: fc.integer() }),
				fc.record({ kind: fc.constant('delete' as const), key: arbKey }),
				fc.record({ kind: fc.constant('setUndefined' as const), key: arbKey }),
			);

			it('arbitrary op sequences never mutate the original and keep read traps consistent', () => {
				fc.assert(
					fc.property(
						fc.dictionary(arbKey, fc.integer(), { maxKeys: 4 }),
						fc.array(arbOp, { maxLength: 20 }),
						(initial, ops) => {
							const original = { ...initial };
							const snapshot = JSON.parse(JSON.stringify(original)) as Record<string, number>;
							const wrapped = augmentObject(original as Record<string, number | undefined>);

							for (const op of ops) {
								if (op.kind === 'set') wrapped[op.key] = op.value;
								else if (op.kind === 'delete') delete wrapped[op.key];
								else wrapped[op.key] = undefined;
							}

							// Invariant 1: the original is structurally untouched.
							expect(original).toEqual(snapshot);

							// Invariant 2: read traps agree pairwise on every key the
							// universe might mention.
							const reflectKeys = Reflect.ownKeys(wrapped);
							const objectKeys = Object.keys(wrapped);
							expect(new Set(objectKeys)).toEqual(new Set(reflectKeys.map(String)));

							const universe = new Set<string>([
								...Object.keys(snapshot),
								...ops.map((o) => o.key),
							]);
							for (const key of universe) {
								const present = key in wrapped;
								const inOwnKeys = reflectKeys.includes(key);
								const descriptor = Object.getOwnPropertyDescriptor(wrapped, key);
								expect(present).toBe(inOwnKeys);
								expect(present).toBe(descriptor !== undefined);
								if (!present) expect(wrapped[key]).toBeUndefined();
							}
						},
					),
				);
			});
		});
	});
});
