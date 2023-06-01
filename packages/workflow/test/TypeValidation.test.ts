import { validateFieldType } from '@/NodeHelpers';
import type { DateTime } from 'luxon';

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

const VALID_HTTP_DATES = [
	'Wed, 21 Oct 2015 07:28:00 GMT',
	'Wed, 01 Jun 2022 08:00:00 GMT',
	'Tue, 15 Nov 1994 12:45:26 GMT',
	'Wed, 1 Jun 2022 08:00:00 GMT',
];

const VALID_RFC_DATES = [
	'Tue, 04 Jun 2013 07:40:03 -0400',
	'Tue, 4 Jun 2013 02:24:39 +0530',
	'Wed, 17 May 2023 10:52:32 +0000',
];

const VALID_SQL_DATES = ['2008-11-11', '2008-11-11 13:23:44'];

const INVALID_DATES = [
	'1994-11-05M08:15:30-05:00',
	'18-05-2020',
	'',
	'Wed, 17 May 2023 10:52:32',
	'SMT, 17 May 2023 10:52:32',
	'1685084980', // We are not supporting timestamps
	'1685085012135',
	1685084980,
	1685085012135,
	true,
	[],
];

describe('Type Validation', () => {
	it('should validate and cast ISO dates', () => {
		VALID_ISO_DATES.forEach((date) => {
			const validationResult = validateFieldType('date', date, 'dateTime');
			expect(validationResult.valid).toBe(true);
			expect((validationResult.newValue as DateTime).isValid).toBe(true);
		});
	});

	it('should validate and cast RFC 2822 dates', () => {
		VALID_RFC_DATES.forEach((date) => {
			const validationResult = validateFieldType('date', date, 'dateTime');
			expect(validationResult.valid).toBe(true);
			expect((validationResult.newValue as DateTime).isValid).toBe(true);
		});
	});

	it('should validate and cast HTTP dates', () => {
		VALID_HTTP_DATES.forEach((date) => {
			const validationResult = validateFieldType('date', date, 'dateTime');
			expect(validationResult.valid).toBe(true);
			expect((validationResult.newValue as DateTime).isValid).toBe(true);
		});
	});

	it('should validate and cast SQL dates', () => {
		VALID_SQL_DATES.forEach((date) => {
			const validationResult = validateFieldType('date', date, 'dateTime');
			expect(validationResult.valid).toBe(true);
			expect((validationResult.newValue as DateTime).isValid).toBe(true);
		});
	});

	it('should not validate invalid dates', () => {
		INVALID_DATES.forEach((date) => {
			const validationResult = validateFieldType('date', date, 'dateTime');
			expect(validationResult.valid).toBe(false);
		});
	});

	it('should validate boolean values properly', () => {
		expect(validateFieldType('boolean', 'true', 'boolean').newValue).toBe(true);
		expect(validateFieldType('boolean', 'TRUE', 'boolean').newValue).toBe(true);
		expect(validateFieldType('boolean', 1, 'boolean').newValue).toBe(true);
		expect(validateFieldType('boolean', '1', 'boolean').newValue).toBe(true);
		expect(validateFieldType('boolean', '01', 'boolean').newValue).toBe(true);
		expect(validateFieldType('boolean', 'false', 'boolean').newValue).toBe(false);
		expect(validateFieldType('boolean', 'FALSE', 'boolean').newValue).toBe(false);
		expect(validateFieldType('boolean', '0', 'boolean').newValue).toBe(false);
		expect(validateFieldType('boolean', '000', 'boolean').newValue).toBe(false);
		expect(validateFieldType('boolean', '0000', 'boolean').newValue).toBe(false);
		expect(validateFieldType('boolean', 0, 'boolean').newValue).toBe(false);
	});

	it('should not validate invalid boolean values', () => {
		expect(validateFieldType('boolean', 'tru', 'boolean').valid).toBe(false);
		expect(validateFieldType('boolean', 'fals', 'boolean').valid).toBe(false);
		expect(validateFieldType('boolean', 1111, 'boolean').valid).toBe(false);
		expect(validateFieldType('boolean', 2, 'boolean').valid).toBe(false);
		expect(validateFieldType('boolean', -1, 'boolean').valid).toBe(false);
		expect(validateFieldType('boolean', 'yes', 'boolean').valid).toBe(false);
		expect(validateFieldType('boolean', 'no', 'boolean').valid).toBe(false);
	});

	it('should validate and cast numbers', () => {
		expect(validateFieldType('number', '1', 'number').newValue).toBe(1);
		expect(validateFieldType('number', '-1', 'number').newValue).toBe(-1);
		expect(validateFieldType('number', '1.1', 'number').newValue).toBe(1.1);
		expect(validateFieldType('number', '-1.1', 'number').newValue).toBe(-1.1);
		expect(validateFieldType('number', 1, 'number').newValue).toBe(1);
		expect(validateFieldType('number', 'A', 'number').valid).toBe(false);
		expect(validateFieldType('number', '1,1', 'number').valid).toBe(false);
		expect(validateFieldType('number', true, 'number').valid).toBe(true);
		expect(validateFieldType('number', '1972-06-30T23:59:40Z', 'number').valid).toBe(false);
		expect(validateFieldType('number', [1, 2], 'number').valid).toBe(false);
	});

	it('should validate and cast JSON properly', () => {
		expect(validateFieldType('json', '{"a": 1}', 'object').newValue).toEqual({ a: 1 });
		expect(
			validateFieldType('json', '{"a": 1, "b": { "c": 10, "d": "test"}}', 'object').valid,
		).toEqual(true);
		expect(validateFieldType('json', { name: 'John' }, 'object').valid).toEqual(true);
		expect(
			validateFieldType(
				'json',
				{ name: 'John', address: { street: 'Via Roma', city: 'Milano' } },
				'object',
			).valid,
		).toEqual(true);
		// Invalid value:
		expect(validateFieldType('json', ['one', 'two'], 'object').valid).toEqual(false);
		// eslint-disable-next-line prettier/prettier
		expect(validateFieldType('json', ["one", "two"], 'object').valid).toEqual(false);
		expect(validateFieldType('json', '1', 'object').valid).toEqual(false);
		expect(validateFieldType('json', '[1]', 'object').valid).toEqual(false);
		expect(validateFieldType('json', '1.1', 'object').valid).toEqual(false);
		expect(validateFieldType('json', 1.1, 'object').valid).toEqual(false);
		expect(validateFieldType('json', '"a"', 'object').valid).toEqual(false);
		expect(validateFieldType('json', '{a: 1}', 'object').valid).toEqual(false);
		expect(validateFieldType('json', '["apples", "oranges"]', 'object').valid).toEqual(false);
		expect(validateFieldType('json', [{ name: 'john' }, { name: 'bob' }], 'object').valid).toEqual(
			false,
		);
		expect(
			validateFieldType('json', '[ { name: "john" }, { name: "bob" } ]', 'object').valid,
		).toEqual(false);
	});

	it('should validate and cast arrays properly', () => {
		expect(validateFieldType('array', '["apples", "oranges"]', 'array').newValue).toEqual([
			'apples',
			'oranges',
		]);
		expect(validateFieldType('array', '[1]', 'array').newValue).toEqual([1]);
		expect(validateFieldType('array', '[1, 2]', 'array').newValue).toEqual([1, 2]);
		// Invalid values:
		expect(validateFieldType('array', '"apples", "oranges"', 'array').valid).toEqual(false);
		expect(validateFieldType('array', '1', 'array').valid).toEqual(false);
		expect(validateFieldType('array', '1.1', 'array').valid).toEqual(false);
		expect(validateFieldType('array', '1, 2', 'array').valid).toEqual(false);
		expect(validateFieldType('array', '1. 2. 3', 'array').valid).toEqual(false);
		expect(validateFieldType('array', '[1, 2, 3', 'array').valid).toEqual(false);
		expect(validateFieldType('array', '1, 2, 3]', 'array').valid).toEqual(false);
		expect(validateFieldType('array', '{1, 2, {3, 4}, 5}', 'array').valid).toEqual(false);
		expect(validateFieldType('array', '1, 2, {3, 4}, 5', 'array').valid).toEqual(false);
		expect(validateFieldType('array', { name: 'John' }, 'array').valid).toEqual(false);
	});

	it('should validate options properly', () => {
		expect(
			validateFieldType('options', 'oranges', 'options', [
				{ name: 'apples', value: 'apples' },
				{ name: 'oranges', value: 'oranges' },
			]).valid,
		).toEqual(true);
		expect(
			validateFieldType('options', 'something else', 'options', [
				{ name: 'apples', value: 'apples' },
				{ name: 'oranges', value: 'oranges' },
			]).valid,
		).toEqual(false);
	});

	it('should validate and cast time properly', () => {
		expect(validateFieldType('time', '23:23', 'time').valid).toEqual(true);
		expect(validateFieldType('time', '23:23:23', 'time').valid).toEqual(true);
		expect(validateFieldType('time', '23:23:23+1000', 'time').valid).toEqual(true);
		expect(validateFieldType('time', '23:23:23-1000', 'time').valid).toEqual(true);
		expect(validateFieldType('time', '22:00:00+01:00', 'time').valid).toEqual(true);
		expect(validateFieldType('time', '22:00:00-01:00', 'time').valid).toEqual(true);
		expect(validateFieldType('time', '22:00:00+01', 'time').valid).toEqual(true);
		expect(validateFieldType('time', '22:00:00-01', 'time').valid).toEqual(true);
		expect(validateFieldType('time', '23:23:23:23', 'time').valid).toEqual(false);
		expect(validateFieldType('time', '23', 'time').valid).toEqual(false);
		expect(validateFieldType('time', 'foo', 'time').valid).toEqual(false);
		expect(validateFieldType('time', '23:23:', 'time').valid).toEqual(false);
		expect(validateFieldType('time', '23::23::23', 'time').valid).toEqual(false);
	});
});
