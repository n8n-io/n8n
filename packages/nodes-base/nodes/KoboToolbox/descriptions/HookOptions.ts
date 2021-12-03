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
] as INodeProperties[];
