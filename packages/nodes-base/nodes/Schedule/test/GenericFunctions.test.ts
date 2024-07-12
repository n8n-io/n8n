import { recurrenceCheck, toCronExpression } from '../GenericFunctions';

describe('toCronExpression', () => {
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
		expect(result).toEqual('* */30 * * * *');
	});

	it('should return cron expression for hours interval', () => {
		const result = toCronExpression({
			field: 'hours',
			hoursInterval: 3,
			triggerAtMinute: 22,
		});
		expect(result).toEqual('* 22 */3 * * *');
	});

	it('should return cron expression for days interval', () => {
		const result = toCronExpression({
			field: 'days',
			daysInterval: 4,
			triggerAtMinute: 30,
			triggerAtHour: 12,
		});
		expect(result).toEqual('* 30 12 * * *');
	});

	it('should return cron expression for weeks interval', () => {
		const result = toCronExpression({
			field: 'weeks',
			weeksInterval: 2,
			triggerAtMinute: 0,
			triggerAtHour: 9,
			triggerAtDay: [1, 3, 5],
		});

		expect(result).toEqual('* 0 9 * * 1,3,5');
	});

	it('should return cron expression for months interval', () => {
		const result = toCronExpression({
			field: 'months',
			monthsInterval: 3,
			triggerAtMinute: 0,
			triggerAtHour: 0,
			triggerAtDayOfMonth: 1,
		});

		expect(result).toEqual('* 0 0 1 */3 *');
	});
});

describe('recurrenceCheck', () => {
	describe('recurrenceCheck', () => {
		it('should return true if recurrence rule is in the recurrence rules list', () => {
			const result = recurrenceCheck(
				{
					activated: true,
					index: 0,
					intervalSize: 2,
					typeInterval: 'days',
				},
				[],
				'UTC',
			);

			expect(result).toBe(true);
		});

		// it('should return false if recurrence rule is not in the recurrence rules list', () => {
		// 	const recurrence = {
		// 		field: 'weeks',
		// 		weeksInterval: 2,
		// 		triggerAtMinute: 0,
		// 		triggerAtHour: 9,
		// 		triggerAtDay: [1, 3, 5],
		// 	};
		// 	const recurrenceRules = [1, 2, 4, 5];
		// 	const timezone = 'UTC';

		// 	const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

		// 	expect(result).toBe(false);
		// });

		// it('should return false if recurrence rule is empty', () => {
		// 	const recurrence = {};
		// 	const recurrenceRules = [1, 2, 3, 4, 5];
		// 	const timezone = 'UTC';

		// 	const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

		// 	expect(result).toBe(false);
		// });
	});
});
