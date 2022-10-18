import { deepCopy } from './utils';

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
});
