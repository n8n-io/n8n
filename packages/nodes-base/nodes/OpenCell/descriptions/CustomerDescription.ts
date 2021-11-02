import {
	INodeProperties,
} from 'n8n-workflow';

export const customerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'Customer',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a Customer',
			},
		],
		default: 'create',
	},
];

export const customerFields: INodeProperties[] = [
	// ----------------------------------------
	//             customer: create
	// ----------------------------------------
	{
		displayName: 'Body',
		name: 'body',
		description: '',
		type: 'json',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'Customer',
				],
				operation: [
					'create',
				],
			},
		},
	},
];
