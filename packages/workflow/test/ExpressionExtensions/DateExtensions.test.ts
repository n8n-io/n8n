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

		test('.toTimeFromNow() should work correctly on a date', () => {
			const JUST_NOW_STRING_RESULT = 'just now';
			expect(evaluate('={{DateTime.now().toTimeFromNow()}}')).toEqual(JUST_NOW_STRING_RESULT);
		});

		test('.beginningOf("week") should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.local(2023, 1, 20).beginningOf("week") }}')).toEqual(
				DateTime.local(2023, 1, 16, { zone: TEST_TIMEZONE }).toJSDate(),
			);
		});

		test('.endOfMonth() should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.local(2023, 1, 16).endOfMonth() }}')).toEqual(
				DateTime.local(2023, 1, 31, 23, 59, 59, 999, { zone: TEST_TIMEZONE }).toJSDate(),
			);
		});

		test('.extract("day") should work correctly on a date', () => {
			expect(evaluate('={{ DateTime.local(2023, 1, 20).extract("day") }}')).toEqual(20);
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
	});
});
