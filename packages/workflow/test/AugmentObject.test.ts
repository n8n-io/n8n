import type { IDataObject } from '@/Interfaces';
import { augmentObject } from '@/AugmentObject';
import { deepCopy } from '@/utils';

describe('AugmentObject', () => {
	describe('augmentObject', () => {
		test('should work with simple values on first level', () => {
			const originalObject: IDataObject = {
				1: 11,
				2: '22',
				a: 111,
				b: '222',
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

			expect(originalObject).toEqual(copyOriginal);

			expect(augmentedObject).toEqual({
				1: 911,
				2: '922',
				a: 9111,
				b: '9222',
				c: 3,
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

			// @ts-ignore
			augmentedObject.a!.bb = '92';
			expect(originalObject.a.bb).toEqual('2');
			// @ts-ignore
			expect(augmentedObject.a!.bb!).toEqual('92');

			// @ts-ignore
			augmentedObject.a!.b!.cc = '93';
			expect(originalObject.a.b.cc).toEqual('3');
			// @ts-ignore
			expect(augmentedObject.a!.b!.cc).toEqual('93');
			// expect(augmentedObject[1]).toEqual(911);

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
				augmentedObject.a.b.c.d.e.f++;
			}
			const timeAugmented = new Date().getTime() - startTime;

			for (let i = 0; i < iterations; i++) {
				const copiedObject = deepCopy(originalObject);
				copiedObject.a.b.c.d.e.f++;
			}
			const timeCopied = new Date().getTime() - startTime;

			console.log('timeAugmented', timeAugmented);
			console.log('timeCopied', timeCopied);

			expect(timeAugmented).toBeLessThan(timeCopied);
		});
	});
});
