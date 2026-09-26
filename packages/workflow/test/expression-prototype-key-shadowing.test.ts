import { evaluate } from './ExpressionExtensions/helpers';

describe('data keys that collide with Object.prototype members', () => {
	const item = {
		key: 'toString',
		toString: 'my-to-string-value',
		valueOf: 'my-value-of-value',
		hasOwnProperty: 'my-has-own-value',
		isPrototypeOf: 'my-is-proto-value',
		propertyIsEnumerable: 'my-prop-enum-value',
		toLocaleString: 'my-locale-value',
		normal: 'ok',
	};

	test('dot access returns the item data, not the prototype method', () => {
		expect(evaluate('={{ $json.normal }}', [item])).toBe('ok');
		expect(evaluate('={{ $json.toString }}', [item])).toBe('my-to-string-value');
		expect(evaluate('={{ $json.valueOf }}', [item])).toBe('my-value-of-value');
		expect(evaluate('={{ $json.hasOwnProperty }}', [item])).toBe('my-has-own-value');
		expect(evaluate('={{ $json.isPrototypeOf }}', [item])).toBe('my-is-proto-value');
		expect(evaluate('={{ $json.propertyIsEnumerable }}', [item])).toBe('my-prop-enum-value');
		expect(evaluate('={{ $json.toLocaleString }}', [item])).toBe('my-locale-value');
	});

	test('bracket access behaves the same as dot access', () => {
		expect(evaluate("={{ $json['toString'] }}", [item])).toBe('my-to-string-value');
		expect(evaluate("={{ $json['hasOwnProperty'] }}", [item])).toBe('my-has-own-value');
	});

	test('computed keys resolve to the item data', () => {
		expect(evaluate('={{ $json[$json.key] }}', [item])).toBe('my-to-string-value');
		expect(evaluate("={{ $json['to' + 'String'] }}", [item])).toBe('my-to-string-value');
	});

	test('nested objects behave the same', () => {
		const nested = { row: { toString: 'nested-value', a: 1 } };
		expect(evaluate('={{ $json.row.toString }}', [nested])).toBe('nested-value');
		expect(evaluate("={{ $json.row['toString'] }}", [nested])).toBe('nested-value');
	});

	test('prototype members still resolve when the data has no such key', () => {
		expect(evaluate('={{ typeof $json.toString }}', [{ a: 1 }])).toBe('function');
		expect(evaluate('={{ $json.nested.toString() }}', [{ nested: { a: 1 } }])).toBe(
			'[object Object]',
		);
		expect(evaluate('={{ $json.list.toString() }}', [{ list: [1, 2, 3] }])).toBe('1,2,3');
	});
});
