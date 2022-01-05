import { INodeProperties } from 'n8n-workflow';

export const siteDescription: INodeProperties[] = [
	{
		displayName: 'Name:',
		name: 'siteName',
		type: 'string',
		default: '',
		description: 'Enter site name',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['site'],
			},
		},
	},
];
