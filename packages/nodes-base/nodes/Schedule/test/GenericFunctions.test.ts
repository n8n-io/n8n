import { toCronExpression } from '../GenericFunctions';
import * as n8nWorkflow from 'n8n-workflow';

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
