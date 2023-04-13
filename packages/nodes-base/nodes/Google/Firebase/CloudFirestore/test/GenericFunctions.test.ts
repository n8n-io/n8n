import { jsonToDocument } from '../GenericFunctions';

describe('Firebase -> jsonToDocument', () => {
	test('returns booleanValue for boolean values', () => {
		expect(jsonToDocument(true)).toEqual({ booleanValue: true });
		expect(jsonToDocument(false)).toEqual({ booleanValue: false });
		expect(jsonToDocument('true')).toEqual({ booleanValue: true });
		expect(jsonToDocument('false')).toEqual({ booleanValue: false });
	});

	test('returns nullValue for null', () => {
		expect(jsonToDocument(null)).toEqual({ nullValue: null });
	});

	test('returns timestampValue for valid date string', () => {
		expect(jsonToDocument('2022-03-04T10:20:30Z')).toEqual({
			timestampValue: '2022-03-04T10:20:30.000Z',
		});
	});

	test('returns stringValue for string values', () => {
		expect(jsonToDocument('')).toEqual({ stringValue: '' });
		expect(jsonToDocument('123456789')).toEqual({ stringValue: '123456789' });
		expect(jsonToDocument('hello')).toEqual({ stringValue: 'hello' });
	});

	test('returns arrayValue for array values', () => {
		expect(jsonToDocument([])).toEqual({ arrayValue: { values: [] } });
		expect(jsonToDocument([1, 'two', { three: 3 }])).toEqual({
			arrayValue: {
				values: [
					{ integerValue: 1 },
					{ stringValue: 'two' },
					{ mapValue: { fields: { three: { integerValue: 3 } } } },
				],
			},
		});
	});

	test('returns mapValue for object values', () => {
		expect(jsonToDocument({ a: 1, b: 'two', c: { three: 3 } })).toEqual({
			mapValue: {
				fields: {
					a: { integerValue: 1 },
					b: { stringValue: 'two' },
					c: { mapValue: { fields: { three: { integerValue: 3 } } } },
				},
			},
		});
	});

	test('returns doubleValue or integerValue for numeric values', () => {
		expect(jsonToDocument(123)).toEqual({ integerValue: 123 });
		expect(jsonToDocument(1.23)).toEqual({ doubleValue: 1.23 });
	});

	test('returns empty object for other types', () => {
		expect(jsonToDocument(undefined)).toEqual({});
		expect(jsonToDocument({})).toEqual({ mapValue: { fields: {} } });
	});
});
