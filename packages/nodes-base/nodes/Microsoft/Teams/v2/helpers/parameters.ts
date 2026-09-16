import type { IExecuteFunctions } from 'n8n-workflow';

export function readTextParameter(
	this: IExecuteFunctions,
	name: string,
	i: number,
	extractValue = false,
): string {
	const value = this.getNodeParameter(name, i, '', { extractValue });
	return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}
