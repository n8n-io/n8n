import { IRecurencyRule, IRecurrencyResult } from './SchedulerInterface';
import moment from 'moment';

export function recurencyCheck(
	recurrency: IRecurencyRule,
	recurrencyRules: number[],
	timezone: string,
): IRecurrencyResult {
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
			moment.tz(timezone).week() >= intervalSize + lastExecution || // not first time, but minimum interval has passed
			moment.tz(timezone).week() + 52 >= intervalSize + lastExecution // not first time, correct interval but year has passed
		) {
			recurrencyRules[recurrencyRuleIndex] = moment.tz(timezone).week();
			const result = {
				needToExecute: true,
				recurrencyRules,
			} as IRecurrencyResult;
			return result;
		}
	} else if (intervalSize && recurrencyRuleIndex !== undefined && typeInterval === 'days') {
		if (
			lastExecution === undefined ||
			moment.tz(timezone).day() >= intervalSize + lastExecution ||
			moment.tz(timezone).day() + 365 >= intervalSize + lastExecution
		) {
			recurrencyRules[recurrencyRuleIndex] = moment.tz(timezone).day();
			const result = {
				needToExecute: true,
				recurrencyRules,
			} as IRecurrencyResult;
			return result;
		}
	} else if (intervalSize && recurrencyRuleIndex !== undefined && typeInterval === 'hours') {
		if (
			lastExecution === undefined ||
			moment.tz(timezone).hour() >= intervalSize + lastExecution ||
			moment.tz(timezone).hour() + 24 >= intervalSize + lastExecution
		) {
			recurrencyRules[recurrencyRuleIndex] = moment.tz(timezone).hour();
			const result = {
				needToExecute: true,
				recurrencyRules,
			} as IRecurrencyResult;
			return result;
		}
	} else {
		const result = {
			needToExecute: true,
			recurrencyRules,
		} as IRecurrencyResult;
		return result;
	}
	const result = {
		needToExecute: false,
		recurrencyRules,
	} as IRecurrencyResult;
	return result;
}
