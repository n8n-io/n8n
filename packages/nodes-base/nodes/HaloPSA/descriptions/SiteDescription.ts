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
	// {
	// 	displayName: 'Client ID:',
	// 	name: 'siteClient',
	// 	type: 'number',
	// 	typeOptions: {
	// 		minValue: 0,
	// 		numberStepSize: 1,
	// 	},
	// 	default: 0,
	// 	description: 'Enter client ID',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			operation: ['create'],
	// 			resource: ['site'],
	// 		},
	// 	},
	// },
];
