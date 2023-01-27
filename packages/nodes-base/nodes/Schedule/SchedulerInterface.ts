export interface IRecurencyRule {
	activated: boolean;
	index?: number;
	intervalSize?: number;
	typeInterval?: string;
}

export interface IRecurrencyResult {
	needToExecute: boolean;
	recurrencyRules: number[];
}
