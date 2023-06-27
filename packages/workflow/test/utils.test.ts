import { jsonParse, jsonStringify, deepCopy, isObjectEmpty } from '@/utils';

describe('isObjectEmpty', () => {
	it('should handle null and undefined', () => {
		expect(isObjectEmpty(null)).toEqual(true);
		expect(isObjectEmpty(undefined)).toEqual(true);
	});

	it('should handle arrays', () => {
		expect(isObjectEmpty([])).toEqual(true);
		expect(isObjectEmpty([1, 2, 3])).toEqual(false);
	});

	it('should handle Set and Map', () => {
		expect(isObjectEmpty(new Set())).toEqual(true);
		expect(isObjectEmpty(new Set([1, 2, 3]))).toEqual(false);

		expect(isObjectEmpty(new Map())).toEqual(true);
		expect(
			isObjectEmpty(
				new Map([
					['a', 1],
					['b', 2],
				]),
			),
		).toEqual(false);
	});

	it('should handle Buffer, ArrayBuffer, and Uint8Array', () => {
		expect(isObjectEmpty(Buffer.from(''))).toEqual(true);
		expect(isObjectEmpty(Buffer.from('abcd'))).toEqual(false);

		expect(isObjectEmpty(Uint8Array.from([]))).toEqual(true);
		expect(isObjectEmpty(Uint8Array.from([1, 2, 3]))).toEqual(false);

		expect(isObjectEmpty(new ArrayBuffer(0))).toEqual(true);
		expect(isObjectEmpty(new ArrayBuffer(1))).toEqual(false);
	});

	it('should handle plain objects', () => {
		expect(isObjectEmpty({})).toEqual(true);
		expect(isObjectEmpty({ a: 1, b: 2 })).toEqual(false);
	});

	it('should handle instantiated classes', () => {
		expect(isObjectEmpty(new (class Test {})())).toEqual(true);
		expect(
			isObjectEmpty(
				new (class Test {
					prop = 123;
				})(),
			),
		).toEqual(false);
	});

	it('should not call Object.keys unless a plain object', () => {
		const keySpy = jest.spyOn(Object, 'keys');
		const { calls } = keySpy.mock;

		const assertCalls = (count: number) => {
			if (calls.length !== count) throw new Error(`Object.keys was called ${calls.length} times`);
		};

		assertCalls(0);
		isObjectEmpty(null);
		assertCalls(0);
		isObjectEmpty([1, 2, 3]);
		assertCalls(0);
		isObjectEmpty(Buffer.from('123'));
		assertCalls(0);
		isObjectEmpty({});
		assertCalls(1);
	});
});

describe('jsonParse', () => {
	it('parses JSON', () => {
		expect(jsonParse('[1, 2, 3]')).toEqual([1, 2, 3]);
		expect(jsonParse('{ "a": 1 }')).toEqual({ a: 1 });
	});

	it('optionally throws `errorMessage', () => {
		expect(() => {
			jsonParse('', { errorMessage: 'Invalid JSON' });
		}).toThrow('Invalid JSON');
	});

	it('optionally returns a `fallbackValue`', () => {
		expect(jsonParse('', { fallbackValue: { foo: 'bar' } })).toEqual({ foo: 'bar' });
	});
});

describe('jsonStringify', () => {
	const source: any = { a: 1, b: 2, d: new Date(1680089084200), r: new RegExp('^test$', 'ig') };
	source.c = source;

	it('should throw errors on circular references by default', () => {
		expect(() => jsonStringify(source)).toThrow('Converting circular structure to JSON');
	});

	it('should break circular references when requested', () => {
		expect(jsonStringify(source, { replaceCircularRefs: true })).toEqual(
			'{"a":1,"b":2,"d":"2023-03-29T11:24:44.200Z","r":{},"c":"[Circular Reference]"}',
		);
	});

	it('should not detect duplicates as circular references', () => {
		const y = { z: 5 };
		const x = [y, y, { y }];
		expect(jsonStringify(x, { replaceCircularRefs: true })).toEqual(
			'[{"z":5},{"z":5},{"y":{"z":5}}]',
		);
	});
});

describe('deepCopy', () => {
	it('should deep copy an object', () => {
		const serializable = {
			x: 1,
			y: 2,
			toJSON: () => 'x:1,y:2',
		};
		const object = {
			deep: {
				props: {
					list: [{ a: 1 }, { b: 2 }, { c: 3 }],
				},
				arr: [1, 2, 3],
			},
			serializable,
			arr: [
				{
					prop: {
						list: ['a', 'b', 'c'],
					},
				},
			],
			func: () => {},
			date: new Date(1667389172201),
			undef: undefined,
			nil: null,
			bool: true,
			num: 1,
		};
		const copy = deepCopy(object);
		expect(copy).not.toBe(object);
		expect(copy.arr).toEqual(object.arr);
		expect(copy.arr).not.toBe(object.arr);
		expect(copy.date).toBe('2022-11-02T11:39:32.201Z');
		expect(copy.serializable).toBe(serializable.toJSON());
		expect(copy.deep.props).toEqual(object.deep.props);
		expect(copy.deep.props).not.toBe(object.deep.props);
	});

	it('should avoid max call stack in case of circular deps', () => {
		const object: Record<string, any> = {
			deep: {
				props: {
					list: [{ a: 1 }, { b: 2 }, { c: 3 }],
				},
				arr: [1, 2, 3],
			},
			arr: [
				{
					prop: {
						list: ['a', 'b', 'c'],
					},
				},
			],
			func: () => {},
			date: new Date(1667389172201),
			undef: undefined,
			nil: null,
			bool: true,
			num: 1,
		};

		object.circular = object;
		object.deep.props.circular = object;
		object.deep.arr.push(object);

		const copy = deepCopy(object);
		expect(copy).not.toBe(object);
		expect(copy.arr).toEqual(object.arr);
		expect(copy.arr).not.toBe(object.arr);
		expect(copy.date).toBe('2022-11-02T11:39:32.201Z');
		expect(copy.deep.props.circular).toBe(copy);
		expect(copy.deep.props.circular).not.toBe(object);
		expect(copy.deep.arr.slice(-1)[0]).toBe(copy);
		expect(copy.deep.arr.slice(-1)[0]).not.toBe(object);
	});
});
