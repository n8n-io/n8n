import moment from 'moment-timezone';
import { type CronExpression, type INode, NodeOperationError, randomInt } from 'n8n-workflow';

import type { IRecurrenceRule, ScheduleInterval } from './SchedulerInterface';

export function validateInterval(node: INode, itemIndex: number, interval: ScheduleInterval): void {
	let errorMessage = '';
	if (
		interval.field === 'seconds' &&
		(interval.secondsInterval > 59 || interval.secondsInterval < 1)
	) {
		errorMessage = 'Seconds must be in range 1-59';
	}
	if (
		interval.field === 'minutes' &&
		(interval.minutesInterval > 59 || interval.minutesInterval < 1)
	) {
		errorMessage = 'Minutes must be in range 1-59';
	}
	if (interval.field === 'hours' && (interval.hoursInterval > 23 || interval.hoursInterval < 1)) {
		errorMessage = 'Hours must be in range 1-23';
	}
	if (interval.field === 'days' && (interval.daysInterval > 31 || interval.daysInterval < 1)) {
		errorMessage = 'Days must be in range 1-31';
	}

	if (interval.field === 'weeks') {
		if (interval.weeksInterval < 1) {
			errorMessage = 'Weeks must be larger than 0';
		} else if (interval.triggerAtDay && interval.triggerAtDay.some((day) => day < 0 || day > 6)) {
			errorMessage = 'Days must be in range 0-6';
		}
	}

	if (interval.field === 'months') {
		if (interval.monthsInterval < 1) {
			errorMessage = 'Months must be larger than 0';
		} else if (
			interval.triggerAtDayOfMonth !== undefined &&
			(interval.triggerAtDayOfMonth < 1 || interval.triggerAtDayOfMonth > 31)
		) {
			errorMessage = 'Day of month must be in range 1-31';
		}
	}

	if (interval.field === 'days' || interval.field === 'weeks' || interval.field === 'months') {
		if (
			'triggerAtHour' in interval &&
			interval.triggerAtHour !== undefined &&
			(interval.triggerAtHour < 0 || interval.triggerAtHour > 23)
		) {
			errorMessage = 'Hour must be in range 0-23';
		}
	}

	if (
		interval.field === 'hours' ||
		interval.field === 'days' ||
		interval.field === 'weeks' ||
		interval.field === 'months'
	) {
		if (
			'triggerAtMinute' in interval &&
			interval.triggerAtMinute !== undefined &&
			(interval.triggerAtMinute < 0 || interval.triggerAtMinute > 59)
		) {
			errorMessage = 'Minute must be in range 0-59';
		}
	}

	if (errorMessage) {
		throw new NodeOperationError(node, 'Invalid interval', {
			itemIndex,
			description: errorMessage,
		});
	}
}

export function recurrenceCheck(
	recurrence: IRecurrenceRule,
	recurrenceRules: number[],
	timezone: string,
): boolean {
	if (!recurrence.activated) return true;

	const intervalSize = recurrence.intervalSize;
	if (!intervalSize || intervalSize < 0) return false;

	const index = recurrence.index;
	const typeInterval = recurrence.typeInterval;
	const lastExecution = recurrenceRules[index];

	const momentTz = moment.tz(timezone);
	if (typeInterval === 'hours') {
		const hour = momentTz.hour();
		if (lastExecution === undefined) {
			recurrenceRules[index] = hour;
			return true;
		}
		let diff = hour - lastExecution;
		if (diff < 0) {
			diff += 24;
		}
		if (diff >= intervalSize) {
			recurrenceRules[index] = hour;
			return true;
		}
	} else if (typeInterval === 'days') {
		const dayOfYear = momentTz.dayOfYear();
		if (lastExecution === undefined) {
			recurrenceRules[index] = dayOfYear;
			return true;
		}
		let diff = dayOfYear - lastExecution;
		if (diff < 0) {
			// We wrapped around the year
			const previousYear = momentTz.year() - 1;
			const daysInYear = momentTz.clone().year(previousYear).isLeapYear() ? 366 : 365;
			diff += daysInYear;
		}
		if (diff >= intervalSize) {
			recurrenceRules[index] = dayOfYear;
			return true;
		}
	} else if (typeInterval === 'weeks') {
		const week = momentTz.isoWeek();
		if (lastExecution === undefined) {
			recurrenceRules[index] = week;
			return true;
		}
		let diff = week - lastExecution;
		if (diff < 0) {
			const previousYear = momentTz.isoWeekYear() - 1;
			diff += momentTz.clone().isoWeekYear(previousYear).isoWeeksInYear();
		}

		if (diff >= intervalSize) {
			recurrenceRules[index] = week;
			return true;
		}

		// Allow triggering on multiple days in the same week only if interval is > 1
		if (intervalSize > 1 && week === lastExecution) {
			return true;
		}
	} else if (typeInterval === 'months') {
		const month = momentTz.month();
		if (lastExecution === undefined) {
			recurrenceRules[index] = month;
			return true;
		}
		let diff = month - lastExecution;
		if (diff < 0) {
			diff += 12;
		}
		if (diff >= intervalSize) {
			recurrenceRules[index] = month;
			return true;
		}
	}
	return false;
}

export const toCronExpression = (interval: ScheduleInterval): CronExpression => {
	if (interval.field === 'cronExpression') return interval.expression;
	if (interval.field === 'seconds') return `*/${interval.secondsInterval} * * * * *`;

	const randomSecond = randomInt(0, 60);
	if (interval.field === 'minutes') return `${randomSecond} */${interval.minutesInterval} * * * *`;

	const minute = interval.triggerAtMinute ?? randomInt(0, 60);
	if (interval.field === 'hours')
		return `${randomSecond} ${minute} */${interval.hoursInterval} * * *`;

	// Since Cron does not support `*/` for days or weeks, all following expressions trigger more often, but are then filtered by `recurrenceCheck`
	const hour = interval.triggerAtHour ?? randomInt(0, 24);
	if (interval.field === 'days') return `${randomSecond} ${minute} ${hour} * * *`;
	if (interval.field === 'weeks') {
		const days = interval.triggerAtDay;
		const daysOfWeek = days.length === 0 ? '*' : days.join(',');
		return `${randomSecond} ${minute} ${hour} * * ${daysOfWeek}` as CronExpression;
	}

	const dayOfMonth = interval.triggerAtDayOfMonth ?? randomInt(1, 32);
	return `${randomSecond} ${minute} ${hour} ${dayOfMonth} */${interval.monthsInterval} *`;
};

export function intervalToRecurrence(interval: ScheduleInterval, index: number) {
	let recurrence: IRecurrenceRule = { activated: false };

	if (interval.field === 'hours') {
		const { hoursInterval } = interval;
		if (hoursInterval !== 1) {
			recurrence = {
				activated: true,
				index,
				intervalSize: hoursInterval,
				typeInterval: 'hours',
			};
		}
	}

	if (interval.field === 'days') {
		const { daysInterval } = interval;
		if (daysInterval !== 1) {
			recurrence = {
				activated: true,
				index,
				intervalSize: daysInterval,
				typeInterval: 'days',
			};
		}
	}

	if (interval.field === 'weeks') {
		const { weeksInterval } = interval;
		if (weeksInterval !== 1) {
			recurrence = {
				activated: true,
				index,
				intervalSize: weeksInterval,
				typeInterval: 'weeks',
			};
		}
	}

	if (interval.field === 'months') {
		const { monthsInterval } = interval;
		if (monthsInterval !== 1) {
			recurrence = {
				activated: true,
				index,
				intervalSize: monthsInterval,
				typeInterval: 'months',
			};
		}
	}

	return recurrence;
}
