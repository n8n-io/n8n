import type { IDataObject } from '@/Interfaces';
import { augmentArray, augmentObject } from '@/AugmentObject';
import { deepCopy } from '@/utils';

describe('AugmentObject', () => {
	describe('augmentArray', () => {
		test('should work with arrays', () => {
			const originalObject = [1, 2, 3, 4, null];
			const copyOriginal = JSON.parse(JSON.stringify(originalObject));

			const augmentedObject = augmentArray(originalObject);

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
			const copyOriginal = JSON.parse(JSON.stringify(originalObject));

			const augmentedObject = augmentObject(originalObject);

			// On first level
			augmentedObject.aa[0].a3.b3 = '22';
			expect(augmentedObject.aa[0].a3.b3).toEqual('22');
			expect(originalObject.aa[0].a3.b3).toEqual('2');

			// Make sure that also array operations as push and length work as expected
			// On lower levels
			augmentedObject.a.b.c[0].a3!.b3.c3 = '033';
			expect(augmentedObject.a.b.c[0].a3!.b3.c3).toEqual('033');
			expect(originalObject.a.b.c[0].a3!.b3.c3).toEqual('03');

			augmentedObject.a.b.c[1].a3!.b3.c3 = '133';
			expect(augmentedObject.a.b.c[1].a3!.b3.c3).toEqual('133');
			expect(originalObject.a.b.c[1].a3!.b3.c3).toEqual('13');

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
			const copyOriginal = JSON.parse(JSON.stringify(originalObject));

			const augmentedObject = augmentObject(originalObject);

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
				d: date,
				r: regexp,
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
			const copyOriginal = JSON.parse(JSON.stringify(originalObject));

			const augmentedObject = augmentObject(originalObject);

			augmentedObject.a.bb = '92';
			expect(originalObject.a.bb).toEqual('2');
			expect(augmentedObject.a!.bb!).toEqual('92');

			augmentedObject.a!.b!.cc = '93';
			expect(originalObject.a.b.cc).toEqual('3');
			expect(augmentedObject.a!.b!.cc).toEqual('93');

			// @ts-ignore
			augmentedObject.a!.b!.ccc = {
				d: '4',
			};

			// @ts-ignore
			expect(augmentedObject.a!.b!.ccc).toEqual({ d: '4' });

			// @ts-ignore
			augmentedObject.a!.b!.ccc.d = '94';
			// @ts-ignore
			expect(augmentedObject.a!.b!.ccc.d).toEqual('94');

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
			const originalObject = {
				a: {
					b: {
						cc: '3',
						c2: null,
					},
					bb: '2',
				},
				aa: '1',
			};
			const copyOriginal = JSON.parse(JSON.stringify(originalObject));

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
			const copyOriginal = JSON.parse(JSON.stringify(originalObject));

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
			const copyOriginal = JSON.parse(JSON.stringify(originalObject));

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

		test('should be faster than doing a deepCopy', () => {
			const iterations = 100;
			const originalObject: IDataObject = {
				a: {
					b: {
						c: {
							d: {
								e: {
									f: 12345,
								},
							},
						},
					},
				},
			};
			for (let i = 0; i < 10; i++) {
				originalObject[i.toString()] = deepCopy(originalObject);
			}

			let startTime = new Date().getTime();
			for (let i = 0; i < iterations; i++) {
				const augmentedObject = augmentObject(originalObject);
				for (let i = 0; i < 5000; i++) {
					augmentedObject.a!.b.c.d.e.f++;
				}
			}
			const timeAugmented = new Date().getTime() - startTime;

			startTime = new Date().getTime();
			for (let i = 0; i < iterations; i++) {
				const copiedObject = deepCopy(originalObject);
				for (let i = 0; i < 5000; i++) {
					copiedObject.a!.b.c.d.e.f++;
				}
			}
			const timeCopied = new Date().getTime() - startTime;

			expect(timeAugmented).toBeLessThan(timeCopied);
		});
	});
});
