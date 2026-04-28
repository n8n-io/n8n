import moment from 'moment-timezone';
import type { INode } from 'n8n-workflow';

import {
	intervalToRecurrence,
	recurrenceCheck,
	toCronExpression,
	validateInterval,
} from '../GenericFunctions';
import type { ScheduleInterval } from '../SchedulerInterface';

jest.mock('moment-timezone');
const mockedMoment = jest.mocked(moment);

function mockMomentTz(values: {
	hour?: number;
	dayOfYear?: number;
	week?: number;
	month?: number;
}) {
	const tzObj = {
		hour: () => values.hour ?? 0,
		dayOfYear: () => values.dayOfYear ?? 1,
		week: () => values.week ?? 1,
		month: () => values.month ?? 0,
	};
	(mockedMoment.tz as unknown as jest.Mock).mockReturnValue(tzObj);
}

// Cron expressions are 6 fields: `<sec> <min> <hr> <dom> <mon> <dow>`.
// Fields the user does not explicitly pin (e.g. `triggerAtMinute`) are
// filled in by `stableInt(seed, label, ...)`; every other field comes
// from the input interval.
//
// For `seed = 'test-key'`, `stableInt` produces:
//   second=56, minute=19, hour=14, dayOfMonth=4
const TEST_SEED = 'test-key';

describe('toCronExpression', () => {
	it('should return cron expression for cronExpression field', () => {
		// All fields are user-provided literally — no filler.
		const result = toCronExpression(
			{
				field: 'cronExpression',
				expression: '1 2 3 * * *',
			},
			TEST_SEED,
		);
		expect(result).toEqual('1 2 3 * * *');
	});

	it('should return cron expression for seconds interval', () => {
		// Sub-minute schedules use `*/N`; no filler needed.
		const result = toCronExpression(
			{
				field: 'seconds',
				secondsInterval: 10,
			},
			TEST_SEED,
		);
		expect(result).toEqual('*/10 * * * * *');
	});

	it('should return cron expression for minutes interval', () => {
		// sec=56 is filler; */30 comes from `minutesInterval`.
		const result = toCronExpression(
			{
				field: 'minutes',
				minutesInterval: 30,
			},
			TEST_SEED,
		);
		expect(result).toEqual('56 */30 * * * *');
	});

	it('should return cron expression for hours interval', () => {
		// sec=56 is filler; min=22 from `triggerAtMinute`; */3 from `hoursInterval`.
		const result = toCronExpression(
			{
				field: 'hours',
				hoursInterval: 3,
				triggerAtMinute: 22,
			},
			TEST_SEED,
		);
		expect(result).toEqual('56 22 */3 * * *');

		// No `triggerAtMinute`, so min=19 is also filler.
		const result1 = toCronExpression(
			{
				field: 'hours',
				hoursInterval: 3,
			},
			TEST_SEED,
		);
		expect(result1).toEqual('56 19 */3 * * *');
	});

	it('should return cron expression for days interval', () => {
		// sec=56 is filler; min=30 and hr=10 from `triggerAtMinute`/`triggerAtHour`.
		const result = toCronExpression(
			{
				field: 'days',
				daysInterval: 4,
				triggerAtMinute: 30,
				triggerAtHour: 10,
			},
			TEST_SEED,
		);
		expect(result).toEqual('56 30 10 * * *');

		// Nothing pinned, so sec=56 / min=19 / hr=14 are all filler.
		const result1 = toCronExpression(
			{
				field: 'days',
				daysInterval: 4,
			},
			TEST_SEED,
		);
		expect(result1).toEqual('56 19 14 * * *');
	});

	it('should return cron expression for weeks interval', () => {
		// sec=56 is filler; the rest come from `triggerAtMinute`/`triggerAtHour`/`triggerAtDay`.
		const result = toCronExpression(
			{
				field: 'weeks',
				weeksInterval: 2,
				triggerAtMinute: 0,
				triggerAtHour: 9,
				triggerAtDay: [1, 3, 5],
			},
			TEST_SEED,
		);
		expect(result).toEqual('56 0 9 * * 1,3,5');
		// Only `triggerAtDay` pinned, so sec=56 / min=19 / hr=14 are all filler.
		const result1 = toCronExpression(
			{
				field: 'weeks',
				weeksInterval: 2,
				triggerAtDay: [1, 3, 5],
			},
			TEST_SEED,
		);
		expect(result1).toEqual('56 19 14 * * 1,3,5');
	});

	it('should return cron expression for months interval', () => {
		// sec=56 is filler; min/hr/dom come from triggerAt*.
		const result = toCronExpression(
			{
				field: 'months',
				monthsInterval: 3,
				triggerAtMinute: 0,
				triggerAtHour: 0,
				triggerAtDayOfMonth: 1,
			},
			TEST_SEED,
		);
		expect(result).toEqual('56 0 0 1 */3 *');
		// Nothing pinned, so sec=56 / min=19 / hr=14 / dom=4 are all filler.
		const result1 = toCronExpression(
			{
				field: 'months',
				monthsInterval: 3,
			},
			TEST_SEED,
		);
		expect(result1).toEqual('56 19 14 4 */3 *');
	});
});

describe('validateInterval', () => {
	const mockNode: INode = {
		id: 'test-node',
		name: 'Test Node',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	describe('valid intervals', () => {
		it.each<[string, ScheduleInterval]>([
			['seconds', { field: 'seconds', secondsInterval: 1 }],
			['seconds', { field: 'seconds', secondsInterval: 30 }],
			['seconds', { field: 'seconds', secondsInterval: 59 }],
			['minutes', { field: 'minutes', minutesInterval: 1 }],
			['minutes', { field: 'minutes', minutesInterval: 30 }],
			['minutes', { field: 'minutes', minutesInterval: 59 }],
			['hours', { field: 'hours', hoursInterval: 1 }],
			['hours', { field: 'hours', hoursInterval: 12 }],
			['hours', { field: 'hours', hoursInterval: 23 }],
			['days', { field: 'days', daysInterval: 1 }],
			['days', { field: 'days', daysInterval: 15 }],
			['days', { field: 'days', daysInterval: 31 }],
		])('should not throw error for valid %s interval: %j', (_field, interval) => {
			expect(() => {
				validateInterval(mockNode, 0, interval);
			}).not.toThrow();
		});
	});

	describe('invalid intervals', () => {
		it.each<[string, ScheduleInterval, string]>([
			['seconds', { field: 'seconds', secondsInterval: 0 }, 'Seconds must be in range 1-59'],
			['seconds', { field: 'seconds', secondsInterval: 60 }, 'Seconds must be in range 1-59'],
			['seconds', { field: 'seconds', secondsInterval: -1 }, 'Seconds must be in range 1-59'],
			['seconds', { field: 'seconds', secondsInterval: 100 }, 'Seconds must be in range 1-59'],
			['minutes', { field: 'minutes', minutesInterval: 60 }, 'Minutes must be in range 1-59'],
			['minutes', { field: 'minutes', minutesInterval: 0 }, 'Minutes must be in range 1-59'],
			['minutes', { field: 'minutes', minutesInterval: -1 }, 'Minutes must be in range 1-59'],
			['minutes', { field: 'minutes', minutesInterval: 100 }, 'Minutes must be in range 1-59'],
			['hours', { field: 'hours', hoursInterval: 0 }, 'Hours must be in range 1-23'],
			['hours', { field: 'hours', hoursInterval: 24 }, 'Hours must be in range 1-23'],
			['hours', { field: 'hours', hoursInterval: -1 }, 'Hours must be in range 1-23'],
			['hours', { field: 'hours', hoursInterval: 100 }, 'Hours must be in range 1-23'],
			['days', { field: 'days', daysInterval: 0 }, 'Days must be in range 1-31'],
			['days', { field: 'days', daysInterval: 32 }, 'Days must be in range 1-31'],
			['days', { field: 'days', daysInterval: -1 }, 'Days must be in range 1-31'],
			['days', { field: 'days', daysInterval: 100 }, 'Days must be in range 1-31'],
			['months', { field: 'months', monthsInterval: 0 }, 'Months must be larger than 0'],
		])(
			'should throw error for invalid %s interval: %j',
			(_field, interval, expectedDescription) => {
				try {
					validateInterval(mockNode, 0, interval);
					fail('Expected validateInterval to throw an error');
				} catch (error) {
					expect(error.message).toBe('Invalid interval');
					expect(error.description).toBe(expectedDescription);
				}
			},
		);
	});
});

describe('recurrenceCheck', () => {
	it('should return true if activated=false', () => {
		const result = recurrenceCheck({ activated: false }, [], 'UTC');
		expect(result).toBe(true);
	});

	it('should return false if intervalSize is falsey', () => {
		mockMomentTz({ dayOfYear: 10 });
		const result = recurrenceCheck(
			{
				activated: true,
				index: 0,
				intervalSize: 0,
				typeInterval: 'days',
			},
			[],
			'UTC',
		);
		expect(result).toBe(false);
	});

	it('should return true on first execution when lastExecution is undefined', () => {
		mockMomentTz({ dayOfYear: 100 });
		const recurrenceRules: number[] = [];
		const result = recurrenceCheck(
			{ activated: true, index: 0, intervalSize: 3, typeInterval: 'days' },
			recurrenceRules,
			'UTC',
		);
		expect(result).toBe(true);
		expect(recurrenceRules[0]).toBe(100);
	});

	it('should not trigger again on the same day', () => {
		mockMomentTz({ dayOfYear: 100 });
		const recurrenceRules: number[] = [];
		recurrenceCheck(
			{ activated: true, index: 0, intervalSize: 2, typeInterval: 'days' },
			recurrenceRules,
			'UTC',
		);
		const result = recurrenceCheck(
			{ activated: true, index: 0, intervalSize: 2, typeInterval: 'days' },
			recurrenceRules,
			'UTC',
		);
		expect(result).toBe(false);
	});

	describe('hours', () => {
		it('should trigger when exactly on time', () => {
			mockMomentTz({ hour: 5 });
			const recurrenceRules = [2]; // lastExecution = hour 2, interval = 3
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'hours' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
			expect(recurrenceRules[0]).toBe(5);
		});

		it('should not trigger before interval has elapsed', () => {
			mockMomentTz({ hour: 4 });
			const recurrenceRules = [2];
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'hours' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(false);
		});

		it('should recover after a missed execution', () => {
			mockMomentTz({ hour: 8 });
			const recurrenceRules = [2]; // missed hour 5, now at hour 8
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'hours' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
			expect(recurrenceRules[0]).toBe(8);
		});

		it('should handle wrap-around (e.g., 23 → 2)', () => {
			mockMomentTz({ hour: 2 });
			const recurrenceRules = [23]; // lastExecution = 23, interval = 3, expected = 2
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'hours' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
		});

		it('should not trigger before interval on wrap-around', () => {
			mockMomentTz({ hour: 0 });
			const recurrenceRules = [23]; // only 1 hour elapsed, need 3
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'hours' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(false);
		});
	});

	describe('days', () => {
		it('should trigger when exactly on time', () => {
			mockMomentTz({ dayOfYear: 24 });
			const recurrenceRules = [21]; // lastExecution = day 21, interval = 3
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'days' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
			expect(recurrenceRules[0]).toBe(24);
		});

		it('should not trigger before interval has elapsed', () => {
			mockMomentTz({ dayOfYear: 23 });
			const recurrenceRules = [21];
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'days' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(false);
		});

		it('should recover after a missed execution', () => {
			mockMomentTz({ dayOfYear: 30 });
			const recurrenceRules = [21]; // missed day 24, now at day 30
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'days' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
			expect(recurrenceRules[0]).toBe(30);
		});

		it('should handle wrap-around at year boundary', () => {
			mockMomentTz({ dayOfYear: 3 });
			const recurrenceRules = [363]; // interval = 5, elapsed = (3-363+365)%365 = 5
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 5, typeInterval: 'days' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
		});

		it('should not trigger before interval on wrap-around', () => {
			mockMomentTz({ dayOfYear: 2 });
			const recurrenceRules = [363]; // elapsed = (2-363+365)%365 = 4, need 5
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 5, typeInterval: 'days' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(false);
		});

		it('should reproduce the exact bug from NODE-4831 (Indeed scenario)', () => {
			// Workflow set to "every 3 days", last fired on day 21, missed day 24
			// Now on day 25 — should fire but currently doesn't
			mockMomentTz({ dayOfYear: 25 });
			const recurrenceRules = [21];
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'days' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
		});
	});

	describe('weeks', () => {
		it('should trigger when exactly on time', () => {
			mockMomentTz({ week: 8 });
			const recurrenceRules = [6]; // lastExecution = week 6, interval = 2
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 2, typeInterval: 'weeks' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
			expect(recurrenceRules[0]).toBe(8);
		});

		it('should not trigger before interval has elapsed', () => {
			mockMomentTz({ week: 7 });
			const recurrenceRules = [6];
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 2, typeInterval: 'weeks' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(false);
		});

		it('should recover after a missed execution', () => {
			mockMomentTz({ week: 10 });
			const recurrenceRules = [6]; // missed week 8, now at week 10
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 2, typeInterval: 'weeks' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
			expect(recurrenceRules[0]).toBe(10);
		});

		it('should allow re-trigger on multiple days in the same week', () => {
			mockMomentTz({ week: 10 });
			const recurrenceRules = [10]; // same week as lastExecution
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 2, typeInterval: 'weeks' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
		});

		it('should handle wrap-around at year boundary', () => {
			mockMomentTz({ week: 2 });
			const recurrenceRules = [50]; // elapsed = (2-50+52)%52 = 4, interval = 3
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'weeks' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
		});
	});

	describe('months', () => {
		it('should trigger when exactly on time', () => {
			mockMomentTz({ month: 5 });
			const recurrenceRules = [2]; // lastExecution = month 2, interval = 3
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'months' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
			expect(recurrenceRules[0]).toBe(5);
		});

		it('should not trigger before interval has elapsed', () => {
			mockMomentTz({ month: 3 });
			const recurrenceRules = [2];
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'months' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(false);
		});

		it('should recover after a missed execution', () => {
			mockMomentTz({ month: 8 });
			const recurrenceRules = [2]; // missed month 5, now at month 8
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'months' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
			expect(recurrenceRules[0]).toBe(8);
		});

		it('should handle wrap-around (e.g., month 10 → month 1)', () => {
			mockMomentTz({ month: 1 });
			const recurrenceRules = [10]; // elapsed = (1-10+12)%12 = 3, interval = 3
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'months' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
		});

		it('should not trigger before interval on wrap-around', () => {
			mockMomentTz({ month: 0 });
			const recurrenceRules = [10]; // elapsed = (0-10+12)%12 = 2, need 3
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'months' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(false);
		});
	});

	describe('schedule change recovery (NODE-4625)', () => {
		it('should recover when interval is changed and lastExecution is stale', () => {
			// Was "every 5 days", changed to "every 3 days". lastExecution=day 21 from old schedule.
			// Now on day 25 — enough time has passed for the new 3-day interval.
			mockMomentTz({ dayOfYear: 25 });
			const recurrenceRules = [21];
			const result = recurrenceCheck(
				{ activated: true, index: 0, intervalSize: 3, typeInterval: 'days' },
				recurrenceRules,
				'UTC',
			);
			expect(result).toBe(true);
			expect(recurrenceRules[0]).toBe(25);
		});
	});
});

describe('intervalToRecurrence', () => {
	it('should return recurrence rule for seconds interval', () => {
		const result = intervalToRecurrence(
			{
				field: 'seconds',
				secondsInterval: 10,
			},
			0,
		);
		expect(result.activated).toBe(false);
	});

	it('should return recurrence rule for minutes interval', () => {
		const result = intervalToRecurrence(
			{
				field: 'minutes',
				minutesInterval: 30,
			},
			1,
		);
		expect(result.activated).toBe(false);
	});

	it('should return recurrence rule for hours interval', () => {
		const result = intervalToRecurrence(
			{
				field: 'hours',
				hoursInterval: 3,
				triggerAtMinute: 22,
			},
			2,
		);
		expect(result).toEqual({
			activated: true,
			index: 2,
			intervalSize: 3,
			typeInterval: 'hours',
		});

		const result1 = intervalToRecurrence(
			{
				field: 'hours',
				hoursInterval: 3,
			},
			3,
		);
		expect(result1).toEqual({
			activated: true,
			index: 3,
			intervalSize: 3,
			typeInterval: 'hours',
		});
	});

	it('should return recurrence rule for days interval', () => {
		const result = intervalToRecurrence(
			{
				field: 'days',
				daysInterval: 4,
				triggerAtMinute: 30,
				triggerAtHour: 10,
			},
			4,
		);
		expect(result).toEqual({
			activated: true,
			index: 4,
			intervalSize: 4,
			typeInterval: 'days',
		});

		const result1 = intervalToRecurrence(
			{
				field: 'days',
				daysInterval: 4,
			},
			5,
		);
		expect(result1).toEqual({
			activated: true,
			index: 5,
			intervalSize: 4,
			typeInterval: 'days',
		});
	});

	it('should return recurrence rule for weeks interval', () => {
		const result = intervalToRecurrence(
			{
				field: 'weeks',
				weeksInterval: 2,
				triggerAtMinute: 0,
				triggerAtHour: 9,
				triggerAtDay: [1, 3, 5],
			},
			6,
		);
		expect(result).toEqual({
			activated: true,
			index: 6,
			intervalSize: 2,
			typeInterval: 'weeks',
		});
	});

	it('should return recurrence rule for months interval', () => {
		const result = intervalToRecurrence(
			{
				field: 'months',
				monthsInterval: 3,
				triggerAtMinute: 0,
				triggerAtHour: 0,
				triggerAtDayOfMonth: 1,
			},
			8,
		);
		expect(result).toEqual({
			activated: true,
			index: 8,
			intervalSize: 3,
			typeInterval: 'months',
		});
	});
});
