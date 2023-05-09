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
