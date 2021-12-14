import {
	INodeProperties,
} from 'n8n-workflow';

export const hookOptions = [
	{
		displayName: 'Hook id',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'hook',
				],
				operation: [
					'get',
					'logs',
					'retry_one',
					'retry_all',
				],
			},
		},
		default: '',
		description:'Hook id (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)',
	},
	{
		displayName: 'Hook log id',
		name: 'log_id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'hook',
				],
				operation: [
					'retry_one',
				],
			},
		},
		default: '',
		description:'Hook log id (starts with hl, e.g. hlSbGKaUKzTVNoWEVMYbLHe)',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'hook',
				],
				operation: [
					'logs',
				],
			},
		},
		default: '',
		options: [
			{
				name: 'Any',
				value: '',
			},
			{
				name: 'Failed',
				value: '0',
			},
			{
				name: 'Pending',
				value: '1',
			},
			{
				name: 'Success',
				value: '2',
			},
		],
		description:'Hook status to filter for (0=failed, 1=pending, 2=success)',
	},
] as INodeProperties[];
