export function validateWaitAmount(amount: unknown): amount is number {
	return typeof amount === 'number' && amount > 0;
}

export type WaitUnit = 'seconds' | 'minutes' | 'hours' | 'days';
export function validateWaitUnit(unit: unknown): unit is WaitUnit {
	return typeof unit === 'string' && ['seconds', 'minutes', 'hours', 'days'].includes(unit);
}
