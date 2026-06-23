import { createHash } from 'crypto';
import moment from 'moment-timezone';
import { type CronExpression, type INode, NodeOperationError } from 'n8n-workflow';

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
	const lastExecution = recurrence.activated ? recurrenceRules[recurrence.index] : undefined;
	const result = recurrenceCheckAt(recurrence, lastExecution, timezone, new Date());
	if (recurrence.activated && result.shouldRun && result.nextLastValue !== null) {
		recurrenceRules[recurrence.index] = result.nextLastValue;
	}
	return result.shouldRun;
}

export function recurrenceCheckAt(
	recurrence: IRecurrenceRule,
	lastExecution: number | undefined,
	timezone: string,
	referenceDate: Date,
): { shouldRun: boolean; nextLastValue: number | null } {
	if (!recurrence.activated) return { shouldRun: true, nextLastValue: null };

	const intervalSize = recurrence.intervalSize;
	if (!intervalSize) return { shouldRun: false, nextLastValue: null };

	const typeInterval = recurrence.typeInterval;

	const momentTz = moment.tz(referenceDate, timezone);
	if (typeInterval === 'hours') {
		const hour = momentTz.hour();
		if (lastExecution === undefined || (hour - lastExecution + 24) % 24 >= intervalSize) {
			return { shouldRun: true, nextLastValue: hour };
		}
	} else if (typeInterval === 'days') {
		const dayOfYear = momentTz.dayOfYear();
		if (lastExecution === undefined || (dayOfYear - lastExecution + 365) % 365 >= intervalSize) {
			return { shouldRun: true, nextLastValue: dayOfYear };
		}
	} else if (typeInterval === 'weeks') {
		const week = momentTz.week();
		if (
			lastExecution === undefined || // First time executing this rule
			(week - lastExecution + 52) % 52 >= intervalSize || // not first time, but minimum interval has passed
			week === lastExecution // Trigger on multiple days in the same week
		) {
			return { shouldRun: true, nextLastValue: week };
		}
	} else if (typeInterval === 'months') {
		const month = momentTz.month();
		if (lastExecution === undefined || (month - lastExecution + 12) % 12 >= intervalSize) {
			return { shouldRun: true, nextLastValue: month };
		}
	}
	return { shouldRun: false, nextLastValue: lastExecution ?? null };
}

/**
 * Deterministic integer in `[min, max)`, derived from `seed` and `label`.
 *
 * Used to fill in the otherwise-unspecified parts of a cron expression
 * (e.g. the second within a minute) in a way that's stable across
 * instances. Two mains computing the same schedule for the same node
 * therefore produce identical cron expressions, identical fire times,
 * and identical deduplication keys.
 *
 * @param seed - Stable identity of the entity being filled in (e.g.
 *   `${workflowId}:${nodeId}`). The same seed always produces the same
 *   set of values across calls and across instances; different seeds
 *   produce different values, preserving the load-spreading the original
 *   randomization was meant to provide.
 * @param label - Distinguishes multiple values derived from the same
 *   seed (e.g. `'second'` vs `'minute'`) so they don't collide when one
 *   cron expression needs several filler values for the same node.
 */
const stableInt = (seed: string, label: string, min: number, max: number): number => {
	const hash = createHash('sha256').update(`${seed}:${label}`).digest();
	return min + (hash.readUInt32BE(0) % (max - min));
};

export const toCronExpression = (interval: ScheduleInterval, nodeKey: string): CronExpression => {
	if (interval.field === 'cronExpression') return interval.expression;
	if (interval.field === 'seconds') return `*/${interval.secondsInterval} * * * * *`;

	const second = stableInt(nodeKey, 'second', 0, 60);
	if (interval.field === 'minutes') return `${second} */${interval.minutesInterval} * * * *`;

	const minute = interval.triggerAtMinute ?? stableInt(nodeKey, 'minute', 0, 60);
	if (interval.field === 'hours') {
		const hours = interval.hoursInterval;
		if (24 % hours === 0) return `${second} ${minute} */${hours} * * *`;
		// `*/${hours}` fires only at clock hours divisible by ${hours}: for 18 h
		// that is 00:xx and 18:xx — an 18 h gap then a 6 h gap, not a steady
		// 18 h rhythm. Fire every hour; recurrenceCheck enforces elapsed time.
		return `${second} ${minute} * * * *`;
	}

	// Since Cron does not support `*/` for days or weeks, all following expressions trigger more often, but are then filtered by `recurrenceCheck`
	const hour = interval.triggerAtHour ?? stableInt(nodeKey, 'hour', 0, 24);
	if (interval.field === 'days') return `${second} ${minute} ${hour} * * *`;
	if (interval.field === 'weeks') {
		const days = interval.triggerAtDay;
		const daysOfWeek = days.length === 0 ? '*' : days.join(',');
		return `${second} ${minute} ${hour} * * ${daysOfWeek}` as CronExpression;
	}

	// Cap at 29 (exclusive) so jitter yields 1-28: any higher day would silently
	// skip months that don't contain it (e.g. day 30 skips February every year).
	const dayOfMonth = interval.triggerAtDayOfMonth ?? stableInt(nodeKey, 'dayOfMonth', 1, 29);
	return `${second} ${minute} ${hour} ${dayOfMonth} */${interval.monthsInterval} *`;
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
