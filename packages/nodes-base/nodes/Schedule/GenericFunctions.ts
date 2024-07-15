import moment from 'moment-timezone';
import { type CronExpression, randomInt } from 'n8n-workflow';
import type { IRecurrenceRule, ScheduleInterval } from './SchedulerInterface';

export function recurrenceCheck(
	recurrence: IRecurrenceRule & { activated: true },
	recurrenceRules: number[],
	timezone: string,
): boolean {
	const momentTz = moment.tz(timezone);
	const recurrenceRuleIndex = recurrence.index;
	const intervalSize = recurrence.intervalSize;
	const typeInterval = recurrence.typeInterval;
	if (!intervalSize) return false;

	const lastExecution =
		recurrenceRuleIndex !== undefined ? recurrenceRules[recurrenceRuleIndex] : undefined;

	if (recurrenceRuleIndex !== undefined && typeInterval === 'weeks') {
		const week = momentTz.week();
		if (
			lastExecution === undefined || // First time executing this rule
			week === (intervalSize + lastExecution) % 52 || // not first time, but minimum interval has passed
			week === lastExecution // Trigger on multiple days in the same week
		) {
			recurrenceRules[recurrenceRuleIndex] = week;
			return true;
		}
	} else if (recurrenceRuleIndex !== undefined && typeInterval === 'days') {
		const dayOfYear = momentTz.dayOfYear();
		if (lastExecution === undefined || dayOfYear === (intervalSize + lastExecution) % 365) {
			recurrenceRules[recurrenceRuleIndex] = dayOfYear;
			return true;
		}
	} else if (recurrenceRuleIndex !== undefined && typeInterval === 'hours') {
		const hour = momentTz.hour();
		if (lastExecution === undefined || hour === (intervalSize + lastExecution) % 24) {
			recurrenceRules[recurrenceRuleIndex] = hour;
			return true;
		}
	} else if (recurrenceRuleIndex !== undefined && typeInterval === 'months') {
		const month = momentTz.month();
		if (lastExecution === undefined || month === (intervalSize + lastExecution) % 12) {
			recurrenceRules[recurrenceRuleIndex] = month;
			return true;
		}
	} else {
		return true;
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
		return `${randomSecond} ${minute} ${hour} * * ${daysOfWeek}`;
	}

	const dayOfMonth = interval.triggerAtDayOfMonth ?? randomInt(0, 31);
	return `${randomSecond} ${minute} ${hour} ${dayOfMonth} */${interval.monthsInterval} *`;
};
