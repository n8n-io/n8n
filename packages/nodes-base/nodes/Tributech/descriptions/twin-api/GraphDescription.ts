import {
	INodeProperties,
} from 'n8n-workflow';

export const graphOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'graph',
				],
			},
		},
		options: [
			{
				name: 'Upsert Twin Graph',
				value: 'upsertTwinGraph',
			},
		],
		default: 'upsertTwinGraph',
	},
] as INodeProperties[];

export const graphFields = [
	{
		displayName: 'Twin Graph Description (JSON)',
		name: 'twinGraph',
		type: 'json',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'graph',
				],
				operation: [
					'upsertTwinGraph',
				],
			},
		},
	},
] as INodeProperties[];
