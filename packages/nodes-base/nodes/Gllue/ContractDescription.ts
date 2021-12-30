import {INodeProperties} from 'n8n-workflow';

export const contractOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'clientcontract',
				],
			},
		},
		options: [
			{
				name: 'delete',
				value: 'delete',
				description: 'Delete contract',
			},
		],
		default: 'delete',
		description: 'The operation to perform.',
	},
];

export const contractFields: INodeProperties[] = [
	{
		displayName: 'Contract ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'clientcontract',
				],
			},
		},
		default:'',
		description:'Contract ID',
	},
];
