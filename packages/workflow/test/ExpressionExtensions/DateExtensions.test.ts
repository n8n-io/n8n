/**
 * @jest-environment jsdom
 */

import { DateTime } from 'luxon';
import { evaluate, getLocalISOString, TEST_TIMEZONE } from './Helpers';

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
				DateTime.local(2023, 1, 16, { zone: TEST_TIMEZONE }).toJSDate(),
			);
		});

		test('.beginningOf("week") should work correctly on a string', () => {
			const evaluatedDate = evaluate('={{ "2023-01-30".toDate().beginningOf("week") }}');
			const expectedDate = DateTime.local(2023, 1, 23, { zone: TEST_TIMEZONE }).toJSDate();

			if (evaluatedDate && evaluatedDate instanceof Date) {
				expect(evaluatedDate.toDateString()).toEqual(expectedDate.toDateString());
			}
		});

		test('.beginningOf("month") should work correctly on a string', () => {
			const evaluatedDate = evaluate('={{ "2023-06-16".toDate().beginningOf("month") }}');
			const expectedDate = DateTime.local(2023, 6, 1, { zone: TEST_TIMEZONE }).toJSDate();

			if (evaluatedDate && evaluatedDate instanceof Date) {
				expect(evaluatedDate.toDateString()).toEqual(expectedDate.toDateString());
			}
		});

		test('.beginningOf("year") should work correctly on a string', () => {
			const evaluatedDate = evaluate('={{ "2023-01-30".toDate().beginningOf("year") }}');
			const expectedDate = DateTime.local(2023, 1, 1, { zone: TEST_TIMEZONE }).toJSDate();

			if (evaluatedDate && evaluatedDate instanceof Date) {
				expect(evaluatedDate.toDateString()).toEqual(expectedDate.toDateString());
			}
		});

		test('.endOfMonth() should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.local(2023, 1, 16).endOfMonth() }}')).toEqual(
				DateTime.local(2023, 1, 31, 23, 59, 59, 999, { zone: TEST_TIMEZONE }).toJSDate(),
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
	});
});
