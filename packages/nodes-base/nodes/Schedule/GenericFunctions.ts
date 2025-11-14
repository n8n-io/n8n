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

	if (interval.field === 'months' && interval.monthsInterval < 1) {
		errorMessage = 'Months must be larger than 0';
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
	if (!intervalSize) return false;

	const index = recurrence.index;
	const typeInterval = recurrence.typeInterval;
	const lastExecution = recurrenceRules[index];

	const momentTz = moment.tz(timezone);
	if (typeInterval === 'hours') {
		const hour = momentTz.hour();
		if (lastExecution === undefined || hour === (intervalSize + lastExecution) % 24) {
			recurrenceRules[index] = hour;
			return true;
		}
	} else if (typeInterval === 'days') {
		const dayOfYear = momentTz.dayOfYear();
		if (lastExecution === undefined || dayOfYear === (intervalSize + lastExecution) % 365) {
			recurrenceRules[index] = dayOfYear;
			return true;
		}
	} else if (typeInterval === 'weeks') {
		const week = momentTz.week();
		if (
			lastExecution === undefined || // First time executing this rule
			week === (intervalSize + lastExecution) % 52 || // not first time, but minimum interval has passed
			week === lastExecution // Trigger on multiple days in the same week
		) {
			recurrenceRules[index] = week;
			return true;
		}
	} else if (typeInterval === 'months') {
		const month = momentTz.month();
		if (lastExecution === undefined || month === (intervalSize + lastExecution) % 12) {
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

	const dayOfMonth = interval.triggerAtDayOfMonth ?? randomInt(0, 31);
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
