import type { IDataObject } from 'n8n-workflow';
import moment from 'moment-timezone';
import type { IRecurrenceRule } from './SchedulerInterface';

export function recurrenceCheck(
	recurrence: IRecurrenceRule,
	recurrenceRules: number[],
	timezone: string,
): boolean {
	const recurrenceRuleIndex = recurrence.index;
	const intervalSize = recurrence.intervalSize;
	const typeInterval = recurrence.typeInterval;

	const lastExecution =
		recurrenceRuleIndex !== undefined ? recurrenceRules[recurrenceRuleIndex] : undefined;

	if (
		intervalSize &&
		recurrenceRuleIndex !== undefined &&
		(typeInterval === 'weeks' || typeInterval === 'undefined')
	) {
		if (
			lastExecution === undefined || // First time executing this rule
			moment.tz(timezone).week() === (intervalSize + lastExecution) % 52 || // not first time, but minimum interval has passed
			moment.tz(timezone).week() === lastExecution // Trigger on multiple days in the same week
		) {
			recurrenceRules[recurrenceRuleIndex] = moment.tz(timezone).week();
			return true;
		}
	} else if (intervalSize && recurrenceRuleIndex !== undefined && typeInterval === 'days') {
		if (
			lastExecution === undefined ||
			moment.tz(timezone).dayOfYear() === (intervalSize + lastExecution) % 365
		) {
			recurrenceRules[recurrenceRuleIndex] = moment.tz(timezone).dayOfYear();
			return true;
		}
	} else if (intervalSize && recurrenceRuleIndex !== undefined && typeInterval === 'hours') {
		if (
			lastExecution === undefined ||
			moment.tz(timezone).hour() === (intervalSize + lastExecution) % 24
		) {
			recurrenceRules[recurrenceRuleIndex] = moment.tz(timezone).hour();
			return true;
		}
	} else if (intervalSize && recurrenceRuleIndex !== undefined && typeInterval === 'months') {
		if (
			lastExecution === undefined ||
			moment.tz(timezone).month() === (intervalSize + lastExecution) % 12
		) {
			recurrenceRules[recurrenceRuleIndex] = moment.tz(timezone).month();
			return true;
		}
	} else {
		return true;
	}
	return false;
}

export function convertMonthToUnix(expression: string): string {
	if (!isNaN(parseInt(expression)) || expression.includes('-') || expression.includes(',')) {
		let matches = expression.match(/([0-9])+/g) as string[];
		if (matches) {
			matches = matches.map((match) =>
				parseInt(match) !== 0 ? String(parseInt(match) - 1) : match,
			);
		}
		expression = matches?.join(expression.includes('-') ? '-' : ',') || '';
	}
	return expression;
}

export function convertToUnixFormat(interval: IDataObject) {
	const expression = (interval.expression as string).split(' ');
	if (expression.length === 5) {
		expression[3] = convertMonthToUnix(expression[3]);
		expression[4] = expression[4].replace('7', '0');
	} else if (expression.length === 6) {
		expression[4] = convertMonthToUnix(expression[4]);
		expression[5] = expression[5].replace('7', '0');
	}
	interval.expression = expression.join(' ');
}

export const addFallbackValue = <T>(enabled: boolean, fallback: T) => {
	if (enabled) {
		return (value: T) => {
			if (!value) return fallback;
			return value;
		};
	}
	return (value: T) => value;
};
