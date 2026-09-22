import { defineField } from '../../src/extensions/utils';

describe('defineField', () => {
	it('should add an own data field instead of calling an inherited setter', () => {
		const setter = vi.fn();
		const target = Object.create({
			set test(value: unknown) {
				setter(value);
			},
		}) as Record<string, unknown>;

		defineField(target, 'test', 1);

		expect(setter).not.toHaveBeenCalled();
		expect(Object.getOwnPropertyDescriptor(target, 'test')).toEqual({
			value: 1,
			writable: true,
			enumerable: true,
			configurable: true,
		});
	});
});
