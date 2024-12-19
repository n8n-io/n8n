import type { FieldType } from 'n8n-workflow';

export const INPUT_SOURCE = 'inputSource';
export const WORKFLOW_INPUTS = 'workflowInputs';
export const VALUES = 'values';
export const JSON_EXAMPLE = 'jsonExample';
export const PASSTHROUGH = 'passthrough';
export const TYPE_OPTIONS: Array<{ name: string; value: FieldType | 'any' }> = [
	{
		name: 'Allow Any Type',
		value: 'any',
	},
	{
		name: 'String',
		value: 'string',
	},
	{
		name: 'Number',
		value: 'number',
	},
	{
		name: 'Boolean',
		value: 'boolean',
	},
	{
		name: 'Array',
		value: 'array',
	},
	{
		name: 'Object',
		value: 'object',
	},
	// Intentional omission of `dateTime`, `time`, `string-alphanumeric`, `form-fields`, `jwt` and `url`
];

export const FALLBACK_DEFAULT_VALUE = null;
