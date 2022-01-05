import { INodeProperties } from 'n8n-workflow';

export const clientDescription: INodeProperties[] = [
	{
		displayName: 'Name:',
		name: 'clientName',
		type: 'string',
		default: '',
		description: 'Enter client name',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['client'],
			},
		},
	},
	{
		displayName: 'Important Client:',
		name: 'clientIsVip',
		type: 'boolean',
		default: false,
		description: 'Whether client is important',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['client'],
			},
		},
	},
	{
		displayName: 'Reference:',
		name: 'clientRef',
		type: 'string',
		default: '',
		description: 'Enter reference',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['client'],
			},
		},
	},
];
