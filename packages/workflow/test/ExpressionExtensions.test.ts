/**
 * @jest-environment jsdom
 */

import { Expression, Workflow } from '../src';
import * as Helpers from './Helpers';
import { DateTime } from 'luxon';
import { extend } from '../src/Extensions';
import { DateExtensions } from '../src/Extensions/DateExtensions';

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

		it('should be able to utilize date expression extension methods', () => {
			const dateExtensions = (...args: any[]) => {
				return extend(DateTime.now(), ...args) as unknown as DateExtensions;
			};
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
	});
});
