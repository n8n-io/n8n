import { DateTime } from 'luxon';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export function readTextParameter(
	this: IExecuteFunctions,
	name: string,
	i: number,
	extractValue = false,
): string {
	const value = this.getNodeParameter(name, i, '', { extractValue });
	return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

export function optionalText(this: IExecuteFunctions, value: unknown, label: string): string {
	const text = value instanceof DateTime || value instanceof Date ? value.toJSON() : value;
	if (typeof text === 'object' && text !== null) {
		throw new NodeOperationError(this.getNode(), `The ${label} must be text`, {
			description: `Check that the '${label}' expression resolves to text`,
		});
	}
	return String(text ?? '').trim();
}

export function requiredText(
	this: IExecuteFunctions,
	name: string,
	i: number,
	label: string,
): string {
	const value = optionalText.call(this, this.getNodeParameter(name, i), label);
	if (value) return value;
	throw new NodeOperationError(this.getNode(), `The ${label} must not be empty`, {
		description: `Check that the '${label}' parameter is correctly set`,
	});
}
