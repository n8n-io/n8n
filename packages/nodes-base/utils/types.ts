import { assert } from 'n8n-workflow';

export function assertIsString(parameterName: string, value: unknown): asserts value is string {
	assert(typeof value === 'string', `Parameter "${parameterName}" is not string`);
}
