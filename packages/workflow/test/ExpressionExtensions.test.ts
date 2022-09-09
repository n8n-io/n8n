/**
 * @jest-environment jsdom
 */

import { Expression, Workflow } from '../src';
import * as Helpers from './Helpers';
import { DateTime } from 'luxon';
import { extend } from '../src/Extensions';
import { DateExtensions } from '../src/Extensions/DateExtensions';
import { StringExtensions } from '../src/Extensions/StringExtensions';

describe('Expression Extensions', () => {
	describe('extend()', () => {
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

		it('should be able to utilize date expression extension methods', () => {
			const JUST_NOW_STRING_RESULT = 'just now';
			// Date sensitive test case here so testing it to not be undefined should be enough
			expect(evaluate('={{DateTime.now().isWeekend()}}')).not.toEqual(undefined);

			expect(evaluate('={{DateTime.now().toTimeFromNow()}}')).toEqual(JUST_NOW_STRING_RESULT);

			expect(evaluate('={{DateTime.now().begginingOf("week")}}')).toEqual(
				dateExtensions('week').begginingOf.call({}, new Date(), 'week'),
			);

			expect(evaluate('={{ DateTime.now().endOfMonth() }}')).toEqual(
				dateExtensions().endOfMonth.call({}, new Date()),
			);

			expect(evaluate('={{ DateTime.now().extract("day") }}')).toEqual(
				dateExtensions('day').extract.call({}, new Date(), 'day'),
			);

			expect(evaluate('={{ DateTime.now().format("yyyy LLL dd") }}')).toEqual(
				dateExtensions('yyyy LLL dd').format.call({}, new Date(), 'yyyy LLL dd'),
			);

			expect(evaluate('={{ DateTime.now().format("yyyy LLL dd") }}')).not.toEqual(
				dateExtensions("HH 'hours and' mm 'minutes'").format.call(
					{},
					new Date(),
					"HH 'hours and' mm 'minutes'",
				),
			);
		});

		const stringExtensions = (data = '', ...args: any[]) => {
			return extend(data, ...args) as unknown as StringExtensions;
		};

		it('should be able to utilize string expression extension methods', () => {
			expect(evaluate('={{"NotBlank".isBlank()}}')).toEqual(
				stringExtensions('NotBlank').isBlank.call(String, 'NotBlank'),
			);

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

			expect(evaluate('={{ "abc".sayHi() }}')).toEqual('hi abc');

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

			expect(evaluate('={{ "string%20with%20spaces".urlDecode(false) }}')).toEqual(
				'string with spaces',
			);

			expect(evaluate('={{ "string with spaces".urlEncode(false) }}')).toEqual(
				'string%20with%20spaces',
			);

			expect(evaluate('={{ "<html><head>test</head></html>".stripTags() }}')).toEqual('test');

			expect(evaluate('={{ "<html><head>test</head></html>".removeMarkdown() }}')).toEqual('test');

			expect(evaluate('={{ "TEST".toLowerCase() }}')).toEqual('test');

			expect(evaluate('={{ "2022-09-01T19:42:28.164Z".toDate() }}')).toEqual(
				new Date('2022-09-01T19:42:28.164Z'),
			);
		});
	});
});
