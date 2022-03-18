import {
	SearchProperties,
} from '../../Interfaces';

export const searchDescription: SearchProperties = [
	{
		displayName: 'See <a href="https://developers.google.com/google-ads/api/docs/query/overview" target="_blank">Google Ads Guide</a> To GQL',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['search'],
			},
		},
		default: '',
	},
	{
		displayName: 'Query',
		name: 'queryGQL',
		required: true,
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['search'],
			},
		},
		default: '',
		description: 'Custom query to run against the user list endpoint',
	},
	{
		displayName: 'Simplify Output',
		name: 'simplifyOutput',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['search'],
			},
		},
		description: 'Whether to simplify the output data',
	},
];
