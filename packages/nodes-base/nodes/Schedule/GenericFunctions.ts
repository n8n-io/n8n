import type { IDataObject } from 'n8n-workflow';
import type { IRecurencyRule } from './SchedulerInterface';
import moment from 'moment';

export function recurencyCheck(
	recurrency: IRecurencyRule,
	recurrencyRules: number[],
	timezone: string,
): boolean {
	const recurrencyRuleIndex = recurrency.index;
	const intervalSize = recurrency.intervalSize;
	const typeInterval = recurrency.typeInterval;

	const lastExecution =
		recurrencyRuleIndex !== undefined ? recurrencyRules[recurrencyRuleIndex] : undefined;

	if (
		intervalSize &&
		recurrencyRuleIndex !== undefined &&
		(typeInterval === 'weeks' || typeInterval === 'undefined')
	) {
		if (
			lastExecution === undefined || // First time executing this rule
			moment.tz(timezone).week() === (intervalSize + lastExecution) % 52 || // not first time, but minimum interval has passed
			moment.tz(timezone).week() === lastExecution // Trigger on multiple days in the same week
		) {
			recurrencyRules[recurrencyRuleIndex] = moment.tz(timezone).week();
			return true;
		}
	} else if (intervalSize && recurrencyRuleIndex !== undefined && typeInterval === 'days') {
		if (
			lastExecution === undefined ||
			moment.tz(timezone).dayOfYear() === (intervalSize + lastExecution) % 365
		) {
			recurrencyRules[recurrencyRuleIndex] = moment.tz(timezone).dayOfYear();
			return true;
		}
	} else if (intervalSize && recurrencyRuleIndex !== undefined && typeInterval === 'hours') {
		if (
			lastExecution === undefined ||
			moment.tz(timezone).hour() === (intervalSize + lastExecution) % 24
		) {
			recurrencyRules[recurrencyRuleIndex] = moment.tz(timezone).hour();
			return true;
		}
	} else if (intervalSize && recurrencyRuleIndex !== undefined && typeInterval === 'months') {
		if (
			lastExecution === undefined ||
			moment.tz(timezone).month() === (intervalSize + lastExecution) % 12
		) {
			recurrencyRules[recurrencyRuleIndex] = moment.tz(timezone).month();
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
