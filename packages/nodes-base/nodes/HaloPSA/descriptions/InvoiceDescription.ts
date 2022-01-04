import { INodeProperties } from 'n8n-workflow';

export const invoiceDescription: INodeProperties[] = [
	{
		displayName: 'Date:',
		name: 'invoiceDate',
		type: 'dateTime',
		default: '',
		description: 'The date and time of invoice',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['invoice'],
			},
		},
	},
];
