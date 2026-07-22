import { isSubMinuteCron, toCronExpression, triggerTimeToCron } from '../src/cron';
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

	describe('triggerTimeToCron', () => {
		const SEED = 'wf-1:node-1';

		test('seeds the seconds field deterministically from the seed', () => {
			const a = triggerTimeToCron({ mode: 'everyMinute' }, SEED);
			const b = triggerTimeToCron({ mode: 'everyMinute' }, SEED);
			// Same seed -> identical cron (so a durable job's identity is stable across
			// re-activation), unlike toCronExpression's per-call random second.
			expect(a.expression).toBe(b.expression);
			expect(a.expression).toMatch(/^[0-9]{1,2} \* \* \* \* \*$/);
			// A different node seeds a different second, preserving load-spreading.
			expect(triggerTimeToCron({ mode: 'everyMinute' }, 'wf-1:node-2').expression).not.toBe(
				a.expression,
			);
		});

		test('tags everyMinute as a minute cadence of size 1', () => {
			expect(triggerTimeToCron({ mode: 'everyMinute' }, SEED).source).toEqual({
				field: 'minutes',
				size: 1,
			});
		});

		test('tags everyX[minutes] as a minute cadence of its size', () => {
			const cron = triggerTimeToCron({ mode: 'everyX', unit: 'minutes', value: 5 }, SEED);
			expect(cron.expression).toMatch(/^[0-9]{1,2} \*\/5 \* \* \* \*$/);
			expect(cron.source).toEqual({ field: 'minutes', size: 5 });
		});

		test('gives everyX[hours>=2] an activated hours recurrence, firing every hour', () => {
			const cron = triggerTimeToCron({ mode: 'everyX', unit: 'hours', value: 3 }, SEED);
			expect(cron.expression).toMatch(/^[0-9]{1,2} [0-9]{1,2} \* \* \* \*$/);
			expect(cron.source).toEqual({ field: 'hours', size: 3 });
			expect(cron.recurrence).toEqual({
				activated: true,
				index: 0,
				intervalSize: 3,
				typeInterval: 'hours',
			});
		});

		test('leaves everyX[hours=1] without a recurrence', () => {
			const cron = triggerTimeToCron({ mode: 'everyX', unit: 'hours', value: 1 }, SEED);
			expect(cron.recurrence).toEqual({ activated: false });
		});

		test('maps calendar cadences to their cron fields', () => {
			expect(triggerTimeToCron({ mode: 'everyHour', minute: 11 }, SEED).expression).toMatch(
				/^[0-9]{1,2} 11 \* \* \* \*$/,
			);
			expect(
				triggerTimeToCron({ mode: 'everyDay', hour: 13, minute: 17 }, SEED).expression,
			).toMatch(/^[0-9]{1,2} 17 13 \* \* \*$/);
			expect(
				triggerTimeToCron({ mode: 'everyWeek', hour: 13, minute: 17, weekday: 4 }, SEED).expression,
			).toMatch(/^[0-9]{1,2} 17 13 \* \* 4$/);
			expect(
				triggerTimeToCron({ mode: 'everyMonth', hour: 13, minute: 17, dayOfMonth: 12 }, SEED)
					.expression,
			).toMatch(/^[0-9]{1,2} 17 13 12 \* \*$/);
		});

		test('passes a 6-field custom cron through untouched', () => {
			const cron = triggerTimeToCron(
				{ mode: 'custom', cronExpression: '0 0 9 * * *' as CronExpression },
				SEED,
			);
			expect(cron.expression).toBe('0 0 9 * * *');
			expect(cron.source).toEqual({ field: 'cronExpression' });
		});

		test('widens a 5-field custom cron to 6 fields', () => {
			const cron = triggerTimeToCron(
				{ mode: 'custom', cronExpression: '*/5 * * * *' as CronExpression },
				SEED,
			);
			expect(cron.expression).toBe('0 */5 * * * *');
		});
	});

	describe('isSubMinuteCron', () => {
		test.each([
			['* * * * * *', true],
			['*/30 * * * * *', true],
			['0 * * * * *', false],
			['30 * * * * *', false],
			// 5-field standard crons are minute-granular, so never sub-minute.
			['* * * * *', false],
			// Tolerates surrounding and repeated whitespace.
			['  */5  * * * * *  ', true],
			// Known limitation: a seconds range or list (no wildcard) also fires
			// several times a minute, but is NOT flagged. Pinned so the gap is explicit.
			['0-30 * * * * *', false],
			['0,15,30,45 * * * * *', false],
		] as Array<[CronExpression, boolean]>)('is %j -> %s', (expression, expected) => {
			expect(isSubMinuteCron(expression)).toBe(expected);
		});
	});
});
