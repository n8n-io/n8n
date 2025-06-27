import { toScheduleInterval } from '../to-schedule-interval';

describe('toScheduleInterval', () => {
	test('should convert `everyMinute` triggers to schedule interval', () => {
		const interval = toScheduleInterval({
			mode: 'everyMinute',
		});
		expect(interval).toEqual({
			field: 'minutes',
			minutesInterval: 1,
		});
	});

	test('should convert `everyHour` triggers to schedule interval', () => {
		const interval = toScheduleInterval({
			mode: 'everyHour',
			minute: 11,
		});
		expect(interval).toEqual({
			field: 'hours',
			hoursInterval: 1,
			triggerAtMinute: [11],
		});
	});

	test('should convert `everyX[minutes]` triggers to schedule interval', () => {
		const interval = toScheduleInterval({
			mode: 'everyX',
			unit: 'minutes',
			value: 42,
		});
		expect(interval).toEqual({
			field: 'minutes',
			minutesInterval: 42,
		});
	});

	test('should convert `everyX[hours]` triggers to schedule interval', () => {
		const interval = toScheduleInterval({
			mode: 'everyX',
			unit: 'hours',
			value: 3,
		});
		expect(interval).toEqual({
			field: 'hours',
			hoursInterval: 3,
			triggerAtMinute: [],
		});
	});

	test('should convert `everyDay` triggers to schedule interval', () => {
		const interval = toScheduleInterval({
			mode: 'everyDay',
			hour: 13,
			minute: 17,
		});
		expect(interval).toEqual({
			field: 'days',
			daysInterval: 1,
			triggerAtHour: [13],
			triggerAtMinute: [17],
		});
	});

	test('should convert `everyWeek` triggers to schedule interval', () => {
		const interval = toScheduleInterval({
			mode: 'everyWeek',
			hour: 13,
			minute: 17,
			weekday: 4,
		});
		expect(interval).toEqual({
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDayOfWeek: [4],
			triggerAtHour: [13],
			triggerAtMinute: [17],
		});
	});

	test('should convert `everyMonth` triggers to schedule interval', () => {
		const interval = toScheduleInterval({
			mode: 'everyMonth',
			hour: 13,
			minute: 17,
			dayOfMonth: 12,
		});
		expect(interval).toEqual({
			field: 'months',
			monthsInterval: 1,
			triggerAtDayOfMonth: [12],
			triggerAtHour: [13],
			triggerAtMinute: [17],
		});
	});

	test('should handle custom cron expressions', () => {
		const interval = toScheduleInterval({
			mode: 'custom',
			cronExpression: '0 15 9-17 * * 1-5',
		});
		expect(interval).toEqual({
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDayOfWeek: [1, 2, 3, 4, 5],
			triggerAtHour: [9, 10, 11, 12, 13, 14, 15, 16, 17],
			triggerAtMinute: [15],
		});
	});
});
