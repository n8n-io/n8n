import {
	INodeProperties,
} from 'n8n-workflow';

export const hookOptions = [
	{
		displayName: 'Hook ID',
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
					'getLogs',
					'retryOne',
					'retryAll',
				],
			},
		},
		default: '',
		description:'Hook ID (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)',
	},
	{
		displayName: 'Hook log ID',
		name: 'logId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'hook',
				],
				operation: [
					'retryOne',
				],
			},
		},
		default: '',
		description:'Hook log ID (starts with hl, e.g. hlSbGKaUKzTVNoWEVMYbLHe)',
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
					'getLogs',
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
