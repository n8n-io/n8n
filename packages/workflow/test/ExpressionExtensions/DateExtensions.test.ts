/**
 * @jest-environment jsdom
 */

import { extend } from '@/Extensions';
import { dateExtensions } from '@/Extensions/DateExtensions';
import { evaluate } from './Helpers';

describe('Data Transformation Functions', () => {
	describe('Date Data Transformation Functions', () => {
		test('.isWeekend() should work correctly on a date', () => {
			expect(evaluate('={{DateTime.now().isWeekend()}}')).toEqual(
				extend(new Date(), 'isWeekend', []),
			);
		});

		test('.toTimeFromNow() should work correctly on a date', () => {
			const JUST_NOW_STRING_RESULT = 'just now';
			expect(evaluate('={{DateTime.now().toTimeFromNow()}}')).toEqual(JUST_NOW_STRING_RESULT);
		});

		test('.beginningOf("week") should work correctly on a date', () => {
			expect(evaluate('={{(new Date).beginningOf("week")}}')).toEqual(
				dateExtensions.functions.beginningOf(new Date(), ['week']),
			);
		});

		test('.endOfMonth() should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.now().endOfMonth() }}')).toEqual(
				dateExtensions.functions.endOfMonth(new Date()),
			);
		});

		test('.extract("day") should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.now().extract("day") }}')).toEqual(
				dateExtensions.functions.extract(new Date(), ['day']),
			);
		});

		test('.format("yyyy LLL dd") should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.now().format("yyyy LLL dd") }}')).toEqual(
				dateExtensions.functions.format(new Date(), ['yyyy LLL dd']),
			);
			expect(evaluate('={{ DateTime.now().format("yyyy LLL dd") }}')).not.toEqual(
				dateExtensions.functions.format(new Date(), ["HH 'hours and' mm 'minutes'"]),
			);
		});

		test('.toDate() should work on a string', () => {
			const offsetToString = (input: number) => {
				let output = '-';
				if (input < 0) {
					output = '+';
					input = -input;
				}

				output += Math.floor(input / 60)
					.toString()
					.padStart(2, '0');
				output += ':';
				output += (input % 60).toString().padStart(2, '0');

				return output;
			};

			expect(
				evaluate(
					`={{ "2022-01-03T00:00:00.000${offsetToString(
						new Date().getTimezoneOffset(),
					)}".toDate() }}`,
				),
			).toEqual(new Date(2022, 0, 3));
		});
	});
});
