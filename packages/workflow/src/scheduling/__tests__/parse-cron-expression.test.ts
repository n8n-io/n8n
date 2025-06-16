import { parseCronExpression } from '../parse-cron-expression';
import type { CronExpression } from '../types';

describe('parseCronExpression', () => {
	it('should parse every second expressions', () => {
		const schedule = parseCronExpression('* * * * * *');
		expect(schedule).toEqual({ field: 'seconds', secondsInterval: 1 });

		const schedule2 = parseCronExpression('*/5 * * * * *');
		expect(schedule2).toEqual({ field: 'seconds', secondsInterval: 5 });
	});

	it('should parse every minute expressions', () => {
		const schedule = parseCronExpression('0 * * * * *');
		expect(schedule).toEqual({ field: 'minutes', minutesInterval: 1 });

		const schedule2 = parseCronExpression('30 */15 * * * *');
		expect(schedule2).toEqual({ field: 'minutes', minutesInterval: 15 });
	});

	it('should parse every hour expressions', () => {
		const schedule = parseCronExpression('0 0 * * * *');
		expect(schedule).toEqual({
			field: 'hours',
			hoursInterval: 1,
			triggerAtMinute: [0],
		});

		const schedule2 = parseCronExpression('15 30 */4 * * *');
		expect(schedule2).toEqual({
			field: 'hours',
			hoursInterval: 4,
			triggerAtMinute: [30],
		});
	});

	it('should parse daily expressions', () => {
		const schedule = parseCronExpression('0 0 12 * * *');
		expect(schedule).toEqual({
			field: 'days',
			daysInterval: 1,
			triggerAtHour: [12],
			triggerAtMinute: [0],
		});

		// At 8:30am every day
		const schedule2 = parseCronExpression('0 30 8 * * *');
		expect(schedule2).toEqual({
			field: 'days',
			daysInterval: 1,
			triggerAtHour: [8],
			triggerAtMinute: [30],
		});

		// Midnight every day (common use case)
		const schedule3 = parseCronExpression('0 0 0 * * *');
		expect(schedule3).toEqual({
			field: 'days',
			daysInterval: 1,
			triggerAtHour: [0],
			triggerAtMinute: [0],
		});
	});

	it('should parse weekly expressions', () => {
		// Every Monday at 9am
		const schedule = parseCronExpression('0 0 9 * * 1');
		expect(schedule).toEqual({
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDayOfWeek: [1],
			triggerAtHour: [9],
			triggerAtMinute: [0],
		});

		// Every weekday at 5pm
		const schedule2 = parseCronExpression('0 0 17 * * 1-5');
		expect(schedule2).toEqual({
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDayOfWeek: [1, 2, 3, 4, 5],
			triggerAtHour: [17],
			triggerAtMinute: [0],
		});

		// Every weekend at noon
		const schedule3 = parseCronExpression('0 0 12 * * 0,6');
		expect(schedule3).toEqual({
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDayOfWeek: [0, 6],
			triggerAtHour: [12],
			triggerAtMinute: [0],
		});
	});

	it('should parse monthly expressions', () => {
		// 1st of every month at midnight
		const schedule = parseCronExpression('0 0 0 1 * *');
		expect(schedule).toEqual({
			field: 'months',
			monthsInterval: 1,
			triggerAtDayOfMonth: [1],
			triggerAtHour: [0],
			triggerAtMinute: [0],
		});

		// 15th of every other month at 3pm
		const schedule2 = parseCronExpression('0 0 15 15 */2 *');
		expect(schedule2).toEqual({
			field: 'months',
			monthsInterval: 2,
			triggerAtDayOfMonth: [15],
			triggerAtHour: [15],
			triggerAtMinute: [0],
		});

		// Last day of every quarter at 11:30pm
		// Note: this is approximate as "L" for last day isn't directly supported in our interval model
		const schedule3 = parseCronExpression('0 30 23 28 */3 *');
		expect(schedule3).toEqual({
			field: 'months',
			monthsInterval: 3,
			triggerAtDayOfMonth: [28],
			triggerAtHour: [23],
			triggerAtMinute: [30],
		});
	});

	it('should handle 5-part cron expressions (no seconds)', () => {
		// Common format without seconds field - should assume 0 for seconds
		const schedule = parseCronExpression('30 12 * * *');
		expect(schedule).toEqual({
			field: 'days',
			daysInterval: 1,
			triggerAtHour: [12],
			triggerAtMinute: [30],
		});
	});

	it('should handle complex expressions and presets', () => {
		// @yearly / @annually (midnight on January 1st)
		const schedule = parseCronExpression('0 0 0 1 1 *');
		expect(schedule).toEqual({
			field: 'months',
			monthsInterval: 12, // yearly
			triggerAtDayOfMonth: [1],
			triggerAtHour: [0],
			triggerAtMinute: [0],
		});

		// @daily / @midnight
		const schedule2 = parseCronExpression('0 0 0 * * *');
		expect(schedule2).toEqual({
			field: 'days',
			daysInterval: 1,
			triggerAtHour: [0],
			triggerAtMinute: [0],
		});
	});

	it('should handle unusual but valid cron patterns', () => {
		// Every 5 minutes between 9am-5pm on weekdays
		const schedule = parseCronExpression('0 */5 9-17 * * 1-5');
		// This is a complex pattern that might not map perfectly to our structure,
		// but we should still get a reasonable approximation
		expect(schedule).toEqual({
			field: 'weeks',
			weeksInterval: 1,
			triggerAtHour: [9, 10, 11, 12, 13, 14, 15, 16, 17],
			triggerAtDayOfWeek: [1, 2, 3, 4, 5],
			triggerAtMinute: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
		});

		// Every 30 minutes during work hours (8:00-16:59) on weekdays
		const schedule2 = parseCronExpression('0 0/30 8-16 ? * MON-FRI' as CronExpression);
		// Even with ? wildcards and text day names, we should get a reasonable result
		expect(schedule2).toEqual({
			field: 'weeks',
			triggerAtDayOfWeek: [1, 2, 3, 4, 5],
			triggerAtHour: [8, 9, 10, 11, 12, 13, 14, 15, 16],
			triggerAtMinute: [0],
			weeksInterval: 1,
		});
	});

	it('should throw on invalid or unsupported expressions', () => {
		expect(() => parseCronExpression('invalid' as CronExpression)).toThrow();
		expect(() => parseCronExpression('not really a cron expression' as CronExpression)).toThrow();

		// Should handle extra spaces gracefully
		expect(() => parseCronExpression('0  0  0  *  *  *' as CronExpression)).not.toThrow();
	});

	it('should handle range expressions with steps', () => {
		const schedule = parseCronExpression('0 0 9-17/2 * * *');
		expect(schedule).toEqual({
			field: 'days',
			daysInterval: 1,
			triggerAtHour: [9, 11, 13, 15, 17],
			triggerAtMinute: [0],
		});
	});

	it('should handle multiple specific values', () => {
		const schedule = parseCronExpression('0 0 8,12,17 * * *' as CronExpression);
		expect(schedule).toEqual({
			field: 'days',
			daysInterval: 1,
			triggerAtHour: [8, 12, 17],
			triggerAtMinute: [0],
		});
	});

	it('should handle common preset equivalents', () => {
		// @hourly
		const hourly = parseCronExpression('0 0 * * * *');
		expect(hourly).toEqual({ field: 'hours', hoursInterval: 1, triggerAtMinute: [0] });

		// @daily
		const daily = parseCronExpression('0 0 0 * * *');
		expect(daily).toEqual({
			field: 'days',
			daysInterval: 1,
			triggerAtHour: [0],
			triggerAtMinute: [0],
		});

		// @weekly
		const weekly = parseCronExpression('0 0 0 * * 0');
		expect(weekly).toEqual({
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDayOfWeek: [0],
			triggerAtHour: [0],
			triggerAtMinute: [0],
		});

		// @monthly
		const monthly = parseCronExpression('0 0 0 1 * *');
		expect(monthly).toEqual({
			field: 'months',
			monthsInterval: 1,
			triggerAtDayOfMonth: [1],
			triggerAtHour: [0],
			triggerAtMinute: [0],
		});
	});

	it('should handle business hour patterns', () => {
		const businessStart = parseCronExpression('0 0 9 * * MON-FRI');
		expect(businessStart).toEqual({
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDayOfWeek: [1, 2, 3, 4, 5],
			triggerAtHour: [9],
			triggerAtMinute: [0],
		});

		const specificDays = parseCronExpression('0 30 16 * * MON,WED,FRI');
		expect(specificDays).toEqual({
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDayOfWeek: [1, 3, 5],
			triggerAtHour: [16],
			triggerAtMinute: [30],
		});
	});

	it('should handle edge case values correctly', () => {
		// Minute 59, hour 23, day 31
		const schedule = parseCronExpression('0 59 23 31 * *');
		expect(schedule).toEqual({
			field: 'months',
			monthsInterval: 1,
			triggerAtDayOfMonth: [31],
			triggerAtHour: [23],
			triggerAtMinute: [59],
		});
	});

	it('should handle range expressions with steps for days', () => {
		// Every other hour between 1 and 9
		expect(parseCronExpression('0 0 1-9/2 * * *')).toEqual({
			field: 'days',
			daysInterval: 1,
			triggerAtHour: [1, 3, 5, 7, 9],
			triggerAtMinute: [0],
		});

		// Every other day of the month from 1-15
		expect(parseCronExpression('0 0 12 1-15/2 * *')).toEqual({
			field: 'months',
			monthsInterval: 1,
			triggerAtDayOfMonth: [1, 3, 5, 7, 9, 11, 13, 15],
			triggerAtHour: [12],
			triggerAtMinute: [0],
		});

		// Every other weekday
		expect(parseCronExpression('0 0 12 * * 1-5/2')).toEqual({
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDayOfWeek: [1, 3, 5],
			triggerAtHour: [12],
			triggerAtMinute: [0],
		});
	});

	it('should handle complex time specifications with multiple components', () => {
		// At minutes 15 and 45, of hours 9 and 17, on days 10 and 20
		const schedule = parseCronExpression('0 15,45 9,17 10,20 * *');
		expect(schedule).toEqual({
			field: 'months',
			monthsInterval: 1,
			triggerAtDayOfMonth: [10, 20],
			triggerAtHour: [9, 17],
			triggerAtMinute: [15, 45],
		});
	});

	it('should handle the ? wildcard correctly in different positions', () => {
		// ? in day-of-month position (common in some cron implementations)
		const schedule = parseCronExpression('0 0 12 ? * MON');
		expect(schedule).toEqual({
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDayOfWeek: [1],
			triggerAtHour: [12],
			triggerAtMinute: [0],
		});

		// ? in day-of-week position
		const schedule2 = parseCronExpression('0 0 12 15 * ?');
		expect(schedule2).toEqual({
			field: 'months',
			monthsInterval: 1,
			triggerAtDayOfMonth: [15],
			triggerAtHour: [12],
			triggerAtMinute: [0],
		});
	});

	it('should handle simple ranges without steps', () => {
		const schedule = parseCronExpression('0 0 1-5 * * *');
		expect(schedule).toEqual({
			field: 'days',
			daysInterval: 1,
			triggerAtHour: [1, 2, 3, 4, 5],
			triggerAtMinute: [0],
		});
	});

	it('should handle multiple ranges and lists combined', () => {
		const schedule = parseCronExpression('0 0 8 1-5,20-25 * *');
		expect(schedule).toEqual({
			field: 'months',
			monthsInterval: 1,
			triggerAtDayOfMonth: [1, 2, 3, 4, 5, 20, 21, 22, 23, 24, 25],
			triggerAtHour: [8],
			triggerAtMinute: [0],
		});
	});
});
