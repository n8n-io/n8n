import { isSubMinuteCron, toCronExpression } from '../src/cron';
import type { CronExpression } from '../src/interfaces';

describe('Cron', () => {
	describe('toCronExpression', () => {
		test('should generate a valid cron for `everyMinute` triggers', () => {
			const expression = toCronExpression({
				mode: 'everyMinute',
			});
			expect(expression).toMatch(/^[1-5]?[0-9] \* \* \* \* \*$/);
		});

		test('should generate a valid cron for `everyHour` triggers', () => {
			const expression = toCronExpression({
				mode: 'everyHour',
				minute: 11,
			});
			expect(expression).toMatch(/^[1-5]?[0-9] 11 \* \* \* \*$/);
		});

		test('should generate a valid cron for `everyX[minutes]` triggers', () => {
			const expression = toCronExpression({
				mode: 'everyX',
				unit: 'minutes',
				value: 42,
			});
			expect(expression).toMatch(/^[1-5]?[0-9] \*\/42 \* \* \* \*$/);
		});

		test('should generate a valid cron for `everyX[hours]` triggers', () => {
			const expression = toCronExpression({
				mode: 'everyX',
				unit: 'hours',
				value: 3,
			});
			expect(expression).toMatch(/^[1-5]?[0-9] [1-5]?[0-9] \*\/3 \* \* \*$/);
		});

		test('should generate a valid cron for `everyDay` triggers', () => {
			const expression = toCronExpression({
				mode: 'everyDay',
				hour: 13,
				minute: 17,
			});
			expect(expression).toMatch(/^[1-5]?[0-9] 17 13 \* \* \*$/);
		});

		test('should generate a valid cron for `everyWeek` triggers', () => {
			const expression = toCronExpression({
				mode: 'everyWeek',
				hour: 13,
				minute: 17,
				weekday: 4,
			});
			expect(expression).toMatch(/^[1-5]?[0-9] 17 13 \* \* 4$/);
		});

		test('should generate a valid cron for `everyMonth` triggers', () => {
			const expression = toCronExpression({
				mode: 'everyMonth',
				hour: 13,
				minute: 17,
				dayOfMonth: 12,
			});
			expect(expression).toMatch(/^[1-5]?[0-9] 17 13 12 \* \*$/);
		});

		test('should trim custom cron expressions', () => {
			const expression = toCronExpression({
				mode: 'custom',
				cronExpression: ' 0 9-17 * * * ' as CronExpression,
			});
			expect(expression).toEqual('0 9-17 * * *');
		});
	});

	describe('isSubMinuteCron', () => {
		test.each([
			['* * * * * *', true],
			['*/30 * * * * *', true],
			// A step without a wildcard is still sub-minute (`0/15` == `*/15`).
			['0/15 * * * * *', true],
			// A range or list in the seconds field fires several times a minute.
			['0-30 * * * * *', true],
			['0,30 * * * * *', true],
			['0 * * * * *', false],
			['30 * * * * *', false],
			// A fixed seconds field with other fields set is still minute-granular.
			['30 15 * * * *', false],
			// 5-field standard crons are minute-granular, so never sub-minute.
			['* * * * *', false],
			// Tolerates surrounding and repeated whitespace.
			['  */5  * * * * *  ', true],
		] as Array<[CronExpression, boolean]>)('returns %s for %j', (expression, expected) => {
			expect(isSubMinuteCron(expression)).toBe(expected);
		});
	});
});
