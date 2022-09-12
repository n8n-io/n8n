/**
 * @jest-environment jsdom
 */

import { Expression, Workflow } from '../src';
import * as Helpers from './Helpers';
import { DateTime } from 'luxon';
import { extend } from '../src/Extensions';
import { DateExtensions } from '../src/Extensions/DateExtensions';
import { StringExtensions } from '../src/Extensions/StringExtensions';
import { ArrayExtensions } from '../src/Extensions/ArrayExtensions';
import { NumberExtensions } from '../src/Extensions/NumberExtensions';

const nodeTypes = Helpers.NodeTypes();
const workflow = new Workflow({
	nodes: [
		{
			name: 'node',
			typeVersion: 1,
			type: 'test.set',
			id: 'uuid-1234',
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
	active: false,
	nodeTypes,
});
const expression = new Expression(workflow);

const evaluate = (value: string) =>
	expression.getParameterValue(value, null, 0, 0, 'node', [], 'manual', 'America/New_York', {});

const dateExtensions = (...args: any[]) => {
	return extend(DateTime.now(), ...args) as unknown as DateExtensions;
};

const stringExtensions = (data = '', ...args: any[]) => {
	return extend(data, ...args) as unknown as StringExtensions;
};

const arrayExtensions = (data: any[], ...args: any[]) => {
	return extend(data, ...args) as unknown as ArrayExtensions;
};

const numberExtensions = (data: number, ...args: any[]) => {
	return extend(data, ...args) as unknown as NumberExtensions;
};

describe('Data Transformation Functions', () => {
	describe('Date Data Transformation Functions', () => {
		test('.isWeekend() should work correctly on a date', () => {
			expect(evaluate('={{DateTime.now().isWeekend()}}')).toEqual(
				dateExtensions().isWeekend(new Date()),
			);
		});

		test('.toTimeFromNow() should work correctly on a date', () => {
			const JUST_NOW_STRING_RESULT = 'just now';
			expect(evaluate('={{DateTime.now().toTimeFromNow()}}')).toEqual(JUST_NOW_STRING_RESULT);
		});

		test('.begginingOf("week") should work correctly on a date', () => {
			expect(evaluate('={{DateTime.now().begginingOf("week")}}')).toEqual(
				dateExtensions('week').begginingOf(new Date(), 'week'),
			);
		});

		test('.endOfMonth() should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.now().endOfMonth() }}')).toEqual(
				dateExtensions().endOfMonth(new Date()),
			);
		});

		test('.extract("day") should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.now().extract("day") }}')).toEqual(
				dateExtensions('day').extract(new Date(), 'day'),
			);
		});

		test('.format("yyyy LLL dd") should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.now().format("yyyy LLL dd") }}')).toEqual(
				dateExtensions('yyyy LLL dd').format(new Date(), 'yyyy LLL dd'),
			);
			expect(evaluate('={{ DateTime.now().format("yyyy LLL dd") }}')).not.toEqual(
				dateExtensions("HH 'hours and' mm 'minutes'").format(
					new Date(),
					"HH 'hours and' mm 'minutes'",
				),
			);
		});
	});

	describe('String Data Transformation Functions', () => {
		test('.isBlank() should work correctly on a string that is not empty', () => {
			expect(evaluate('={{"NotBlank".isBlank()}}')).toEqual(
				stringExtensions('NotBlank').isBlank('NotBlank'),
			);
		});

		test('.isBlank() should work correctly on a string that is empty', () => {
			expect(evaluate('={{"".isBlank()}}')).toEqual(stringExtensions('').isBlank(''));
		});

		test('.getOnlyFirstCharacters() should work correctly on a string', () => {
			expect(evaluate('={{"myNewField".getOnlyFirstCharacters(5)}}')).toEqual('myNew');

			expect(evaluate('={{"myNewField".getOnlyFirstCharacters(10)}}')).toEqual('myNewField');

			expect(
				evaluate('={{"myNewField".getOnlyFirstCharacters(5).length >= "myNewField".length}}'),
			).toEqual(
				stringExtensions('myNewField', 5).getOnlyFirstCharacters('myNewField', 5).length >=
					'myNewField'.length,
			);

			expect(evaluate('={{DateTime.now().toLocaleString().getOnlyFirstCharacters(2)}}')).toEqual(
				stringExtensions(dateExtensions().toLocaleString(new Date()), 2).getOnlyFirstCharacters(
					dateExtensions().toLocaleString(new Date()),
					2,
				),
			);
		});

		test('.sayHi() should work correctly on a string', () => {
			expect(evaluate('={{ "abc".sayHi() }}')).toEqual('hi abc');
		});

		test('.encrypt() should work correctly on a string', () => {
			expect(evaluate('={{ "12345".encrypt("sha256") }}')).toEqual(
				stringExtensions('12345', 'sha256').encrypt('12345', 'sha256'),
			);

			expect(evaluate('={{ "12345".encrypt("sha256") }}')).not.toEqual(
				stringExtensions('12345', 'MD5').encrypt('12345', 'MD5'),
			);

			expect(evaluate('={{ "12345".encrypt("MD5") }}')).toEqual(
				stringExtensions('12345', 'MD5').encrypt('12345', 'MD5'),
			);

			expect(evaluate('={{ "12345".hash("sha256") }}')).toEqual(
				'5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5',
			);
		});

		test('.hash() alias should work correctly on a string', () => {
			expect(evaluate('={{ "12345".hash("sha256") }}')).toEqual(
				'5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5',
			);
		});

		test('.urlDecode should work correctly on a string', () => {
			expect(evaluate('={{ "string%20with%20spaces".urlDecode(false) }}')).toEqual(
				'string with spaces',
			);
		});

		test('.urlEncode should work correctly on a string', () => {
			expect(evaluate('={{ "string with spaces".urlEncode(false) }}')).toEqual(
				'string%20with%20spaces',
			);
		});

		test('.stripTags should work correctly on a string', () => {
			expect(evaluate('={{ "<html><head>test</head></html>".stripTags() }}')).toEqual('test');
		});

		test('.removeMarkdown should work correctly on a string', () => {
			expect(evaluate('={{ "<html><head>test</head></html>".removeMarkdown() }}')).toEqual('test');
		});

		test('.toLowerCase should work correctly on a string', () => {
			expect(evaluate('={{ "TEST".toLowerCase() }}')).toEqual('test');
		});

		test('.toDate should work correctly on a date string', () => {
			expect(evaluate('={{ "2022-09-01T19:42:28.164Z".toDate() }}')).toEqual(
				new Date('2022-09-01T19:42:28.164Z'),
			);
		});
	});

	describe('Array Data Transformation Functions', () => {
		test('.random() should work correctly on an array', () => {
			expect(evaluate('={{ [1,2,3].random() }}')).not.toBeUndefined();
		});

		test('.randomItem() alias should work correctly on an array', () => {
			expect(evaluate('={{ [1,2,3].randomItem() }}')).not.toBeUndefined();
		});

		test('.isPresent() should work correctly on an array', () => {
			expect(evaluate('={{ [1,2,3, "imhere"].isPresent("imhere") }}')).toEqual(
				arrayExtensions([1, 2, 3, 'imhere'], 'imhere').isPresent([1, 2, 3, 'imhere'], 'imhere'),
			);
		});

		test('.pluck() should work correctly on an array', () => {
			expect(
				evaluate(`={{ [
				{ value: 1, string: '1' },
				{ value: 2, string: '2' },
				{ value: 3, string: '3' },
				{ value: 4, string: '4' },
				{ value: 5, string: '5' },
				{ value: 6, string: '6' }
			].pluck("value") }}`),
			).toEqual(
				expect.arrayContaining([
					{ value: 1 },
					{ value: 2 },
					{ value: 3 },
					{ value: 4 },
					{ value: 5 },
					{ value: 6 },
				]),
			);
		});

		test('.unique() should work correctly on an array', () => {
			expect(evaluate('={{ ["repeat","repeat","a","b","c"].unique() }}')).toEqual(
				expect.arrayContaining(['repeat', 'repeat', 'a', 'b', 'c']),
			);
		});

		test('.isBlank() should work correctly on an array', () => {
			expect(evaluate('={{ [].isBlank() }}')).toEqual(arrayExtensions([]).isBlank([]));
		});

		test('.length() should work correctly on an array', () => {
			expect(evaluate('={{ [].length() }}')).toEqual(arrayExtensions([]).length([]));
		});

		test('.count() should work correctly on an array', () => {
			expect(evaluate('={{ [1].count() }}')).toEqual(arrayExtensions([1]).length([1]));
		});

		test('.size() should work correctly on an array', () => {
			expect(evaluate('={{ [1,2].size() }}')).toEqual(arrayExtensions([1, 2]).length([1, 2]));
		});

		test('.last() should work correctly on an array', () => {
			expect(evaluate('={{ ["repeat","repeat","a","b","c"].last() }}')).toEqual('c');
		});

		test('.first() should work correctly on an array', () => {
			expect(evaluate('={{ ["repeat","repeat","a","b","c"].first() }}')).toEqual('repeat');
		});

		test('.filter() should work correctly on an array', () => {
			expect(evaluate('={{ ["repeat","repeat","a","b","c"].filter("repeat") }}')).toEqual(
				expect.arrayContaining(['repeat', 'repeat']),
			);
		});
	});

	describe('Number Data Transformation Functions', () => {
		test('.random() should work correctly on a number', () => {
			expect(evaluate('={{ Number(100).random() }}')).not.toBeUndefined();
		});

		test('.isBlank() should work correctly on a number', () => {
			expect(evaluate('={{ Number(100).isBlank() }}')).toEqual(false);
		});

		test('.isPresent() should work correctly on a number', () => {
			expect(evaluate('={{ Number(100).isPresent() }}')).toEqual(
				numberExtensions(100).isPresent(100),
			);
		});

		test('.format() should work correctly on a number', () => {
			expect(evaluate('={{ Number(100).format() }}')).toEqual(numberExtensions(100).format(100));
		});
	});
});
