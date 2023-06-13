/**
 * @jest-environment jsdom
 */

import { DateTime } from 'luxon';
import { evaluate, getLocalISOString, TEST_TIMEZONE } from './Helpers';
import { ExpressionExtensionError } from '@/ExpressionError';

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
				DateTime.local(2023, 1, 16, { zone: TEST_TIMEZONE }).toISO(),
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
				DateTime.local(2023, 1, 31, 23, 59, 59, 999, { zone: TEST_TIMEZONE }).toISO(),
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

describe('Date extensions on strings parseable as luxon `DateTime`', () => {
	const BASE_DATETIME = '2023-06-12T01:23:45.678';

	const MS_LESS_DATETIME = BASE_DATETIME.split('.').shift();

	if (!MS_LESS_DATETIME) fail();

	const toLuxonIsoDateTime = (
		year: number,
		month: number,
		day: number,
		hour = 0,
		minute = 0,
		second = 0,
		milliseconds = 0,
	) =>
		DateTime.local(year, month, day, hour, minute, second, milliseconds, {
			zone: TEST_TIMEZONE,
		}).toISO();

	test('chain date extensions', () => {
		const actual = evaluate(`={{ "${BASE_DATETIME}Z".plus(5, "days").plus(5, "days") }}`);
		const expected = toLuxonIsoDateTime(2023, 6, 21, 21, 23, 45, 678);

		expect(actual).toEqual(expected);
	});

	test('fail on non-parseable string', () => {
		for (const i of ['2023_06_12', '2023-06-12T', '2023-06-12T01:23:45.']) {
			expect(() => evaluate(`={{ "${i}".plus(5, "days") }}`)).toThrow(ExpressionExtensionError);
		}
	});

	test('allow extended string methods to work', () => {
		const actual = evaluate(`={{ "${BASE_DATETIME}".toTitleCase() }}`);
		const expected = BASE_DATETIME;

		expect(actual).toEqual(expected);
	});

	test('allow native string methods to work', () => {
		const actual = evaluate(`={{ "${BASE_DATETIME}".charAt(0) }}`);
		const expected = '2';

		expect(actual).toEqual(expected);
	});

	describe('parse non-standardized datetime string', () => {
		test('YYYY-MM-DD', () => {
			const actual = evaluate("={{ '2023-06-12'.plus(5, 'days') }}");
			const expected = toLuxonIsoDateTime(2023, 6, 16, 18);

			expect(actual).toEqual(expected);
		});

		test('YYYY.MM.DD', () => {
			const actual = evaluate("={{ '2023.06.12'.plus(5, 'days') }}");
			const expected = toLuxonIsoDateTime(2023, 6, 16, 18);

			expect(actual).toEqual(expected);
		});

		test('YYYY/MM/DD', () => {
			const actual = evaluate("={{ '2023/06/12'.plus(5, 'days') }}");
			const expected = toLuxonIsoDateTime(2023, 6, 16, 18);

			expect(actual).toEqual(expected);
		});

		test('YYYY MM DD', () => {
			const actual = evaluate("={{ '2023 06 12'.plus(5, 'days') }}");
			const expected = toLuxonIsoDateTime(2023, 6, 16, 18);

			expect(actual).toEqual(expected);
		});
	});

	describe('parse ISO-8601 datetime string', () => {
		test('with milliseconds and zero offset', () => {
			const actual = evaluate(`={{ "${BASE_DATETIME}Z".plus(5, "days") }}`);
			const expected = toLuxonIsoDateTime(2023, 6, 16, 21, 23, 45, 678);

			expect(actual).toEqual(expected);
		});

		test('with milliseconds and non-zero offset', () => {
			const actual = evaluate(`={{ "${BASE_DATETIME}+02:00".plus(5, "days") }}`);
			const expected = toLuxonIsoDateTime(2023, 6, 16, 19, 23, 45, 678);

			expect(actual).toEqual(expected);
		});

		test('with milliseconds and no offset', () => {
			const actual = evaluate(`={{ "${BASE_DATETIME}".plus(5, "days") }}`);
			const expected = toLuxonIsoDateTime(2023, 6, 16, 19, 23, 45, 678);

			expect(actual).toEqual(expected);
		});

		test('without milliseconds and zero offset', () => {
			const actual = evaluate(`={{ "${MS_LESS_DATETIME}Z".plus(5, "days") }}`);
			const expected = toLuxonIsoDateTime(2023, 6, 16, 21, 23, 45);

			expect(actual).toEqual(expected);
		});

		test('without milliseconds and non-zero offset', () => {
			const actual = evaluate(`={{ "${MS_LESS_DATETIME}+02:00".plus(5, "days") }}`);
			const expected = toLuxonIsoDateTime(2023, 6, 16, 19, 23, 45);

			expect(actual).toEqual(expected);
		});

		test('without milliseconds and no offset', () => {
			const actual = evaluate(`={{ "${MS_LESS_DATETIME}".plus(5, "days") }}`);
			const expected = toLuxonIsoDateTime(2023, 6, 16, 19, 23, 45);

			expect(actual).toEqual(expected);
		});
	});
});
