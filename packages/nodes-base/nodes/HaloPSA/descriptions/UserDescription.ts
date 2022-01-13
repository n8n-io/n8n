import { INodeProperties } from 'n8n-workflow';

export const userDescription: INodeProperties[] = [
	{
		displayName: 'Name:',
		name: 'userName',
		type: 'string',
		default: '',
		description: 'Enter user name',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['user'],
			},
		},
	},
];
