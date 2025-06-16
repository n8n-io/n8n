import { parseCronExpression } from './parse-cron-expression';
import type { ScheduleInterval, TriggerTime } from './types';

export const toScheduleInterval = (item: TriggerTime): ScheduleInterval => {
	if (item.mode === 'everyMinute') {
		return { field: 'minutes', minutesInterval: 1 };
	}

	if (item.mode === 'everyHour') {
		return {
			field: 'hours',
			hoursInterval: 1,
			triggerAtMinute: [item.minute],
		};
	}

	if (item.mode === 'everyX') {
		if (item.unit === 'minutes') {
			return { field: 'minutes', minutesInterval: item.value };
		}

		if (item.unit === 'hours') {
			return {
				field: 'hours',
				hoursInterval: item.value,
				triggerAtMinute: [],
			};
		}
	}

	if (item.mode === 'everyDay') {
		return {
			field: 'days',
			daysInterval: 1,
			triggerAtHour: [item.hour],
			triggerAtMinute: [item.minute],
		};
	}

	if (item.mode === 'everyWeek') {
		return {
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDayOfWeek: [item.weekday],
			triggerAtHour: [item.hour],
			triggerAtMinute: [item.minute],
		};
	}

	if (item.mode === 'everyMonth') {
		return {
			field: 'months',
			monthsInterval: 1,
			triggerAtDayOfMonth: [item.dayOfMonth],
			triggerAtHour: [item.hour],
			triggerAtMinute: [item.minute],
		};
	}

	return parseCronExpression(item.cronExpression);
};
