// @vitest-environment jsdom

import { DateTime } from 'luxon';

import { evaluate, getLocalISOString } from './helpers';
import { dateExtensions } from '../../src/extensions/date-extensions';
import { getGlobalState } from '../../src/global-state';

const { defaultTimezone } = getGlobalState();

describe('Data Transformation Functions', () => {
	describe('Date Data Transformation Functions', () => {
		test('.isWeekend() should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.local(2023, 1, 20).isWeekend() }}')).toBe(false);
			expect(evaluate('={{ DateTime.local(2023, 1, 21).isWeekend() }}')).toBe(true);
			expect(evaluate('={{ DateTime.local(2023, 1, 22).isWeekend() }}')).toBe(true);
			expect(evaluate('={{ DateTime.local(2023, 1, 23).isWeekend() }}')).toBe(false);
		});

		describe('.beginningOf', () => {
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
		});

		test('.endOfMonth() should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.local(2023, 1, 16).endOfMonth() }}')).toEqual(
				DateTime.local(2023, 1, 31, 23, 59, 59, 999, { zone: defaultTimezone }),
			);
			expect(evaluate('={{ new Date(2023, 0, 16).endOfMonth() }}')).toEqual(
				DateTime.local(2023, 1, 31, 23, 59, 59, 999, { zone: defaultTimezone }).toJSDate(),
			);
		});

		describe('.extract', () => {
			test('.extract("day") should work correctly on a date', () => {
				expect(evaluate('={{ DateTime.local(2023, 1, 20).extract("day") }}')).toEqual(20);
			});

			test('should extract year from a date', () => {
				expect(evaluate('={{ new Date("2024-03-30T18:49").extract("year") }}')).toEqual(2024);
			});

			test('should extract yearDayNumber from a date', () => {
				expect(evaluate('={{ new Date("2024-03-30T18:49").extract("yearDayNumber") }}')).toEqual(
					90,
				);
			});

			test('should extract month from a date', () => {
				expect(evaluate('={{ new Date("2024-03-30T18:49").extract("month") }}')).toEqual(3);
			});

			test('should extract week from a date', () => {
				expect(evaluate('={{ DateTime.local(2023, 1, 20).extract() }}')).toEqual(3);
				expect(evaluate('={{ DateTime.local(2023, 1, 20).extract("week") }}')).toEqual(3);
			});

			test('should extract day from a date', () => {
				expect(evaluate('={{ DateTime.fromISO("2024-03-30T18:49").extract("day") }}')).toEqual(30);
			});

			test('should extract hour from a date', () => {
				expect(evaluate('={{ DateTime.fromISO("2024-03-30T18:49").extract("hour") }}')).toEqual(18);
			});

			test('should extract minute from a date', () => {
				expect(evaluate('={{ DateTime.fromISO("2024-03-30T18:49").extract("minute") }}')).toEqual(
					49,
				);
			});

			test('should extract second from a date', () => {
				expect(evaluate('={{ DateTime.fromISO("2024-03-30T18:49").extract("second") }}')).toEqual(
					0,
				);
			});

			test('should extract millisecond from a date', () => {
				expect(
					evaluate('={{ DateTime.fromISO("2024-03-30T18:49:00.123Z").extract("millisecond") }}'),
				).toEqual(123);
			});

			test('should return undefined for invalid unit', () => {
				expect(evaluate('={{ DateTime.fromISO("2024-03-30T18:49").extract("invalid") }}')).toBe(
					null,
				);
			});
		});

		describe('.format', () => {
			test('should format date with custom format', () => {
				expect(
					evaluate('={{ DateTime.fromISO("2024-03-30T18:49").format("yyyy LLL dd") }}'),
				).toEqual('2024 Mar 30');
			});

			test('should format date with ISO format', () => {
				expect(
					evaluate('={{ DateTime.fromISO("2024-03-30T18:49").format("yyyy-MM-dd\'T\'HH:mm:ss") }}'),
				).toEqual('2024-03-30T18:49:00');
			});
		});

		test('.toDate() should work on a string', () => {
			const date = new Date(2022, 0, 3);
			expect(evaluate(`={{ "${getLocalISOString(date)}".toDate() }}`)).toEqual(date);
		});

		describe('.inBetween', () => {
			test('should work on string and Date', () => {
				expect(
					evaluate("={{ $now.isBetween('2023-06-23'.toDate(), '2023-06-23') }}"),
				).toBeDefined();
			});

			test('should work on string and DateTime', () => {
				expect(evaluate("={{ $now.isBetween($now, '2023-06-23') }}")).toBeDefined();
			});

			test('should not work for invalid strings', () => {
				expect(evaluate("={{ $now.isBetween($now, 'invalid') }}")).toBeUndefined();
			});

			test('should not work for numbers', () => {
				expect(evaluate('={{ $now.isBetween($now, 1) }}')).toBeUndefined();
			});

			test('should not work for a single argument', () => {
				expect(() => evaluate('={{ $now.isBetween($now) }}')).toThrow();
			});

			test('should not work for a more than two arguments', () => {
				expect(() =>
					evaluate("={{ $now.isBetween($now, '2023-06-23', '2023-09-21'.toDate()) }}"),
				).toThrow();
			});
		});

		describe('.diffTo', () => {
			test('should work with a single unit', () => {
				expect(
					evaluate(
						"={{ '2025-01-01'.toDateTime().diffTo('2024-03-30T18:49:07.234', 'days').floor() }}",
					),
				).toEqual(276);
			});

			test('should work with an array of units', () => {
				expect(
					evaluate(
						"={{ '2025-01-01T00:00:00.000'.toDateTime().diffTo('2024-03-30T18:49:07.234', ['months', 'days']) }}",
					),
				).toEqual({ months: 9, days: 1.2158884953703704 });
			});

			test('should return difference in days', () => {
				expect(
					evaluate(
						'={{ DateTime.fromISO("2024-03-30T18:49:00Z").diffTo("2024-03-25T18:49:00Z", "days") }}',
					),
				).toEqual(5);
			});

			test('should return difference in hours', () => {
				expect(
					evaluate(
						'={{ DateTime.fromISO("2024-03-30T18:49:00Z").diffTo("2024-03-30T12:49:00Z", "hours") }}',
					),
				).toEqual(6);
			});

			test('should return difference in minutes', () => {
				expect(
					evaluate(
						'={{ DateTime.fromISO("2024-03-30T18:49:00Z").diffTo("2024-03-30T18:44:00Z", "minutes") }}',
					),
				).toEqual(5);
			});

			test('should return difference in seconds', () => {
				expect(
					evaluate(
						'={{ DateTime.fromISO("2024-03-30T18:49:00Z").diffTo("2024-03-30T18:48:55Z", "seconds") }}',
					),
				).toEqual(5);
			});

			test('should return difference in milliseconds', () => {
				expect(
					evaluate(
						'={{ DateTime.fromISO("2024-03-30T18:49:00.500Z").diffTo("2024-03-30T18:49:00.000Z", "milliseconds") }}',
					),
				).toEqual(500);
			});

			test('should throw for invalid unit', () => {
				expect(() =>
					evaluate(
						'={{ DateTime.fromISO("2024-03-30T18:49:00Z").diffTo("2024-03-30T18:49:00Z", "invalid") }}',
					),
				).toThrow('Unsupported unit');
			});
		});

		describe('.toDateTime', () => {
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

		describe('.toInt/.toFloat', () => {
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

		describe('.toBoolean', () => {
			test('should return undefined', () => {
				expect(evaluate('={{ new Date("2024-01-01T00:00:00.000Z").toBoolean() }}')).toBeUndefined();
			});

			test('should not have a doc (hidden from autocomplete)', () => {
				expect(dateExtensions.functions.toBoolean.doc).toBeUndefined();
			});
		});

		describe('.isInLast', () => {
			it('should return true if the date is within the last n minutes', () => {
				expect(
					evaluate(
						`={{ new Date("${DateTime.now().minus({ minutes: 5 }).toISO()}").isInLast(10, "minutes") }}`,
					),
				).toBe(true);
			});

			it('should return false if the date is not within the last n minutes', () => {
				expect(
					evaluate(
						`={{ new Date("${DateTime.now().minus({ minutes: 15 }).toISO()}").isInLast(10, "minutes") }}`,
					),
				).toBe(false);
			});

			it('should handle default unit as minutes', () => {
				expect(
					evaluate(
						`={{ new Date("${DateTime.now().minus({ minutes: 5 }).toISO()}").isInLast(10) }}`,
					),
				).toBe(true);
			});
		});

		describe('.minus', () => {
			it('should subtract days from the date', () => {
				expect(evaluate('={{ new Date("2024-03-30T18:49:00Z").minus(7, "days") }}')).toEqual(
					new Date('2024-03-23T18:49:00.000Z'),
				);
			});

			it('should subtract years from the date', () => {
				expect(evaluate('={{ new Date("2024-03-30T18:49:00Z").minus(4, "years") }}')).toEqual(
					new Date('2020-03-30T18:49:00.000Z'),
				);
			});

			it('should handle default unit as milliseconds', () => {
				expect(evaluate('={{ new Date("2024-03-30T18:49:00Z").minus(1000) }}')).toEqual(
					new Date('2024-03-30T18:48:59.000Z'),
				);
			});

			it('should handle DateTime instances', () => {
				expect(
					evaluate('={{ DateTime.fromISO("2024-03-30T18:49:00Z").minus(1, "day").toJSDate() }}'),
				).toEqual(new Date('2024-03-29T18:49:00.000Z'));
			});
		});

		describe('.plus', () => {
			it('should subtract days from the date', () => {
				expect(evaluate('={{ new Date("2024-03-30T18:49:00Z").plus(7, "days") }}')).toEqual(
					new Date('2024-04-06T18:49:00.000Z'),
				);
			});

			it('should subtract years from the date', () => {
				expect(evaluate('={{ new Date("2024-03-30T18:49:00Z").plus(4, "years") }}')).toEqual(
					new Date('2028-03-30T18:49:00.000Z'),
				);
			});

			it('should handle default unit as milliseconds', () => {
				expect(evaluate('={{ new Date("2024-03-30T18:49:00Z").plus(1000) }}')).toEqual(
					new Date('2024-03-30T18:49:01.000Z'),
				);
			});

			it('should handle DateTime instances', () => {
				expect(
					evaluate('={{ DateTime.fromISO("2024-03-30T18:49:00Z").plus(1, "day").toJSDate() }}'),
				).toEqual(new Date('2024-03-31T18:49:00.000Z'));
			});
		});

		describe('.isDst', () => {
			test('should return true for a date in DST', () => {
				expect(evaluate('={{ DateTime.fromISO("2024-06-30T18:49:00Z").isDst() }}')).toBe(true);
			});

			test('should return false for a date not in DST', () => {
				expect(evaluate('={{ DateTime.fromISO("2024-01-30T18:49:00Z").isDst() }}')).toBe(false);
			});
		});
	});
});
