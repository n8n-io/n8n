import type { INodeProperties } from 'n8n-workflow';

export const immutableIdsOption: INodeProperties = {
	displayName: 'Immutable IDs',
	name: 'immutableIds',
	type: 'boolean',
	default: false,
	description: 'Whether to enable immutable IDs',
};

export const immutableIdsCollection: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	options: [immutableIdsOption],
};
