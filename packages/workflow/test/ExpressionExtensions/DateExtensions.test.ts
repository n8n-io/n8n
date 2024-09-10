/**
 * @jest-environment jsdom
 */

import { DateTime } from 'luxon';
import { getGlobalState } from '@/GlobalState';
import { evaluate, getLocalISOString } from './Helpers';
import { dateExtensions } from '../../src/Extensions/DateExtensions';

const { defaultTimezone } = getGlobalState();

describe('Data Transformation Functions', () => {
	describe('Date Data Transformation Functions', () => {
		test('.isWeekend() should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.local(2023, 1, 20).isWeekend() }}')).toBe(false);
			expect(evaluate('={{ DateTime.local(2023, 1, 21).isWeekend() }}')).toBe(true);
			expect(evaluate('={{ DateTime.local(2023, 1, 22).isWeekend() }}')).toBe(true);
			expect(evaluate('={{ DateTime.local(2023, 1, 23).isWeekend() }}')).toBe(false);
		});

		test('.beginningOf("week") should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.local(2023, 1, 20).beginningOf("week") }}')).toEqual(
				DateTime.local(2023, 1, 16, { zone: defaultTimezone }),
			);

			expect(evaluate('={{ new Date(2023, 0, 20).beginningOf("week") }}')).toEqual(
				DateTime.local(2023, 1, 16, { zone: defaultTimezone }).toJSDate(),
			);
		});

		test('.beginningOf("week") should work correctly on a string', () => {
			const evaluatedDate = evaluate('={{ "2023-01-30".toDate().beginningOf("week") }}');
			const expectedDate = DateTime.local(2023, 1, 23, { zone: defaultTimezone }).toJSDate();

			if (evaluatedDate && evaluatedDate instanceof Date) {
				expect(evaluatedDate.toDateString()).toEqual(expectedDate.toDateString());
			}
		});

		test('.beginningOf("month") should work correctly on a string', () => {
			const evaluatedDate = evaluate('={{ "2023-06-16".toDate().beginningOf("month") }}');
			const expectedDate = DateTime.local(2023, 6, 1, { zone: defaultTimezone }).toJSDate();

			if (evaluatedDate && evaluatedDate instanceof Date) {
				expect(evaluatedDate.toDateString()).toEqual(expectedDate.toDateString());
			}
		});

		test('.beginningOf("year") should work correctly on a string', () => {
			const evaluatedDate = evaluate('={{ "2023-01-30".toDate().beginningOf("year") }}');
			const expectedDate = DateTime.local(2023, 1, 1, { zone: defaultTimezone }).toJSDate();

			if (evaluatedDate && evaluatedDate instanceof Date) {
				expect(evaluatedDate.toDateString()).toEqual(expectedDate.toDateString());
			}
		});

		test('.endOfMonth() should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.local(2023, 1, 16).endOfMonth() }}')).toEqual(
				DateTime.local(2023, 1, 31, 23, 59, 59, 999, { zone: defaultTimezone }),
			);
			expect(evaluate('={{ new Date(2023, 0, 16).endOfMonth() }}')).toEqual(
				DateTime.local(2023, 1, 31, 23, 59, 59, 999, { zone: defaultTimezone }).toJSDate(),
			);
		});

		test('.extract("day") should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.local(2023, 1, 20).extract("day") }}')).toEqual(20);
		});

		test('.extract() should extract week for no args', () => {
			expect(evaluate('={{ DateTime.local(2023, 1, 20).extract() }}')).toEqual(3);
		});

		test('.format("yyyy LLL dd") should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.local(2023, 1, 16).format("yyyy LLL dd") }}')).toEqual(
				'2023 Jan 16',
			);
		});

		test('.toDate() should work on a string', () => {
			const date = new Date(2022, 0, 3);
			expect(evaluate(`={{ "${getLocalISOString(date)}".toDate() }}`)).toEqual(date);
		});

		test('.inBetween() should work on string and Date', () => {
			expect(evaluate("={{ $now.isBetween('2023-06-23'.toDate(), '2023-06-23') }}")).toBeDefined();
		});

		test('.inBetween() should work on string and DateTime', () => {
			expect(evaluate("={{ $now.isBetween($now, '2023-06-23') }}")).toBeDefined();
		});

		test('.inBetween() should not work for invalid strings', () => {
			expect(evaluate("={{ $now.isBetween($now, 'invalid') }}")).toBeUndefined();
		});

		test('.inBetween() should not work for numbers', () => {
			expect(evaluate('={{ $now.isBetween($now, 1) }}')).toBeUndefined();
		});

		test('.inBetween() should not work for a single argument', () => {
			expect(() => evaluate('={{ $now.isBetween($now) }}')).toThrow();
		});

		test('.inBetween() should not work for a more than two arguments', () => {
			expect(() =>
				evaluate("={{ $now.isBetween($now, '2023-06-23', '2023-09-21'.toDate()) }}"),
			).toThrow();
		});

		test('.diffTo() should work with a single unit', () => {
			expect(
				evaluate(
					"={{ '2025-01-01'.toDateTime().diffTo('2024-03-30T18:49:07.234', 'days').floor() }}",
				),
			).toEqual(276);
		});

		test('.diffTo() should work with an array of units', () => {
			expect(
				evaluate(
					"={{ '2025-01-01T00:00:00.000'.toDateTime().diffTo('2024-03-30T18:49:07.234', ['months', 'days']) }}",
				),
			).toEqual({ months: 9, days: 1.2158884953703704 });
		});

		describe('toDateTime', () => {
			test('should return itself for DateTime', () => {
				const result = evaluate(
					"={{ DateTime.fromFormat('01-01-2024', 'dd-MM-yyyy').toDateTime() }}",
				) as unknown as DateTime;
				expect(result).toBeInstanceOf(DateTime);
				expect(result.day).toEqual(1);
				expect(result.month).toEqual(1);
				expect(result.year).toEqual(2024);
			});

			test('should return a DateTime for JS Date', () => {
				const result = evaluate(
					'={{ new Date(2024, 0, 1, 12).toDateTime() }}',
				) as unknown as DateTime;
				expect(result).toBeInstanceOf(DateTime);
				expect(result.day).toEqual(1);
				expect(result.month).toEqual(1);
				expect(result.year).toEqual(2024);
			});
		});

		describe('toInt/toFloat', () => {
			test('should return milliseconds for DateTime', () => {
				expect(evaluate("={{ DateTime.fromISO('2024-01-01T00:00:00.000Z').toInt() }}")).toEqual(
					1704067200000,
				);
			});

			test('should return milliseconds for JS Date', () => {
				expect(evaluate('={{ new Date("2024-01-01T00:00:00.000Z").toFloat() }}')).toEqual(
					1704067200000,
				);
			});

			test('should not have a doc (hidden from autocomplete)', () => {
				expect(dateExtensions.functions.toInt.doc).toBeUndefined();
				expect(dateExtensions.functions.toFloat.doc).toBeUndefined();
			});
		});

		describe('toBoolean', () => {
			test('should return undefined', () => {
				expect(evaluate('={{ new Date("2024-01-01T00:00:00.000Z").toBoolean() }}')).toBeUndefined();
			});

			test('should not have a doc (hidden from autocomplete)', () => {
				expect(dateExtensions.functions.toBoolean.doc).toBeUndefined();
			});
		});
	});
});
