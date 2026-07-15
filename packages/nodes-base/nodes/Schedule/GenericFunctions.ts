import { createHash } from 'crypto';
import moment from 'moment-timezone';
import { type CronExpression, type CronSource, type INode, NodeOperationError } from 'n8n-workflow';

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
	recurrenceRules: Array<number | undefined | null>,
	timezone: string,
): boolean {
	if (!recurrence.activated) return true;

	const intervalSize = recurrence.intervalSize;
	if (!intervalSize) return false;

	const index = recurrence.index;
	const typeInterval = recurrence.typeInterval;
	// A reset slot reads back as null once persisted (JSON turns undefined into null);
	// treat both as "no prior run".
	const lastExecution = recurrenceRules[index] ?? undefined;

	const momentTz = moment.tz(timezone);
	if (typeInterval === 'hours') {
		const hour = momentTz.hour();
		if (lastExecution === undefined || (hour - lastExecution + 24) % 24 >= intervalSize) {
			recurrenceRules[index] = hour;
			return true;
		}
	} else if (typeInterval === 'days') {
		const dayOfYear = momentTz.dayOfYear();
		if (lastExecution === undefined || (dayOfYear - lastExecution + 365) % 365 >= intervalSize) {
			recurrenceRules[index] = dayOfYear;
			return true;
		}
	} else if (typeInterval === 'weeks') {
		const week = momentTz.week();
		if (
			lastExecution === undefined || // First time executing this rule
			(week - lastExecution + 52) % 52 >= intervalSize || // not first time, but minimum interval has passed
			week === lastExecution // Trigger on multiple days in the same week
		) {
			recurrenceRules[index] = week;
			return true;
		}
	} else if (typeInterval === 'months') {
		// Absolute month count (not the 0-11 index other branches use) so it stays
		// monotonic and `intervalSize >= 12` works, which `% 12` could never reach.
		const absoluteMonth = momentTz.year() * 12 + momentTz.month();
		if (lastExecution === undefined || absoluteMonth - lastExecution >= intervalSize) {
			recurrenceRules[index] = absoluteMonth;
			return true;
		}
	}
	return false;
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
	const months = interval.monthsInterval;
	if (12 % months === 0) return `${second} ${minute} ${hour} ${dayOfMonth} */${months} *`;
	// `*/${months}` only spaces evenly when months divides 12; otherwise fire every month
	// and let recurrenceCheck enforce the gap (mirrors the hours handling above).
	return `${second} ${minute} ${hour} ${dayOfMonth} * *`;
};

/**
 * Records which Schedule Trigger field the rule came from, plus its interval
 * size. The cron string alone can't tell "every 30 seconds" apart from a raw
 * cron of the same shape, so downstream code keeps this to recover which one
 * the user actually picked.
 */
export const toCronSource = (interval: ScheduleInterval): CronSource => {
	switch (interval.field) {
		case 'seconds':
			return { field: 'seconds', size: interval.secondsInterval };
		case 'minutes':
			return { field: 'minutes', size: interval.minutesInterval };
		case 'hours':
			return { field: 'hours', size: interval.hoursInterval };
		case 'days':
			return { field: 'days', size: interval.daysInterval };
		case 'weeks':
			return { field: 'weeks', size: interval.weeksInterval };
		case 'months':
			return { field: 'months', size: interval.monthsInterval };
		case 'cronExpression':
			return { field: 'cronExpression' };
	}
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

/**
 * Whether a stored last-execution value can still be read meaningfully under
 * the current interval type. `recurrenceCheck`'s `(now - last + base) % base`
 * always converges for an in-range value, so only out-of-range values block the
 * trigger forever. `months` switched to an absolute count this release, so any
 * pre-signature value is the old 0-11 encoding and must be discarded.
 */
function isRecurrenceValueValidForType(
	typeInterval: 'hours' | 'days' | 'weeks' | 'months',
	value: number,
): boolean {
	switch (typeInterval) {
		case 'hours':
			return value >= 0 && value <= 23;
		case 'days':
			return value >= 1 && value <= 366;
		case 'weeks':
			return value >= 1 && value <= 53;
		case 'months':
			return false;
	}
}

/**
 * Clears stored recurrence state when a schedule is edited, keyed by a per-index
 * `type:size` signature. A stale or wrong-unit value from a previous config would
 * otherwise permanently block the trigger.
 *
 * A missing signature means pre-upgrade state: the schedule config itself hasn't
 * changed, so a value still in range for its type is healthy and kept (only the
 * signature is backfilled) to avoid an off-cadence fire on upgrade. Only an
 * out-of-range value — the case that actually blocks the trigger — is cleared.
 */
export function resetStaleRecurrence(
	staticData: {
		recurrenceRules: Array<number | undefined>;
		recurrenceRuleSignatures: Array<string | undefined>;
	},
	rules: Array<{ recurrence: IRecurrenceRule }>,
): void {
	rules.forEach(({ recurrence }, index) => {
		const signature = recurrence.activated
			? `${recurrence.typeInterval}:${recurrence.intervalSize}`
			: undefined;
		const storedSignature = staticData.recurrenceRuleSignatures[index];

		if (storedSignature === signature) return;

		const storedValue = staticData.recurrenceRules[index];
		// On upgrade (no signature yet) keep a value that's still valid for its
		// type; an explicit config change (signature present but different) always clears.
		const keepValue =
			storedSignature === undefined &&
			recurrence.activated &&
			typeof storedValue === 'number' &&
			isRecurrenceValueValidForType(recurrence.typeInterval, storedValue);

		if (!keepValue) staticData.recurrenceRules[index] = undefined;
		staticData.recurrenceRuleSignatures[index] = signature;
	});

	// Drop entries left by a previous config with more intervals.
	staticData.recurrenceRules.length = rules.length;
	staticData.recurrenceRuleSignatures.length = rules.length;
}
