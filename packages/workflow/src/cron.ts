import type { Cron, CronExpression } from './interfaces';
import { randomInt, stableInt } from './utils';

interface BaseTriggerTime<T extends string> {
	mode: T;
}

interface CustomTrigger extends BaseTriggerTime<'custom'> {
	cronExpression: CronExpression;
}

interface EveryX<U extends string> extends BaseTriggerTime<'everyX'> {
	unit: U;
	value: number;
}

type EveryMinute = BaseTriggerTime<'everyMinute'>;
type EveryXMinutes = EveryX<'minutes'>;

interface EveryHour extends BaseTriggerTime<'everyHour'> {
	minute: number; // 0 - 59
}
type EveryXHours = EveryX<'hours'>;

interface EveryDay extends BaseTriggerTime<'everyDay'> {
	hour: number; // 0 - 23
	minute: number; // 0 - 59
}

interface EveryWeek extends BaseTriggerTime<'everyWeek'> {
	hour: number; // 0 - 23
	minute: number; // 0 - 59
	weekday: number; // 0 - 6(Sun - Sat)
}

interface EveryMonth extends BaseTriggerTime<'everyMonth'> {
	hour: number; // 0 - 23
	minute: number; // 0 - 59
	dayOfMonth: number; // 1 - 31
}

export type TriggerTime =
	| CustomTrigger
	| EveryMinute
	| EveryXMinutes
	| EveryHour
	| EveryXHours
	| EveryDay
	| EveryWeek
	| EveryMonth;

export const toCronExpression = (item: TriggerTime): CronExpression => {
	const randomSecond = randomInt(60);

	if (item.mode === 'everyMinute') return `${randomSecond} * * * * *`;
	if (item.mode === 'everyHour') return `${randomSecond} ${item.minute} * * * *`;

	if (item.mode === 'everyX') {
		if (item.unit === 'minutes') return `${randomSecond} */${item.value} * * * *`;

		const randomMinute = randomInt(60);
		if (item.unit === 'hours') return `${randomSecond} ${randomMinute} */${item.value} * * *`;
	}
	if (item.mode === 'everyDay') return `${randomSecond} ${item.minute} ${item.hour} * * *`;
	if (item.mode === 'everyWeek')
		return `${randomSecond} ${item.minute} ${item.hour} * * ${item.weekday}`;

	if (item.mode === 'everyMonth')
		return `${randomSecond} ${item.minute} ${item.hour} ${item.dayOfMonth} * *`;

	return item.cronExpression.trim() as CronExpression;
};

/**
 * Map a poll trigger's `pollTimes` entry to a {@link Cron} (expression plus
 * `source`/`recurrence` metadata), the shape the durable registrars feed to
 * `cronToSchedule`. The seconds field is filled deterministically from `seed`
 * (`${workflowId}:${nodeId}`) via {@link stableInt}, so a durable poll job's
 * cron string, and therefore its identity and clock, stay put across
 * re-activation, the same way the Schedule Trigger's do.
 *
 * The durable counterpart to {@link toCronExpression}: that one produces a bare
 * cron string with a random second for the legacy in-memory path, where the
 * second only spreads load and need not be stable.
 */
export function triggerTimeToCron(item: TriggerTime, seed: string): Cron {
	if (item.mode === 'custom') {
		// A 5-field cron (no seconds) is widened to 6 fields with a `0` seconds field:
		// custom pollTimes can be 5-field, which the durable scheduler's validator rejects.
		const trimmed = item.cronExpression.trim();
		const expression = (
			trimmed.split(/\s+/).length === 5 ? `0 ${trimmed}` : trimmed
		) as CronExpression;
		return { expression, source: { field: 'cronExpression' } };
	}

	const second = stableInt(seed, 'second', 0, 60);

	if (item.mode === 'everyMinute') {
		return { expression: `${second} * * * * *`, source: { field: 'minutes', size: 1 } };
	}

	if (item.mode === 'everyX') {
		if (item.unit === 'minutes') {
			return {
				expression: `${second} */${item.value} * * * *`,
				source: { field: 'minutes', size: item.value },
			};
		}
		// Hours fire every hour with the recurrence filtering to every Nth, mirroring
		// the Schedule Trigger: `*/N` in the hours field would drift when N does not
		// divide 24. The minute is filler, so also derived deterministically.
		const minute = stableInt(seed, 'minute', 0, 60);
		return {
			expression: `${second} ${minute} * * * *`,
			source: { field: 'hours', size: item.value },
			recurrence:
				item.value >= 2
					? { activated: true, index: 0, intervalSize: item.value, typeInterval: 'hours' }
					: { activated: false },
		};
	}

	if (item.mode === 'everyHour') {
		return {
			expression: `${second} ${item.minute} * * * *`,
			source: { field: 'hours', size: 1 },
		};
	}

	if (item.mode === 'everyDay') {
		return {
			expression: `${second} ${item.minute} ${item.hour} * * *`,
			source: { field: 'days', size: 1 },
		};
	}

	if (item.mode === 'everyWeek') {
		return {
			expression: `${second} ${item.minute} ${item.hour} * * ${item.weekday}`,
			source: { field: 'weeks', size: 1 },
		};
	}

	// everyMonth
	return {
		expression: `${second} ${item.minute} ${item.hour} ${item.dayOfMonth} * *`,
		source: { field: 'months', size: 1 },
	};
}

/**
 * Whether a cron fires more than once a minute. A 6-field expression includes
 * seconds as its first field, so a wildcard there is sub-minute; 5-field (standard)
 * crons are minute-granular at minimum and never sub-minute.
 */
export const isSubMinuteCron = (expression: CronExpression): boolean => {
	const fields = expression.trim().split(/\s+/);
	return fields.length === 6 && fields[0].includes('*');
};
