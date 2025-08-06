import * as n8nWorkflow from 'n8n-workflow';

import { intervalToRecurrence, recurrenceCheck, toCronExpression } from '../GenericFunctions';
import type { IRecurrenceRule } from '../SchedulerInterface';

describe('toCronExpression', () => {
	Object.defineProperty(n8nWorkflow, 'randomInt', {
		value: (min: number, max: number) => Math.floor((min + max) / 2),
	});

	it('should return cron expression for cronExpression field', () => {
		const result = toCronExpression({
			field: 'cronExpression',
			expression: '1 2 3 * * *',
		});
		expect(result).toEqual('1 2 3 * * *');
	});

	it('should return cron expression for seconds interval', () => {
		const result = toCronExpression({
			field: 'seconds',
			secondsInterval: 10,
		});
		expect(result).toEqual('*/10 * * * * *');
	});

	it('should return cron expression for minutes interval', () => {
		const result = toCronExpression({
			field: 'minutes',
			minutesInterval: 30,
		});
		expect(result).toEqual('30 */30 * * * *');
	});

	it('should return cron expression for hours interval', () => {
		const result = toCronExpression({
			field: 'hours',
			hoursInterval: 3,
			triggerAtMinute: 22,
		});
		expect(result).toEqual('30 22 */3 * * *');

		const result1 = toCronExpression({
			field: 'hours',
			hoursInterval: 3,
		});
		expect(result1).toEqual('30 30 */3 * * *');
	});

	it('should return cron expression for days interval', () => {
		const result = toCronExpression({
			field: 'days',
			daysInterval: 4,
			triggerAtMinute: 30,
			triggerAtHour: 10,
		});
		expect(result).toEqual('30 30 10 * * *');

		const result1 = toCronExpression({
			field: 'days',
			daysInterval: 4,
		});
		expect(result1).toEqual('30 30 12 * * *');
	});

	it('should return cron expression for weeks interval', () => {
		const result = toCronExpression({
			field: 'weeks',
			weeksInterval: 2,
			triggerAtMinute: 0,
			triggerAtHour: 9,
			triggerAtDay: [1, 3, 5],
		});
		expect(result).toEqual('30 0 9 * * 1,3,5');
		const result1 = toCronExpression({
			field: 'weeks',
			weeksInterval: 2,
			triggerAtDay: [1, 3, 5],
		});
		expect(result1).toEqual('30 30 12 * * 1,3,5');
	});

	it('should return cron expression for months interval', () => {
		const result = toCronExpression({
			field: 'months',
			monthsInterval: 3,
			triggerAtMinute: 0,
			triggerAtHour: 0,
			triggerAtDayOfMonth: 1,
		});
		expect(result).toEqual('30 0 0 1 */3 *');
		const result1 = toCronExpression({
			field: 'months',
			monthsInterval: 3,
		});
		expect(result1).toEqual('30 30 12 15 */3 *');
	});
});

describe('recurrenceCheck', () => {
	it('should return true if activated=false', () => {
		const result = recurrenceCheck({ activated: false }, [], 'UTC');
		expect(result).toBe(true);
	});

	it('should return false if intervalSize is falsey', () => {
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

	it('should return true only once for a day cron', () => {
		const recurrence: IRecurrenceRule = {
			activated: true,
			index: 0,
			intervalSize: 2,
			typeInterval: 'days',
		};
		const recurrenceRules: number[] = [];
		const result1 = recurrenceCheck(recurrence, recurrenceRules, 'UTC');
		expect(result1).toBe(true);
		const result2 = recurrenceCheck(recurrence, recurrenceRules, 'UTC');
		expect(result2).toBe(false);
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
