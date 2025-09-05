import { DateTime, Settings } from 'luxon';

import {
	getValueDescription,
	tryToParseDateTime,
	tryToParseJsonToFormFields,
	validateFieldType,
} from '../src/type-validation';

describe('Type Validation', () => {
	describe('string-alphanumeric', () => {
		test('should validate and parse alphanumeric strings, not starting with a number', () => {
			const VALID_STRINGS = ['abc123', 'ABC123', 'abc_123', '_abc123', 'abcABC123_'];
			VALID_STRINGS.forEach((value) =>
				expect(validateFieldType('string', value, 'string-alphanumeric')).toEqual({
					valid: true,
					newValue: value,
				}),
			);
		});

		test('should not validate non-alphanumeric strings, or starting with a number', () => {
			const INVALID_STRINGS = [
				'abc-123',
				'abc 123',
				'abc@123',
				'abc#123',
				'abc.123',
				'abc$123',
				'abc&123',
				'abc!123',
				'abc(123)',
				'bπc123',
				'πι',
				'123abc', // Cannot start with number
				'456_abc', // Cannot start with number
			];
			INVALID_STRINGS.forEach((value) =>
				expect(validateFieldType('string', value, 'string-alphanumeric').valid).toBe(false),
			);
		});
	});
	describe('Dates', () => {
		test('should validate and cast ISO dates', () => {
			const VALID_ISO_DATES = [
				'1994-11-05T08:15:30-05:00',
				'1994-11-05T13:15:30Z',
				'1997-07-16T19:20+01:00',
				'1997-07-16T19:20:30+01:00',
				'1997-07-16T19:20:30.45+01:00',
				'2018-05-16',
				'1972-06-30T23:59:40Z',
				'2019-03-26T14:00:00.9Z',
				'2019-03-26T14:00:00.4999Z',
				'2023-05-17T10:52:32+0000',
				'2023-05-17T10:52:32+0000',
			];
			VALID_ISO_DATES.forEach((date) =>
				expect(validateFieldType('date', date, 'dateTime')).toEqual({
					valid: true,
					newValue: expect.any(DateTime),
				}),
			);
		});

		test('should validate and cast RFC2822 dates', () => {
			const VALID_RFC_DATES = [
				'Tue, 04 Jun 2013 07:40:03 -0400',
				'Tue, 4 Jun 2013 02:24:39 +0530',
				'Wed, 17 May 2023 10:52:32 +0000',
			];
			VALID_RFC_DATES.forEach((date) =>
				expect(validateFieldType('date', date, 'dateTime')).toEqual({
					valid: true,
					newValue: expect.any(DateTime),
				}),
			);
		});

		test('should validate and cast HTTP dates', () => {
			const VALID_HTTP_DATES = [
				'Wed, 21 Oct 2015 07:28:00 GMT',
				'Wed, 01 Jun 2022 08:00:00 GMT',
				'Tue, 15 Nov 1994 12:45:26 GMT',
				'Wed, 1 Jun 2022 08:00:00 GMT',
			];
			VALID_HTTP_DATES.forEach((date) =>
				expect(validateFieldType('date', date, 'dateTime')).toEqual({
					valid: true,
					newValue: expect.any(DateTime),
				}),
			);
		});

		test('should validate and cast SQL dates', () => {
			const VALID_SQL_DATES = ['2008-11-11', '2008-11-11 13:23:44'];
			VALID_SQL_DATES.forEach((date) =>
				expect(validateFieldType('date', date, 'dateTime')).toEqual({
					valid: true,
					newValue: expect.any(DateTime),
				}),
			);
		});

		test('should validate and cast other valid dates', () => {
			const OTHER_VALID_DATES = [
				'Wed, 17 May 2023 10:52:32',
				'SMT, 17 May 2023 10:52:32',
				'1-Feb-2024',
				new Date(),
				DateTime.now(),
			];
			OTHER_VALID_DATES.forEach((date) =>
				expect(validateFieldType('date', date, 'dateTime')).toEqual({
					valid: true,
					newValue: expect.any(DateTime),
				}),
			);
		});

		test('should not validate invalid dates', () => {
			const INVALID_DATES = [
				'1994-11-05M08:15:30-05:00',
				'18-05-2020',
				'',
				'1685084980', // We are not supporting timestamps
				'1685085012135',
				1685084980,
				1685085012135,
				true,
				[],
			];
			INVALID_DATES.forEach((date) =>
				expect(validateFieldType('date', date, 'dateTime').valid).toBe(false),
			);
		});
	});

	it('should validate boolean values properly', () => {
		const TRUE_VALUES = ['true', 'TRUE', 1, '1', '01'];
		TRUE_VALUES.forEach((value) =>
			expect(validateFieldType('boolean', value, 'boolean')).toEqual({
				valid: true,
				newValue: true,
			}),
		);

		const FALSE_VALUES = ['false', 'FALSE', 0, '0', '000', '0000'];
		FALSE_VALUES.forEach((value) =>
			expect(validateFieldType('boolean', value, 'boolean')).toEqual({
				valid: true,
				newValue: false,
			}),
		);
	});

	it('should not validate invalid boolean values', () => {
		const INVALID_VALUES = ['tru', 'fals', 1111, 2, -1, 'yes', 'no'];
		INVALID_VALUES.forEach((value) =>
			expect(validateFieldType('boolean', value, 'boolean').valid).toEqual(false),
		);
	});

	it('should validate and cast numbers', () => {
		const VALID_NUMBERS = [
			['1', 1],
			['-1', -1],
			['1.1', 1.1],
			['-1.1', -1.1],
			[1, 1],
			[true, 1],
		];
		VALID_NUMBERS.forEach(([value, expected]) =>
			expect(validateFieldType('number', value, 'number')).toEqual({
				valid: true,
				newValue: expected,
			}),
		);

		const INVALID_NUMBERS = ['A', '1,1', '1972-06-30T23:59:40Z', [1, 2]];
		INVALID_NUMBERS.forEach((value) =>
			expect(validateFieldType('number', value, 'number').valid).toEqual(false),
		);
	});

	it('should validate and cast JSON & JS objects properly', () => {
		const VALID_OBJECTS = [
			['{"a": 1}', { a: 1 }],
			['{a: 1}', { a: 1 }],
			["{'a': '1'}", { a: '1' }],
			["{'\\'single quoted\\' \"double quoted\"': 1}", { '\'single quoted\' "double quoted"': 1 }],
			['{"a": 1, "b": { "c": 10, "d": "test"}}', { a: 1, b: { c: 10, d: 'test' } }],
			["{\"a\": 1, b: { 'c': 10, d: 'test'}}", { a: 1, b: { c: 10, d: 'test' } }],
			[{ name: 'John' }, { name: 'John' }],
			[
				{ name: 'John', address: { street: 'Via Roma', city: 'Milano' } },
				{ name: 'John', address: { street: 'Via Roma', city: 'Milano' } },
			],
		];
		VALID_OBJECTS.forEach(([value, expected]) =>
			expect(validateFieldType('json', value, 'object')).toEqual({
				valid: true,
				newValue: expected,
			}),
		);

		const INVALID_OBJECTS = [
			['one', 'two'],
			'1',
			'[1]',
			'1.1',
			1.1,
			'"a"',
			'["apples", "oranges"]',
			[{ name: 'john' }, { name: 'bob' }],
			'[ { name: "john" }, { name: "bob" } ]',
		];
		INVALID_OBJECTS.forEach((value) =>
			expect(validateFieldType('json', value, 'object').valid).toEqual(false),
		);
	});

	it('should validate and cast arrays properly', () => {
		const VALID_ARRAYS = [
			['["apples", "oranges"]', ['apples', 'oranges']],
			['[1]', [1]],
			['[1, 2]', [1, 2]],
		];
		VALID_ARRAYS.forEach(([value, expected]) =>
			expect(validateFieldType('array', value, 'array')).toEqual({
				valid: true,
				newValue: expected,
			}),
		);

		const INVALID_ARRAYS = [
			'"apples", "oranges"',
			'1',
			'1.1',
			'1, 2',
			'1. 2. 3',
			'[1, 2, 3',
			'1, 2, 3]',
			'{1, 2, {3, 4}, 5}',
			'1, 2, {3, 4}, 5',
			{ name: 'John' },
		];
		INVALID_ARRAYS.forEach((value) =>
			expect(validateFieldType('array', value, 'array').valid).toEqual(false),
		);
	});

	it('should validate options properly', () => {
		expect(
			validateFieldType('options', 'oranges', 'options', {
				valueOptions: [
					{ name: 'apples', value: 'apples' },
					{ name: 'oranges', value: 'oranges' },
				],
			}).valid,
		).toEqual(true);
		expect(
			validateFieldType('options', 'something else', 'options', {
				valueOptions: [
					{ name: 'apples', value: 'apples' },
					{ name: 'oranges', value: 'oranges' },
				],
			}).valid,
		).toEqual(false);
	});

	it('should validate and cast time properly', () => {
		const VALID_TIMES = [
			['23:23', '23:23'],
			['23:23:23', '23:23:23'],
			['23:23:23+1000', '23:23:23+1000'],
			['23:23:23-1000', '23:23:23-1000'],
			['22:00:00+01:00', '22:00:00+01:00'],
			['22:00:00-01:00', '22:00:00-01:00'],
			['22:00:00+01', '22:00:00+01'],
			['22:00:00-01', '22:00:00-01'],
		];
		VALID_TIMES.forEach(([value, expected]) =>
			expect(validateFieldType('time', value, 'time')).toEqual({
				valid: true,
				newValue: expected,
			}),
		);

		const INVALID_TIMES = ['23:23:23:23', '23', 'foo', '23:23:', '23::23::23'];
		INVALID_TIMES.forEach((value) =>
			expect(validateFieldType('time', value, 'time').valid).toEqual(false),
		);
	});

	describe('options', () => {
		describe('strict=true', () => {
			it('should not convert/cast types', () => {
				const options = { strict: true };
				expect(validateFieldType('test', '42', 'number', options).valid).toBe(false);
				expect(validateFieldType('test', 'true', 'boolean', options).valid).toBe(false);
				expect(validateFieldType('test', [], 'object', options).valid).toBe(false);
			});
		});

		describe('parseStrings=true', () => {
			it('should parse strings from other types', () => {
				const options = { parseStrings: true };
				expect(validateFieldType('test', 42, 'string')).toEqual({ valid: true, newValue: 42 });
				expect(validateFieldType('test', 42, 'string', options)).toEqual({
					valid: true,
					newValue: '42',
				});
				expect(validateFieldType('test', true, 'string', options)).toEqual({
					valid: true,
					newValue: 'true',
				});
			});
		});
	});
	describe('getValueDescription util function', () => {
		it('should return correct description', () => {
			expect(getValueDescription('foo')).toBe("'foo'");
			expect(getValueDescription(42)).toBe("'42'");
			expect(getValueDescription(true)).toBe("'true'");
			expect(getValueDescription(null)).toBe("'null'");
			expect(getValueDescription(undefined)).toBe("'undefined'");
			expect(getValueDescription([{}])).toBe('array');
			expect(getValueDescription({})).toBe('object');
		});
	});

	describe('tryToParseDateTime', () => {
		it('should NOT use defaultZone if set', () => {
			const result = tryToParseDateTime('2025-04-17T06:22:20-04:00', 'Europe/Brussels');

			expect(result.zoneName).toEqual('UTC-4');
			expect(result.toISO()).toEqual('2025-04-17T06:22:20.000-04:00');
		});

		it('should use defaultZone if timezone is not set', () => {
			const result = tryToParseDateTime('2025-04-17T06:22:20', 'Europe/Brussels');

			expect(result.zoneName).toEqual('Europe/Brussels');
			expect(result.toISO()).toEqual('2025-04-17T06:22:20.000+02:00');
		});

		it('should use the system timezone when defaultZone arg is not given', () => {
			Settings.defaultZone = 'UTC-7';
			const result = tryToParseDateTime('2025-04-17T06:22:20');

			expect(result.zoneName).toEqual('UTC-7');
			expect(result.toISO()).toEqual('2025-04-17T06:22:20.000-07:00');
		});

		it('should not impact DateTime zone', () => {
			const dateTime = DateTime.fromObject(
				{ year: 2025, month: 1, day: 1 },
				{ zone: 'Asia/Tokyo' },
			);
			const result = tryToParseDateTime(dateTime, 'Europe/Brussels');

			expect(result.zoneName).toEqual('Asia/Tokyo');
			expect(result.toISO()).toEqual('2025-01-01T00:00:00.000+09:00');
		});
	});

	describe('tryToParseJsonToFormFields', () => {
		it('should parse html field', () => {
			const json = '[{"fieldType": "html", "html": "<div>test</div>"}]';
			const fields = tryToParseJsonToFormFields(json);
			expect(fields).toEqual([{ fieldType: 'html', html: '<div>test</div>' }]);
		});
	});
});
