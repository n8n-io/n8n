import {
	INodeProperties,
} from 'n8n-workflow';

export const bundleOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'bundle',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		default: 'get',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const bundleFields = [
	// ----------------------------------------
	//               bundle: get
	// ----------------------------------------
	{
		displayName: 'Bundle ID',
		name: 'bundleId',
		description: 'ID of the bundle to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'bundle',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];
