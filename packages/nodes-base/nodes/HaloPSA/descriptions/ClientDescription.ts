import { INodeProperties } from 'n8n-workflow';

export const ClientDescription: INodeProperties[] = [
	{
		displayName: 'Name:',
		name: 'clientName',
		type: 'string',
		default: '',
		description: 'Enter client name',
		placeholder: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['client'],
			},
		},
	},
];
