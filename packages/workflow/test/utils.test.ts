import { jsonParse, deepCopy } from '../src/utils';

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

describe('deepCopy', () => {
	it('should deep copy an object', () => {
		const object = {
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
			date: new Date(),
			undef: undefined,
			nil: null,
			bool: true,
			num: 1,
		};
		const copy = deepCopy(object);
		expect(copy).toEqual(object);
		expect(copy).not.toBe(object);
		expect(copy.arr).toEqual(object.arr);
		expect(copy.arr).not.toBe(object.arr);
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
			date: new Date(),
			undef: undefined,
			nil: null,
			bool: true,
			num: 1,
		};

		object.circular = object;
		object.deep.props.circular = object;
		object.deep.arr.push(object)

		const copy = deepCopy(object);
		expect(copy).toEqual(object);
		expect(copy).not.toBe(object);
		expect(copy.arr).toEqual(object.arr);
		expect(copy.arr).not.toBe(object.arr);
		expect(copy.deep.props).toEqual(object.deep.props);
		expect(copy.deep.props).not.toBe(object.deep.props);
	});
});
